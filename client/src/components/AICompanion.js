import React, { useState, useEffect } from 'react';
import { summarizeText } from '../api/aiAPI';

const AICompanion = ({ transcript }) => {
  const [summary, setSummary] = useState('');

  useEffect(() => {
    const processTranscript = async () => {
      if (transcript) {
        console.log(`Processing transcript for AI Companion:`, transcript);
        try {
          const newSummary = await summarizeText(transcript);
          setSummary(newSummary);
        } catch (error) {
          console.error('Error processing transcript:', error);
          setSummary('Error generating summary. Please try again.');
        }
      }
    };

    processTranscript();
  }, [transcript]);

  return (
    <div className="ai-companion">
      <h3>AI Companion</h3>
      <div className="summary">
        <h4>Summary:</h4>
        <p>{summary}</p>
      </div>
    </div>
  );
};

export default AICompanion;