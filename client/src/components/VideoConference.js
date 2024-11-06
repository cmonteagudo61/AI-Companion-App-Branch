import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import Video from 'twilio-video';
import { getVideoToken, createRoom} from '../api/videoAPI';
import { summarizeText, formatTranscript } from '../api/aiAPI.js';
import './VideoConference.css';
import ErrorBoundary from './ErrorBoundary';
import useSpeechToText from '../hooks/useSpeechToText';
import AICompanion from './AICompanion';
import SummaryRating from './SummaryRating';
import DialogueCompiler from '../services/DialogueCompiler';

const Participant = React.memo(({ participant, isLocal, isDominantSpeaker }) => {
  const [videoTrack, setVideoTrack] = useState(null);
  const [audioTrack, setAudioTrack] = useState(null);
  const videoRef = useRef();
  const audioRef = useRef();

  useEffect(() => {
    const trackSubscribed = track => {
      if (track.kind === 'video') {
        setVideoTrack(track);
      } else if (track.kind === 'audio') {
        setAudioTrack(track);
      }
    };

    const trackUnsubscribed = track => {
      if (track.kind === 'video') {
        setVideoTrack(null);
      } else if (track.kind === 'audio') {
        setAudioTrack(null);
      }
    };

    participant.on('trackSubscribed', trackSubscribed);
    participant.on('trackUnsubscribed', trackUnsubscribed);

    participant.tracks.forEach(publication => {
      if (publication.track) {
        trackSubscribed(publication.track);
      }
    });

    return () => {
      participant.removeAllListeners();
    };
  }, [participant]);

  useEffect(() => {
    if (videoTrack) {
      videoTrack.attach(videoRef.current);
      return () => {
        videoTrack.detach();
      };
    }
  }, [videoTrack]);

  useEffect(() => {
    if (audioTrack) {
      audioTrack.attach(audioRef.current);
      return () => {
        audioTrack.detach();
      };
    }
  }, [audioTrack]);

  return (
    <div className={`participant ${isDominantSpeaker ? 'dominant-speaker' : ''}`}>
      <video ref={videoRef} autoPlay={true} />
      <audio ref={audioRef} autoPlay={true} muted={isLocal} />
      {isDominantSpeaker && <div className="dominant-speaker-indicator">Speaking</div>}
    </div>
  );
});
const VideoConference = ({ mainRoomName, onTranscriptionUpdate }) => {
  const [rooms, setRooms] = useState({ main: null, breakouts: {} });
  const [activeRoom, setActiveRoom] = useState('main');
  const [participants, setParticipants] = useState({ main: [], breakouts: {} });
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [error, setError] = useState(null);
  const [transcripts, setTranscripts] = useState({ main: '', breakouts: {} });
  const [formattedTranscripts, setFormattedTranscripts] = useState({ main: '', breakouts: {} });
  const [summaries, setSummaries] = useState({ main: '', breakouts: {} });
  const [isEditingTranscript, setIsEditingTranscript] = useState(false);
  const [compiledSummary, setCompiledSummary] = useState('');
  const [satisfactionScores, setSatisfactionScores] = useState({ main: [], breakouts: {} });
  const [averageSatisfactionScore, setAverageSatisfactionScore] = useState(null);
  const [finalCompilation, setFinalCompilation] = useState('');
  const [breakoutCompilation, setBreakoutCompilation] = useState('');
  const isConnectingRef = useRef(false);  const roomsRef = useRef({});
  const formatTimeoutRef = useRef(null);
  const summaryTimeoutRef = useRef(null);
  const dialogueCompilerRef = useRef(new DialogueCompiler());

  const handleTranscriptionUpdate = useCallback((newTranscript) => {
    if (!newTranscript || typeof newTranscript !== 'string') {
      console.log('Invalid transcript received:', newTranscript);
      return;
    }
    
    console.log('Updating transcript:', newTranscript);
    setTranscripts(prev => {
      // Get the current transcript for this room
      const currentTranscript = activeRoom === 'main' ? 
        prev.main : 
        prev.breakouts[activeRoom] || '';
  
      // Only append if it's actually new content
      if (!currentTranscript.includes(newTranscript)) {
        const updatedTranscripts = activeRoom === 'main'
          ? { 
              ...prev, 
              main: (currentTranscript + ' ' + newTranscript).trim() 
            }
          : {
              ...prev,
              breakouts: {
                ...prev.breakouts,
                [activeRoom]: (currentTranscript + ' ' + newTranscript).trim()
              }
            };
        console.log('Updated transcripts:', updatedTranscripts);
        return updatedTranscripts;
      }
      return prev;
    });
    onTranscriptionUpdate?.(newTranscript);
  }, [activeRoom, onTranscriptionUpdate]);

  const { 
    isListening, 
    setIsListening, 
    resetTranscript, 
    browserSupportsSpeechRecognition 
  } = useSpeechToText(handleTranscriptionUpdate);

  const memoizedParticipants = useMemo(() => {
    return activeRoom === 'main' ? participants.main : participants.breakouts[activeRoom] || [];
  }, [activeRoom, participants]);

  // In VideoConference.js, modify the connectToRoom function to handle room capacity errors

  const connectToRoom = useCallback(async (roomName) => {
    if (isConnectingRef.current || roomsRef.current[roomName]) {
      console.log('Already connecting or room exists:', roomName);
      return roomsRef.current[roomName];
    }
    isConnectingRef.current = true;
    
    try {
      // First check for microphone permissions
      console.log('Checking microphone permissions...');
      try {
        await navigator.mediaDevices.getUserMedia({ 
          audio: true,
          video: true 
        });
        console.log('Microphone and camera access granted');
      } catch (err) {
        console.error('Media access denied:', err);
        setError('Microphone and camera access are required for the video conference.');
        return null;
      }
  
      // Then create/check room
      console.log('Creating room:', roomName);
      const roomResponse = await createRoom(roomName);
      console.log('Room creation response:', roomResponse);
  
      if (roomResponse.error && roomResponse.error === 'Room is at capacity') {
        throw new Error('Room is at maximum capacity. Please try again later.');
      }
  
      // Get token and connect
      console.log('Getting video token for room:', roomName);
      const token = await getVideoToken(roomName);
      
      if (!token) {
        throw new Error('Failed to get video token');
      }
  
      console.log('Connecting to Twilio with token...');
      const newRoom = await Video.connect(token, {
        name: roomName,
        audio: { 
          echoCancellation: true, 
          autoGainControl: true, 
          noiseSuppression: true 
        },
        video: true,
        maxTracks: 10,
        dominantSpeaker: true,
        networkQuality: { local: 1, remote: 1 },
        preferredVideoCodecs: [{ codec: 'VP8', simulcast: true }]
      });
  
      console.log('Connected to room:', newRoom.name);
  
      // Setup participant handlers
      newRoom.on('participantConnected', participant => {
        setParticipants(prev => {
          if (roomName === 'main') {
            return { ...prev, main: [...prev.main, participant] };
          } else {
            return {
              ...prev,
              breakouts: {
                ...prev.breakouts,
                [roomName]: [...(prev.breakouts[roomName] || []), participant]
              }
            };
          }
        });
      });
  
      // Store room reference
      if (roomName === 'main') {
        roomsRef.current = { ...roomsRef.current, main: newRoom };
      } else {
        roomsRef.current = {
          ...roomsRef.current,
          breakouts: { 
            ...roomsRef.current.breakouts,
            [roomName]: newRoom 
          }
        };
      }
  
      return newRoom;
    } catch (err) {
      console.error('Error connecting to room:', err);
      setError(err.message);
      return null;
    } finally {
      isConnectingRef.current = false;
    }
  }, []);

  useEffect(() => {
    const initializeRooms = async () => {
      if (!mainRoomName) {
        console.error('No main room name provided');
        return;
      }   
      const mainRoom = await connectToRoom(mainRoomName);
      if (mainRoom) {
        setRooms(prev => {
          const newRooms = { ...prev, main: mainRoom };
          return newRooms;
        });
        setParticipants(prev => ({ ...prev, main: Array.from(mainRoom.participants.values()) }));
      }
    };

    initializeRooms();

    return () => {
      const currentFormatTimeout = formatTimeoutRef.current;
      const currentSummaryTimeout = summaryTimeoutRef.current;
      if (currentFormatTimeout) {
        clearTimeout(currentFormatTimeout);
      }
      if (currentSummaryTimeout) {
        clearTimeout(currentSummaryTimeout);
      }
      Object.values(roomsRef.current).forEach(room => {
        if (room && typeof room.disconnect === 'function') {
          room.disconnect();
        }
      });
    };
  }, [mainRoomName, connectToRoom]);

useEffect(() => {
    const formatTranscriptAndUpdate = async () => {
      let currentTranscript = activeRoom === 'main' ? transcripts.main : transcripts.breakouts[activeRoom];
      if (currentTranscript && currentTranscript.trim() !== '' && currentTranscript.length > 50) {
        try {
          const formatted = await formatTranscript(currentTranscript);
          setFormattedTranscripts(prev => {
            if (activeRoom === 'main') {
              return { ...prev, main: formatted };
            } else {
              return {
                ...prev,
                breakouts: {
                  ...prev.breakouts,
                  [activeRoom]: formatted
                }
              };
            }
          });
        } catch (error) {
          console.error('Error formatting transcript:', error);
          setError(`Error formatting transcript: ${error.message}`);
        }
      }
    };

    const timeoutId = setTimeout(formatTranscriptAndUpdate, 5000);
    formatTimeoutRef.current = timeoutId;
    return () => clearTimeout(timeoutId);
  }, [transcripts, activeRoom]);

  useEffect(() => {
    if (formattedTranscripts.main) {
      dialogueCompilerRef.current.updateTranscript('main', 'main', formattedTranscripts.main);
    }
    Object.entries(formattedTranscripts.breakouts).forEach(([roomName, transcript]) => {
      dialogueCompilerRef.current.updateTranscript('breakout', roomName, transcript);
    });
  }, [formattedTranscripts]);

  const updateSummary = useCallback(async (text, roomType, roomId) => {
    if (text && text.trim() !== '' && text.length > 100) {
      try {
        const newSummary = await summarizeText(text);
        setSummaries(prev => {
          if (roomType === 'main') {
            return { ...prev, main: newSummary };
          } else {
            return {
              ...prev,
              breakouts: {
                ...prev.breakouts,
                [roomId]: newSummary
              }
            };
          }
        });
      } catch (error) {
        console.error('Error updating summary:', error);
        setError(`Error updating summary: ${error.message}`);
      }
    }
  }, []);

  useEffect(() => {
    const currentTranscript = activeRoom === 'main' ? formattedTranscripts.main : formattedTranscripts.breakouts[activeRoom];
    if (currentTranscript) {
      const timeoutId = setTimeout(() => {
        updateSummary(currentTranscript, activeRoom === 'main' ? 'main' : 'breakout', activeRoom);
      }, 10000);
      summaryTimeoutRef.current = timeoutId;
      return () => clearTimeout(timeoutId);
    }
  }, [formattedTranscripts, activeRoom, updateSummary]);

  useEffect(() => {
    if (activeRoom !== 'main') {
      console.log('Checking microphone in breakout room:', activeRoom);
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then(() => console.log('Microphone access granted in breakout room'))
        .catch(err => console.error('Microphone access denied in breakout room:', err));
    }
  }, [activeRoom]);

// Add this effect after your other useEffects
useEffect(() => {
  const currentRoom = activeRoom === 'main' ? rooms.main : rooms.breakouts[activeRoom];
  if (currentRoom && !isListening) {
    console.log('Auto-starting speech recognition in room:', activeRoom);
    setIsListening(true);
  }
}, [rooms, activeRoom, isListening, setIsListening]);

  const toggleAudio = useCallback(() => {
    const currentRoom = activeRoom === 'main' ? rooms.main : rooms.breakouts[activeRoom];
    if (currentRoom) {
      currentRoom.localParticipant.audioTracks.forEach(publication => {
        if (isAudioMuted) {
          publication.track.enable();
        } else {
          publication.track.disable();
        }
      });
      setIsAudioMuted(!isAudioMuted);
    }
  }, [rooms, activeRoom, isAudioMuted]);

  const toggleVideo = useCallback(() => {
    const currentRoom = activeRoom === 'main' ? rooms.main : rooms.breakouts[activeRoom];
    if (currentRoom) {
      currentRoom.localParticipant.videoTracks.forEach(publication => {
        if (isVideoOff) {
          publication.track.enable();
        } else {
          publication.track.disable();
        }
      });
      setIsVideoOff(!isVideoOff);
    }
  }, [rooms, activeRoom, isVideoOff]);

  const toggleListening = useCallback(() => {
    setIsListening(prev => !prev);
  }, [setIsListening]);

  const handleResetTranscript = useCallback(() => {
    setTranscripts(prev => ({
      ...prev,
      [activeRoom]: activeRoom === 'main' ? '' : { ...prev.breakouts, [activeRoom]: '' }
    }));
    setFormattedTranscripts(prev => ({
      ...prev,
      [activeRoom]: activeRoom === 'main' ? '' : { ...prev.breakouts, [activeRoom]: '' }
    }));
    setSummaries(prev => ({
      ...prev,
      [activeRoom]: activeRoom === 'main' ? '' : { ...prev.breakouts, [activeRoom]: '' }
    }));
    resetTranscript();
  }, [activeRoom, resetTranscript]);

  const endDialogue = useCallback(() => {
    setIsListening(false);
    const currentRoom = activeRoom === 'main' ? rooms.main : rooms.breakouts[activeRoom];
    if (currentRoom && typeof currentRoom.disconnect === 'function') {
      currentRoom.disconnect();
    }
  }, [rooms, activeRoom, setIsListening]);

  const handleEditTranscript = () => {
    setIsEditingTranscript(true);
  };

  const handleSaveTranscript = () => {
    setIsEditingTranscript(false);
  };

  const handleTranscriptChange = (e) => {
    setFormattedTranscripts(prev => {
      if (activeRoom === 'main') {
        return { ...prev, main: e.target.value };
      } else {
        return {
          ...prev,
          breakouts: {
            ...prev.breakouts,
            [activeRoom]: e.target.value
          }
        };
      }
    });
  };

  const createBreakoutRoom = useCallback(async () => {
    if (!mainRoomName) {
      setError('Main room name is required to create breakout rooms');
      return;
    }  
    const breakoutRoomName = `${mainRoomName}-breakout-${Date.now()}`;
    const room = await connectToRoom(breakoutRoomName);
    if (room) {
      setRooms(prev => {
        const newRooms = { ...prev, breakouts: { ...prev.breakouts, [breakoutRoomName]: room } };
        roomsRef.current = newRooms;
        return newRooms;
      });
      setTranscripts(prev => ({
        ...prev,
        breakouts: { ...prev.breakouts, [breakoutRoomName]: '' }
      }));
      setFormattedTranscripts(prev => ({
        ...prev,
        breakouts: { ...prev.breakouts, [breakoutRoomName]: '' }
      }));
      setSummaries(prev => ({
        ...prev,
        breakouts: { ...prev.breakouts, [breakoutRoomName]: '' }
      }));
      setSatisfactionScores(prev => ({
        ...prev,
        breakouts: { ...prev.breakouts, [breakoutRoomName]: [] }
      }));
      setActiveRoom(breakoutRoomName);
    }
  }, [connectToRoom, mainRoomName]); // Added mainRoomName to dependencies

  const compileAndSummarizeAllTranscripts = useCallback(async () => {
    const allTranscripts = [
      formattedTranscripts.main,
      ...Object.values(formattedTranscripts.breakouts || {})
    ]
      .filter(transcript => typeof transcript === 'string' && transcript.trim() !== '' && transcript.length > 100)
      .join('\n\n');

    if (allTranscripts) {
      try {
        const summary = await summarizeText(allTranscripts);
        console.log('Compiled Summary:', summary);
        setCompiledSummary(summary);
      } catch (error) {
        console.error('Error compiling and summarizing transcripts:', error);
        setError(`Error compiling and summarizing transcripts: ${error.message}`);
      }
    }
  }, [formattedTranscripts]);

  const handleSatisfactionRating = useCallback((roomName, score) => {
    setSatisfactionScores(prev => {
      const newScores = roomName === 'main'
        ? { ...prev, main: [...prev.main, score] }
        : {
            ...prev,
            breakouts: {
              ...prev.breakouts,
              [roomName]: [...(prev.breakouts[roomName] || []), score]
            }
          };
      const allScores = [
        ...newScores.main,
        ...Object.values(newScores.breakouts).flat()
      ];
      const overallAverage = allScores.reduce((a, b) => a + b, 0) / allScores.length;
      setAverageSatisfactionScore(overallAverage);
  
      return newScores;
    });
  }, []);

  const handleFinalCompilation = useCallback(async () => {
    const result = await dialogueCompilerRef.current.compileFinal();
    if (result.success) {
      setFinalCompilation(result.summary);
    } else {
      setError(result.message);
    }
  }, []);

  const handleBreakoutCompilation = useCallback(async () => {
    const result = await dialogueCompilerRef.current.compileBreakoutRooms();
    if (result.success) {
      setBreakoutCompilation(result.summary);
    } else {
      setError(result.message);
    }
  }, []);

  if (!browserSupportsSpeechRecognition) {
    return (
      <div className="error-container bg-red-50 border-l-4 border-red-500 p-4">
        <p className="text-sm text-red-700">
          Browser doesn't support speech recognition. Please use a modern browser like Chrome.
        </p>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="video-conference">
        {error && (
          <div className="error-container bg-red-50 border-l-4 border-red-500 p-4 mb-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
                <button 
                  className="mt-2 text-sm text-red-600 hover:text-red-500"
                  onClick={() => setError(null)}
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        )}
        <div className="participants">
          {activeRoom === 'main' && rooms.main && (
            <Participant 
              key={rooms.main.localParticipant.sid} 
              participant={rooms.main.localParticipant} 
              isLocal={true}
              isDominantSpeaker={false}
            />
          )}
          {activeRoom !== 'main' && rooms.breakouts[activeRoom] && (
            <Participant 
              key={rooms.breakouts[activeRoom].localParticipant.sid} 
              participant={rooms.breakouts[activeRoom].localParticipant} 
              isLocal={true}
              isDominantSpeaker={false}
            />
          )}
          {memoizedParticipants.map(participant => (
            <Participant 
              key={participant.sid} 
              participant={participant} 
              isLocal={false}
              isDominantSpeaker={false}
            />
          ))}
        </div>
        <div className="transcript-container">
          <h3>Real-time Transcript:</h3>
          <p className="transcript-text">
            {activeRoom === 'main' ? transcripts.main : transcripts.breakouts[activeRoom] || ''}
          </p>
        </div>
        <div className="formatted-transcript-container">
          <h3>Formatted Transcript:</h3>
          {isEditingTranscript ? (
            <>
              <textarea
                className="formatted-transcript-text"
                value={activeRoom === 'main' ? formattedTranscripts.main : formattedTranscripts.breakouts[activeRoom] || ''}
                onChange={handleTranscriptChange}
              />
              <button onClick={handleSaveTranscript}>Save</button>
            </>
          ) : (
            <>
              <p className="formatted-transcript-text">
                {activeRoom === 'main' ? formattedTranscripts.main : formattedTranscripts.breakouts[activeRoom] || ''}
              </p>
              <button onClick={handleEditTranscript}>Edit</button>
            </>
          )}
        </div>
        <div className="summary-container">
          <h3>Current Room Summary:</h3>
          <p className="summary-text">
            {activeRoom === 'main' ? summaries.main : summaries.breakouts[activeRoom] || ''}
          </p>
          <SummaryRating 
            roomName={activeRoom}
            onRate={handleSatisfactionRating}
            scores={activeRoom === 'main' ? satisfactionScores.main : satisfactionScores.breakouts[activeRoom] || []}
          />
        </div>
        <div className="compiled-summary-container">
          <h3>Compiled Summary of All Rooms:</h3>
          <p className="compiled-summary-text">{compiledSummary}</p>
          {averageSatisfactionScore !== null && (
            <p>Average Satisfaction Score: {averageSatisfactionScore.toFixed(2)}/5</p>
          )}
        </div>
        <div className="compilation-container">
          <h3>Final Compilation</h3>
          <p className="compilation-text">{finalCompilation}</p>
          <button onClick={handleFinalCompilation}>Generate Final Compilation</button>
        </div>
        <div className="compilation-container">
          <h3>Breakout Rooms Compilation</h3>
          <p className="compilation-text">{breakoutCompilation}</p>
          <button onClick={handleBreakoutCompilation}>Generate Breakout Compilation</button>
        </div>
        <AICompanion 
          transcript={activeRoom === 'main' ? formattedTranscripts.main : formattedTranscripts.breakouts[activeRoom] || ''}
          roomName={activeRoom === 'main' ? 'Main Room' : activeRoom}
        />
        <div className="controls">
          <button onClick={toggleAudio}>{isAudioMuted ? 'Unmute' : 'Mute'}</button>
          <button onClick={toggleVideo}>{isVideoOff ? 'Start Video' : 'Stop Video'}</button>
          <button onClick={toggleListening}>
            {isListening ? 'Stop Recording' : 'Start Recording'}
          </button>
          <button onClick={handleResetTranscript}>Reset Transcript</button>
          <button onClick={endDialogue}>End Dialogue</button>
          <button onClick={createBreakoutRoom}>Create Breakout Room</button>
          <button onClick={compileAndSummarizeAllTranscripts}>Compile All Summaries</button>
        </div>
        <div className="room-controls">
          <button onClick={() => setActiveRoom('main')}>Main Room</button>
          {Object.keys(rooms.breakouts || {}).map(roomName => (
            <button key={roomName} onClick={() => setActiveRoom(roomName)}>
              {roomName}
            </button>
          ))}
        </div>
      </div>
    </ErrorBoundary>
  );
}
export default VideoConference; 
