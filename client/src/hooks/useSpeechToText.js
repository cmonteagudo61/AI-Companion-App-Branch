import { useState, useEffect, useCallback, useRef } from 'react';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';

const useSpeechToText = (onTranscriptionUpdate) => {
  const [isListening, setIsListening] = useState(false);
  const lastProcessedTextRef = useRef('');
  const timeoutRef = useRef(null);
  const isStartingRef = useRef(false);
  const audioStreamRef = useRef(null);

  const {
    transcript,
    listening,
    resetTranscript: resetSpeechRecognition,
    browserSupportsSpeechRecognition,
    isMicrophoneAvailable
  } = useSpeechRecognition({
    continuous: true,
    interimResults: true,
    recognition: {
      lang: 'en-US',
      interimResults: true,
      continuous: true,
      maxAlternatives: 1,
      audio: {
        sampleRate: 48000,
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
    }
  });

  const startRecognition = useCallback(async () => {
    if (isStartingRef.current || listening) return;

    try {
      isStartingRef.current = true;
      console.log('Starting speech recognition with enhanced settings...');
      
      // Request high-quality audio and store the stream
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000,
          channelCount: 1,
          volume: 1.0
        } 
      });

      // Store the stream reference
      audioStreamRef.current = stream;
      
      // Get audio tracks and set properties
      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length > 0) {
        const settings = audioTracks[0].getSettings();
        console.log('Audio settings:', settings);
        
        // Attempt to adjust settings if supported
        try {
          await audioTracks[0].applyConstraints({
            autoGainControl: true,
            echoCancellation: true,
            noiseSuppression: true,
            channelCount: 1,
            sampleRate: 48000
          });
        } catch (err) {
          console.warn('Could not apply optimal audio constraints:', err);
        }
      }
      
      console.log('High-quality audio access granted');
      
      await SpeechRecognition.startListening({ 
        continuous: true,
        language: 'en-US',
        interimResults: true,
        grammars: new window.SpeechGrammarList()
      });
      
    } catch (err) {
      console.error('Error starting speech recognition:', err);
      setIsListening(false);
    } finally {
      isStartingRef.current = false;
    }
  }, [listening]);

  const stopRecognition = useCallback(() => {
    // Stop all audio tracks
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach(track => track.stop());
      audioStreamRef.current = null;
    }
    SpeechRecognition.stopListening();
  }, []);

  // Process transcripts with better buffering
  useEffect(() => {
    if (!transcript || transcript === lastProcessedTextRef.current) return;

    const processTranscript = () => {
      // Get only new content
      const newText = transcript.slice(lastProcessedTextRef.current.length).trim();
      
      if (newText) {
        // Combine short phrases for better context
        const bufferedText = lastProcessedTextRef.current ? 
          `${lastProcessedTextRef.current} ${newText}` : newText;
        
        console.log('New transcript text:', newText);
        onTranscriptionUpdate(bufferedText);
        lastProcessedTextRef.current = transcript;
      }
    };

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    // Shorter delay for more responsive updates
    timeoutRef.current = setTimeout(processTranscript, 150);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [transcript, onTranscriptionUpdate]);

  // Handle isListening changes
  useEffect(() => {
    if (isListening && !listening && !isStartingRef.current) {
      startRecognition();
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [isListening, listening, startRecognition]);

  // Reset with buffer clearing
  const resetTranscript = useCallback(() => {
    console.log('Resetting transcript and clearing buffers');
    resetSpeechRecognition();
    lastProcessedTextRef.current = '';
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    onTranscriptionUpdate('');
  }, [resetSpeechRecognition, onTranscriptionUpdate]);

  // Cleanup function to stop audio stream
  useEffect(() => {
    return () => {
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach(track => track.stop());
        audioStreamRef.current = null;
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    transcript: lastProcessedTextRef.current,
    isListening,
    setIsListening: useCallback((value) => {
      setIsListening(value);
      if (!value) {
        stopRecognition();
      } else if (!listening && !isStartingRef.current) {
        startRecognition();
      }
    }, [listening, stopRecognition, startRecognition]),
    resetTranscript,
    browserSupportsSpeechRecognition,
    isMicrophoneAvailable
  };
};

export default useSpeechToText;