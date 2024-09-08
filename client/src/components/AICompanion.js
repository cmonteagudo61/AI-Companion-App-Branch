import React, { useState, useEffect, useCallback } from 'react';
import { summarizeText } from '../api/aiAPI';

const AICompanion = ({ transcript, roomName }) => {
  const [summary, setSummary] = useState('');
  const [error, setError] = useState(null);

  const processTranscript = useCallback(async (text) => {
    if (text && text.trim() !== '') {
      console.log(`Processing transcript for AI Companion in ${roomName}:`, text);
      try {
        const newSummary = await summarizeText(text);
        setSummary(newSummary);
        setError(null);
      } catch (error) {
        console.error('Error processing transcript:', error);
        setError('Error generating summary. Please try again.');
      }
    }
  }, [roomName]);

  useEffect(() => {
    processTranscript(transcript);
  }, [transcript, processTranscript]);

  return (
    <div className="ai-companion">
      <h3>AI Companion for {roomName}</h3>
      <div className="summary">
        <h4>Summary:</h4>
        {error ? (
          <p className="error">{error}</p>
        ) : (
          <p>{summary}</p>
        )}
      </div>
    </div>
  );
};

export default AICompanion;