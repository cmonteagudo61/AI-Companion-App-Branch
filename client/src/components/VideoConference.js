import React, { useState, useEffect, useCallback, useRef } from 'react';
import Video from 'twilio-video';
import { getVideoToken } from '../api/videoAPI';
import { summarizeText, formatTranscript } from '../api/aiAPI.js';
import './VideoConference.css';
import ErrorBoundary from './ErrorBoundary';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import AICompanion from './AICompanion';

const Participant = React.memo(({ participant, isLocal }) => {
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
    <div className="participant">
      <video ref={videoRef} autoPlay={true} />
      <audio ref={audioRef} autoPlay={true} muted={isLocal} />
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

  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition
  } = useSpeechRecognition();

  const transcriptRef = useRef('');
  const roomsRef = useRef({});

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
            const updatedParticipants = roomName === 'main' 
              ? { ...prev, main: [...prev.main, participant] }
              : { 
                  ...prev, 
                  breakouts: { 
                    ...prev.breakouts, 
                    [roomName]: [...(prev.breakouts[roomName] || []), participant] 
                  } 
                };
            return updatedParticipants;
          });
        });

        newRoom.on('participantDisconnected', participant => {
          setParticipants(prev => {
            const updatedParticipants = roomName === 'main'
              ? { ...prev, main: prev.main.filter(p => p !== participant) }
              : {
                  ...prev,
                  breakouts: {
                    ...prev.breakouts,
                    [roomName]: prev.breakouts[roomName].filter(p => p !== participant)
                  }
                };
            return updatedParticipants;
          });
        });

        return newRoom;
      } catch (err) {
        console.error(`Attempt ${attempt + 1} failed:`, err);
        if (attempt === maxRetries - 1) {
          console.error('Detailed error connecting to room:', err);
          if (err.message === 'JWT invalid') {
            setError('Invalid token. Please try refreshing the page.');
          } else if (err.message === 'Signaling connection error') {
            setError('Unable to connect to Twilio servers. Please check your internet connection and try again.');
          } else {
            setError(`Could not connect to room: ${err.message}`);
          }
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
      Object.values(roomsRef.current).forEach(room => {
        if (room && typeof room.disconnect === 'function') {
          room.disconnect();
        }
      });
    };
  }, [mainRoomName, connectToRoom]);

  useEffect(() => {
    if (transcript !== transcriptRef.current) {
      const newText = transcript.slice(transcriptRef.current.length).trim();
      if (newText) {
        setTranscripts(prev => {
          if (activeRoom === 'main') {
            return { ...prev, main: (prev.main || '') + ' ' + newText };
          } else {
            return {
              ...prev,
              breakouts: {
                ...prev.breakouts,
                [activeRoom]: ((prev.breakouts[activeRoom] || '') + ' ' + newText).trim()
              }
            };
          }
        });
        transcriptRef.current = transcript;
        onTranscriptionUpdate(transcriptRef.current);
      }
    }
  }, [transcript, onTranscriptionUpdate, activeRoom]);

  useEffect(() => {
    const formatAndUpdateTranscript = async () => {
      let currentTranscript;
      if (activeRoom === 'main') {
        currentTranscript = transcripts.main;
      } else {
        currentTranscript = transcripts.breakouts && transcripts.breakouts[activeRoom];
      }

      if (currentTranscript && currentTranscript.trim() !== '') {
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

    const debouncedFormatting = setTimeout(formatAndUpdateTranscript, 2000);

    return () => clearTimeout(debouncedFormatting);
  }, [transcripts, activeRoom]);

  const updateSummary = useCallback(async (text, roomType, roomId) => {
    if (text && text.trim() !== '') {
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
    let currentTranscript;
    if (activeRoom === 'main') {
      currentTranscript = formattedTranscripts.main;
    } else {
      currentTranscript = formattedTranscripts.breakouts && formattedTranscripts.breakouts[activeRoom];
    }
    
    if (currentTranscript) {
      const debouncedSummary = setTimeout(() => 
        updateSummary(
          currentTranscript, 
          activeRoom === 'main' ? 'main' : 'breakouts', 
          activeRoom
        ), 
        2000
      );
      return () => clearTimeout(debouncedSummary);
    }
  }, [formattedTranscripts, activeRoom, updateSummary]);

  useEffect(() => {
    if (listening) {
      SpeechRecognition.startListening({ continuous: true });
    } else {
      SpeechRecognition.stopListening();
    }
  }, [listening]);

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
    if (listening) {
      SpeechRecognition.stopListening();
    } else {
      SpeechRecognition.startListening({ continuous: true });
    }
  }, [listening]);

  const handleResetTranscript = useCallback(() => {
    resetTranscript();
    setTranscripts(prev => {
      if (activeRoom === 'main') {
        return { ...prev, main: '' };
      } else {
        return {
          ...prev,
          breakouts: {
            ...prev.breakouts,
            [activeRoom]: ''
          }
        };
      }
    });
    setFormattedTranscripts(prev => {
      if (activeRoom === 'main') {
        return { ...prev, main: '' };
      } else {
        return {
          ...prev,
          breakouts: {
            ...prev.breakouts,
            [activeRoom]: ''
          }
        };
      }
    });
    setSummaries(prev => {
      if (activeRoom === 'main') {
        return { ...prev, main: '' };
      } else {
        return {
          ...prev,
          breakouts: {
            ...prev.breakouts,
            [activeRoom]: ''
          }
        };
      }
    });
    transcriptRef.current = '';
  }, [resetTranscript, activeRoom]);

  const endDialogue = useCallback(() => {
    SpeechRecognition.stopListening();
    const currentRoom = activeRoom === 'main' ? rooms.main : rooms.breakouts[activeRoom];
    if (currentRoom && typeof currentRoom.disconnect === 'function') {
      currentRoom.disconnect();
    }
  }, [rooms, activeRoom]);

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
      setActiveRoom(breakoutRoomName);
    }
  }, [connectToRoom]);

  const compileAndSummarizeAllTranscripts = useCallback(async () => {
    const allTranscripts = [
      formattedTranscripts.main,
      ...Object.values(formattedTranscripts.breakouts || {})
    ]
      .filter(transcript => typeof transcript === 'string' && transcript.trim() !== '')
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

  useEffect(() => {
    const debouncedSummary = setTimeout(() => {
      const hasNonEmptyTranscript = Object.values(formattedTranscripts).some(transcript => 
        typeof transcript === 'string' && transcript.trim() !== ''
      );
      if (hasNonEmptyTranscript) {
        compileAndSummarizeAllTranscripts();
      }
    }, 10000); // 10 seconds debounce
    return () => clearTimeout(debouncedSummary);
  }, [formattedTranscripts, compileAndSummarizeAllTranscripts]);

  if (!browserSupportsSpeechRecognition) {
    return <span>Browser doesn't support speech recognition.</span>;
  }

  const currentRoom = activeRoom === 'main' ? rooms.main : rooms.breakouts[activeRoom];
  const currentParticipants = activeRoom === 'main' ? participants.main : participants.breakouts[activeRoom] || [];
  const currentTranscript = activeRoom === 'main' ? transcripts.main : (transcripts.breakouts && transcripts.breakouts[activeRoom]) || '';
  const currentFormattedTranscript = activeRoom === 'main' ? formattedTranscripts.main : (formattedTranscripts.breakouts && formattedTranscripts.breakouts[activeRoom]) || '';
  const currentSummary = activeRoom === 'main' ? summaries.main : (summaries.breakouts && summaries.breakouts[activeRoom]) || '';

  return (
    <ErrorBoundary>
      <div className="video-conference">
        {error && <div className="error">{error}</div>}
        <div className="participants">
          {currentRoom && <Participant key={currentRoom.localParticipant.sid} participant={currentRoom.localParticipant} isLocal={true} />}
          {currentParticipants.map(participant => (
            <Participant key={participant.sid} participant={participant} isLocal={false} />
          ))}
        </div>
        <div className="transcript-container">
          <h3>Real-time Transcript:</h3>
          <p className="transcript-text">{currentTranscript}</p>
        </div>
        <div className="formatted-transcript-container">
          <h3>Formatted Transcript:</h3>
          {isEditingTranscript ? (
            <>
              <textarea
                className="formatted-transcript-text"
                value={currentFormattedTranscript}
                onChange={handleTranscriptChange}
              />
              <button onClick={handleSaveTranscript}>Save</button>
            </>
          ) : (
            <>
              <p className="formatted-transcript-text">{currentFormattedTranscript}</p>
              <button onClick={handleEditTranscript}>Edit</button>
            </>
          )}
        </div>
        <div className="summary-container">
          <h3>Current Room Summary:</h3>
          <p className="summary-text">{currentSummary}</p>
        </div>
        <div className="compiled-summary-container">
          <h3>Compiled Summary of All Rooms:</h3>
          {compiledSummary ? (
            <p className="compiled-summary-text">{compiledSummary}</p>
          ) : (
            <p>Compiling summary... This may take a few moments.</p>
          )}
        </div>
        <AICompanion 
          transcript={currentFormattedTranscript} 
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