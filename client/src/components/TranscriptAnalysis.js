import React, { useState, useEffect } from 'react';
import { analyzeTranscripts } from '../api/aiAPI';

const TranscriptAnalysis = ({ transcripts }) => {
  const [analysis, setAnalysis] = useState(null);

  useEffect(() => {
    const performAnalysis = async () => {
      try {
        const result = await analyzeTranscripts(transcripts);
        setAnalysis(result);
      } catch (error) {
        console.error('Error analyzing transcripts:', error);
      }
    };

    performAnalysis();
  }, [transcripts]);

  if (!analysis) return <div>Analyzing transcripts...</div>;

  return (
    <div className="transcript-analysis">
      <h2>Transcript Analysis</h2>
      <div className="frequency-analysis">
        <h3>Frequent Topics</h3>
        {analysis.frequentTopics.map(topic => (
          <p key={topic.name}>{topic.name}: {topic.frequency}</p>
        ))}
      </div>
      <div className="sentiment-analysis">
        <h3>Overall Sentiment</h3>
        <p>Positive: {analysis.sentiment.positive}%</p>
        <p>Neutral: {analysis.sentiment.neutral}%</p>
        <p>Negative: {analysis.sentiment.negative}%</p>
      </div>
      {/* Add more analysis sections as needed */}
    </div>
  );
};

export default TranscriptAnalysis;