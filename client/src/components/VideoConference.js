
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import Video from 'twilio-video';
import { getVideoToken } from '../api/videoAPI';
import { summarizeText, formatTranscript } from '../api/aiAPI.js';
import './VideoConference.css';
import ErrorBoundary from './ErrorBoundary';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
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

const useSpeechToText = () => {
  const [transcript, setTranscript] = useState('');
  const { transcript: currentTranscript, listening, browserSupportsSpeechRecognition, resetTranscript: resetSpeechRecognition } = useSpeechRecognition();

  useEffect(() => {
    console.log('Current transcript from SpeechRecognition:', currentTranscript);
    if (currentTranscript) {
      setTranscript(prev => {
        const newTranscript = prev + (prev ? ' ' : '') + currentTranscript;
        console.log('Updated transcript:', newTranscript);
        return newTranscript;
      });
    }
  }, [currentTranscript]);

  const startListening = useCallback(() => {
    console.log('Starting speech recognition...');
    SpeechRecognition.startListening({ continuous: true, interimResults: true });
  }, []);

  const stopListening = useCallback(() => {
    console.log('Stopping speech recognition...');
    SpeechRecognition.stopListening();
  }, []);

  const resetTranscript = useCallback(() => {
    console.log('Resetting transcript...');
    setTranscript('');
    resetSpeechRecognition();
  }, [resetSpeechRecognition]);

  return { 
    transcript, 
    listening, 
    startListening, 
    stopListening, 
    resetTranscript, 
    browserSupportsSpeechRecognition 
  };
};

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

  const { 
    transcript, 
    listening, 
    startListening, 
    stopListening, 
    resetTranscript, 
    browserSupportsSpeechRecognition 
  } = useSpeechToText();

  const roomsRef = useRef({});
  const formatTimeoutRef = useRef(null);
  const summaryTimeoutRef = useRef(null);
  const dialogueCompilerRef = useRef(new DialogueCompiler());

  const memoizedParticipants = useMemo(() => {
    return activeRoom === 'main' ? participants.main : participants.breakouts[activeRoom] || [];
  }, [activeRoom, participants]);

  const connectToRoom = useCallback(async (roomName) => {
    const maxRetries = 3;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const token = await getVideoToken(roomName);
        console.log('Received token:', token);

        const newRoom = await Video.connect(token, {
          name: roomName,
          audio: { echoCancellation: true, autoGainControl: true, noiseSuppression: true },
          video: true,
          preferredVideoCodecs: [{ codec: 'VP8', simulcast: true }],
          networkQuality: { local: 1, remote: 1 },
          dominantSpeaker: true,
          maxAudioBitrate: 16000,
          videoBandwidthProfile: {
            mode: 'collaboration',
            maxTracks: 10,
            dominantSpeakerPriority: 'high'
          }
        });

        console.log('Connected to room:', newRoom.name);

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

        newRoom.on('participantDisconnected', participant => {
          setParticipants(prev => {
            if (roomName === 'main') {
              return { ...prev, main: prev.main.filter(p => p !== participant) };
            } else {
              return {
                ...prev,
                breakouts: {
                  ...prev.breakouts,
                  [roomName]: prev.breakouts[roomName].filter(p => p !== participant)
                }
              };
            }
          });
        });

        return newRoom;
      } catch (err) {
        console.error(`Attempt ${attempt + 1} failed:`, err);
        if (attempt === maxRetries - 1) {
          console.error('Detailed error connecting to room:', err);
          setError(`Could not connect to room: ${err.message}`);
          return null;
        } else {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }
  }, []);

  useEffect(() => {
    const initializeRooms = async () => {
      const mainRoom = await connectToRoom(mainRoomName);
      if (mainRoom) {
        setRooms(prev => {
          const newRooms = { ...prev, main: mainRoom };
          roomsRef.current = newRooms;
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
    console.log('Speech recognition status:', listening ? 'Active' : 'Inactive');
    if (!listening) {
      startListening();
    }
    return () => {
      stopListening();
    };
  }, [listening, startListening, stopListening]);

  useEffect(() => {
    if (transcript) {
      console.log('Updating transcripts with:', transcript);
      setTranscripts(prev => {
        const newTranscripts = activeRoom === 'main'
          ? { ...prev, main: transcript }
          : {
              ...prev,
              breakouts: {
                ...prev.breakouts,
                [activeRoom]: transcript
              }
            };
        console.log('Updated transcripts:', newTranscripts);
        return newTranscripts;
      });
      onTranscriptionUpdate(transcript);
    }
  }, [transcript, activeRoom, onTranscriptionUpdate]);

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
        updateSummary(currentTranscript, activeRoom === 'main' ? 'main' : 'breakouts', activeRoom);
      }, 10000);
      summaryTimeoutRef.current = timeoutId;
      return () => clearTimeout(timeoutId);
    }
  }, [formattedTranscripts, activeRoom, updateSummary]);

  useEffect(() => {
    console.log('Current transcript:', transcript);
    console.log('Active room:', activeRoom);
    console.log('Transcripts:', transcripts);
  }, [transcript, activeRoom, transcripts]);

  useEffect(() => {
    if (activeRoom !== 'main') {
      console.log('Checking microphone in breakout room:', activeRoom);
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then(() => console.log('Microphone access granted in breakout room'))
        .catch(err => console.error('Microphone access denied in breakout room:', err));
    }
  }, [activeRoom]);

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
    console.log('Toggling listening...');
    if (listening) {
      stopListening();
    } else {
      resetTranscript();
      startListening();
    }
  }, [listening, startListening, stopListening, resetTranscript]);

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
  stopListening();
  const currentRoom = activeRoom === 'main' ? rooms.main : rooms.breakouts[activeRoom];
  if (currentRoom && typeof currentRoom.disconnect === 'function') {
    currentRoom.disconnect();
  }
}, [rooms, activeRoom, stopListening]);

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
  const breakoutRoomName = `Breakout-${Date.now()}`;
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
}, [connectToRoom]);

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
  return <span>Browser doesn't support speech recognition.</span>;
}

return (
  <ErrorBoundary>
    <div className="video-conference">
      {error && <div className="error">{error}</div>}
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
          {listening ? 'Stop Recording' : 'Start Recording'}
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
};

export default VideoConference;