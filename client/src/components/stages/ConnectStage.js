// src/components/stages/ComponentName.js
import React from 'react';

const ConnectStage = ({ summary }) => {
  return (
    <div className="connect-stage">
      <h3>Connect Stage</h3>
      <p>In this stage, we focus on building connections and creating a safe space for dialogue.</p>
      <div className="summary">
        <h4>Current Summary:</h4>
        <p>{summary}</p>
      </div>
    </div>
  );
};

export default ConnectStage;