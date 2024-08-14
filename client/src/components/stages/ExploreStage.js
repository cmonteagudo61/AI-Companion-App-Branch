// src/components/stages/ComponentName.js
import React from 'react';

const ExploreStage = ({ summary }) => {
  return (
    <div className="explore-stage">
      <h3>Explore Stage</h3>
      <p>In this stage, we focus on exploring, understanding, even highlighting our differences.</p>
      <div className="summary">
        <h4>Current Summary:</h4>
        <p>{summary}</p>
      </div>
    </div>
  );
};

export default ExploreStage;