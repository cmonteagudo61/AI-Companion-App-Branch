import React from 'react';
import { useSpeechRecognition } from 'react-speech-recognition';
const SpeechRecognitionWrapper = ({ children }) => {
  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition
  } = useSpeechRecognition();

  if (!browserSupportsSpeechRecognition) {
    return <span>Browser doesn't support speech recognition.</span>;
  }

  return children({ transcript, listening, resetTranscript });
};

export default SpeechRecognitionWrapper;