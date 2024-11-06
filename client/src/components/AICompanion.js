import React, { useState, useEffect, useCallback, useRef } from 'react';
import { summarizeText } from '../api/aiAPI';

const AICompanion = ({ transcript, roomName }) => {
  const [summary, setSummary] = useState('');
  const [error, setError] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const timeoutRef = useRef(null);
  const pendingTranscriptRef = useRef('');

  const processTranscript = useCallback(async (text) => {
    // Skip if no text or already processing
    if (!text?.trim()) return;
    if (isProcessing) {
      pendingTranscriptRef.current = text;
      return;
    }

    try {
      setIsProcessing(true);
      console.log(`[${roomName}] Processing transcript:`, text);
      
      const newSummary = await summarizeText(text);
      if (newSummary) {
        console.log(`[${roomName}] Generated summary:`, newSummary);
        setSummary(newSummary);
        setError(null);
      }
    } catch (error) {
      console.error(`[${roomName}] Error processing transcript:`, error);
      setError('Unable to generate summary. Will retry shortly.');
    } finally {
      setIsProcessing(false);
      
      // Process any pending transcript that came in while we were processing
      if (pendingTranscriptRef.current && pendingTranscriptRef.current !== text) {
        const pendingText = pendingTranscriptRef.current;
        pendingTranscriptRef.current = '';
        processTranscript(pendingText);
      }
    }
  }, [roomName, isProcessing]); // Added isProcessing to dependencies

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Debounce the processing to avoid too many API calls
    timeoutRef.current = setTimeout(() => {
      processTranscript(transcript);
    }, 5000);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [transcript, processTranscript]);

  return (
    <div className="ai-companion border rounded-lg p-4 bg-white shadow-sm">
      <h3 className="text-lg font-semibold mb-4">AI Companion for {roomName}</h3>
      
      <div className="status mb-2">
        {isProcessing && (
          <span className="processing inline-flex items-center text-blue-600">
            <svg className="animate-spin h-4 w-4 mr-2" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Processing...
          </span>
        )}
      </div>

      <div className="summary">
        <h4 className="font-medium mb-2">Summary:</h4>
        {error ? (
          <div className="error text-red-600 p-2 bg-red-50 rounded">
            {error}
          </div>
        ) : (
          <div className="summary-content p-3 bg-gray-50 rounded min-h-[100px]">
            {summary || 'No summary yet'}
          </div>
        )}
      </div>
    </div>
  );
};

export default AICompanion;