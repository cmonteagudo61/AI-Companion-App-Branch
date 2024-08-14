import React, { useState, useEffect, useCallback, useRef } from 'react';
import Video from 'twilio-video';
import { getVideoToken } from '../api/videoAPI';
import { summarizeText, formatTranscript } from '../api/aiAPI.js';
import './VideoConference.css';
import ErrorBoundary from './ErrorBoundary';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';

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

const VideoConference = ({ roomName, isBreakout, onTranscriptionUpdate }) => {
  const [room, setRoom] = useState(null);
  // eslint-disable-next-line no-unused-vars
  const [participants, setParticipants] = useState([]);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [error, setError] = useState(null);
  const [rawTranscript, setRawTranscript] = useState('');
  const [formattedTranscript, setFormattedTranscript] = useState('');
  const [isEditingTranscript, setIsEditingTranscript] = useState(false);
  const [summary, setSummary] = useState('');

  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition
  } = useSpeechRecognition();

  const transcriptRef = useRef('');

  useEffect(() => {
    if (transcript !== transcriptRef.current) {
      const newText = transcript.slice(transcriptRef.current.length).trim();
      if (newText) {
        setRawTranscript(prev => prev + (prev ? ' ' : '') + newText);
        transcriptRef.current = transcript;
        onTranscriptionUpdate(transcriptRef.current);
      }
    }
  }, [transcript, onTranscriptionUpdate]);

  useEffect(() => {
    const formatAndUpdateTranscript = async () => {
      if (rawTranscript.trim() === '') return;
      try {
        const formatted = await formatTranscript(rawTranscript);
        setFormattedTranscript(formatted);
      } catch (error) {
        console.error('Error formatting transcript:', error);
        setError(`Error formatting transcript: ${error.message}`);
      }
    };

    const debouncedFormatting = setTimeout(formatAndUpdateTranscript, 2000);

    return () => clearTimeout(debouncedFormatting);
  }, [rawTranscript]);

  const updateSummary = useCallback(async (text) => {
    if (text.trim() === '') return;
    try {
      const newSummary = await summarizeText(text);
      setSummary(newSummary);
    } catch (error) {
      console.error('Error updating summary:', error);
      setError(`Error updating summary: ${error.message}`);
    }
  }, []);

  useEffect(() => {
    const debouncedSummary = setTimeout(() => updateSummary(formattedTranscript), 2000);
    return () => clearTimeout(debouncedSummary);
  }, [formattedTranscript, updateSummary]);

  const connectToRoom = useCallback(async () => {
    if (room) return;
    try {
      const token = await getVideoToken(roomName);
      const newRoom = await Video.connect(token, {
        name: roomName,
        audio: { echoCancellation: true, autoGainControl: true, noiseSuppression: true },
        video: true
      });

      setRoom(newRoom);
      setParticipants(Array.from(newRoom.participants.values()));
      newRoom.on('participantConnected', participant => {
        setParticipants(prevParticipants => [...prevParticipants, participant]);
      });
      newRoom.on('participantDisconnected', participant => {
        setParticipants(prevParticipants => prevParticipants.filter(p => p !== participant));
      });
    } catch (err) {
      console.error('Error connecting to room:', err);
      setError(`Could not connect to room: ${err.message}`);
    }
  }, [roomName, room]);

  useEffect(() => {
    connectToRoom();
    return () => {
      if (room) {
        room.disconnect();
      }
    };
  }, [connectToRoom, room]);

  const toggleAudio = useCallback(() => {
    if (room) {
      room.localParticipant.audioTracks.forEach(publication => {
        if (isAudioMuted) {
          publication.track.enable();
        } else {
          publication.track.disable();
        }
      });
      setIsAudioMuted(!isAudioMuted);
    }
  }, [room, isAudioMuted]);

  const toggleVideo = useCallback(() => {
    if (room) {
      room.localParticipant.videoTracks.forEach(publication => {
        if (isVideoOff) {
          publication.track.enable();
        } else {
          publication.track.disable();
        }
      });
      setIsVideoOff(!isVideoOff);
    }
  }, [room, isVideoOff]);

  const toggleListening = useCallback(() => {
    if (listening) {
      SpeechRecognition.stopListening();
    } else {
      SpeechRecognition.startListening({ continuous: true });
    }
  }, [listening]);

  const handleResetTranscript = useCallback(() => {
    resetTranscript();
    setRawTranscript('');
    setFormattedTranscript('');
    setSummary('');
    transcriptRef.current = '';
  }, [resetTranscript]);

  const endDialogue = useCallback(() => {
    SpeechRecognition.stopListening();
    if (room) {
      room.disconnect();
    }
  }, [room]);

  const handleEditTranscript = () => {
    setIsEditingTranscript(true);
  };

  const handleSaveTranscript = () => {
    setIsEditingTranscript(false);
    // No need to trigger summary update here, as it's already handled by the useEffect
  };

  const handleTranscriptChange = (e) => {
    setFormattedTranscript(e.target.value);
  };

  if (!browserSupportsSpeechRecognition) {
    return <span>Browser doesn't support speech recognition.</span>;
  }

  return (
    <ErrorBoundary>
      <div className="video-conference">
        {error && <div className="error">{error}</div>}
        <div className="participants">
          {room && <Participant key={room.localParticipant.sid} participant={room.localParticipant} isLocal={true} />}
        </div>
        <div className="transcript-container">
          <h3>Real-time Transcript:</h3>
          <p className="transcript-text">{rawTranscript}</p>
        </div>
        <div className="formatted-transcript-container">
          <h3>Formatted Transcript:</h3>
          {isEditingTranscript ? (
            <>
              <textarea
                className="formatted-transcript-text"
                value={formattedTranscript}
                onChange={handleTranscriptChange}
              />
              <button onClick={handleSaveTranscript}>Save</button>
            </>
          ) : (
            <>
              <p className="formatted-transcript-text">{formattedTranscript}</p>
              <button onClick={handleEditTranscript}>Edit</button>
            </>
          )}
        </div>
        <div className="summary-container">
          <h3>Summary:</h3>
          <p className="summary-text">{summary}</p>
        </div>
        <div className="controls">
          <button onClick={toggleAudio}>{isAudioMuted ? 'Unmute' : 'Mute'}</button>
          <button onClick={toggleVideo}>{isVideoOff ? 'Start Video' : 'Stop Video'}</button>
          <button onClick={toggleListening}>
            {listening ? 'Stop Recording' : 'Start Recording'}
          </button>
          <button onClick={handleResetTranscript}>Reset Transcript</button>
          <button onClick={endDialogue}>End Dialogue</button>
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default VideoConference;