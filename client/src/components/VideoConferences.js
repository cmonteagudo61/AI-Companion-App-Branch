import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getAllDialogues } from '../api/dialogueAPI';

const VideoConferences = () => {
  const [dialogues, setDialogues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDialogues = async () => {
      try {
        setLoading(true);
        const response = await getAllDialogues();
        setDialogues(response.data);
      } catch (error) {
        console.error('Error fetching dialogues:', error);
        setError('Failed to fetch dialogues');
      } finally {
        setLoading(false);
      }
    };

    fetchDialogues();
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="video-conferences">
      <h2>Video Conferences</h2>
      {dialogues.length === 0 ? (
        <p>No active conferences available.</p>
      ) : (
        dialogues.map((dialogue) => (
          <div key={dialogue._id}>
            <h3>{dialogue.title}</h3>
            <Link to={`/dialogue/${dialogue._id}`} state={{ startVideo: true }}>
              Join Video Conference
            </Link>
          </div>
        ))
      )}
    </div>
  );
};

export default VideoConferences;