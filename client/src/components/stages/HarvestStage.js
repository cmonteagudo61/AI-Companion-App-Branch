// src/components/stages/ComponentName.js
import React from 'react';

const HarvestStage = ({ summary }) => {
  return (
    <div className="explore-stage">
      <h3>Harvest Stage</h3>
      <p>In this stage, we focus on harvesting what we've learned, and figuring out next steps</p>
      <div className="summary">
        <h4>Current Summary:</h4>
        <p>{summary}</p>
      </div>
    </div>
  );
};

export default HarvestStage;