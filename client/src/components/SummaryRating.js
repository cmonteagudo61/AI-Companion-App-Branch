import React from 'react';

const SummaryRating = ({ roomName, onRate, scores }) => {
  const averageScore = scores.length > 0
    ? scores.reduce((a, b) => a + b, 0) / scores.length
    : null;

  return (
    <div className="summary-rating">
      <p>How well does this summary capture the essence of your dialogue?</p>
      <div className="rating-buttons">
        {[1, 2, 3, 4, 5].map((score) => (
          <button
            key={score}
            onClick={() => onRate(roomName, score)}
            className={scores.includes(score) ? 'selected' : ''}
          >
            {score}
          </button>
        ))}
        {averageScore !== null && (
          <span className="average-score">
            Average: {averageScore.toFixed(2)}
          </span>
        )}
      </div>
    </div>
  );
};

export default SummaryRating;