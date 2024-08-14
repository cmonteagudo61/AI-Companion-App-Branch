// src/components/stages/ComponentName.js
import React from 'react';

const DiscoverStage = ({ summary }) => {
  return (
    <div className="discover-stage">
      <h3>Discover Stage</h3>
      <p>In this stage, we focus on listening for the overtones, the harmonics, of our dialogue together asking "what are we saying?"</p>
      <div className="summary">
        <h4>Current Summary:</h4>
        <p>{summary}</p>
      </div>
    </div>
  );
};

export default DiscoverStage;