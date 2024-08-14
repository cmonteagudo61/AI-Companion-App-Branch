import { useState, useEffect, useCallback, useRef } from 'react';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';

const useSpeechToText = (onTranscriptionUpdate) => {
  const [isListening, setIsListening] = useState(false);
  const fullTranscriptRef = useRef('');
  const timeoutRef = useRef(null);

  const {
    transcript,
    resetTranscript: resetSpeechRecognition,
    browserSupportsSpeechRecognition
  } = useSpeechRecognition();

  const startListening = useCallback(() => {
    setIsListening(true);
    SpeechRecognition.startListening({ continuous: true });
  }, []);

  const stopListening = useCallback(() => {
    setIsListening(false);
    SpeechRecognition.stopListening();
  }, []);

  const resetTranscript = useCallback(() => {
    resetSpeechRecognition();
    fullTranscriptRef.current = '';
    onTranscriptionUpdate('');
  }, [resetSpeechRecognition, onTranscriptionUpdate]);

  useEffect(() => {
    if (isListening) {
      startListening();
    } else {
      stopListening();
    }
  }, [isListening, startListening, stopListening]);

  useEffect(() => {
    if (transcript) {
      fullTranscriptRef.current += ' ' + transcript;
      
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        onTranscriptionUpdate(fullTranscriptRef.current.trim());
      }, 1000);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [transcript, onTranscriptionUpdate]);

  return {
    transcript: fullTranscriptRef.current,
    isListening,
    setIsListening,
    resetTranscript,
    browserSupportsSpeechRecognition
  };
};

export default useSpeechToText;