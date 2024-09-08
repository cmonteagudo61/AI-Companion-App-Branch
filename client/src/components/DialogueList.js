import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getAllDialogues } from '../api/dialogueAPI';
import DialogueItem from './DialogueItem';

const DialogueList = () => {
  const [dialogues, setDialogues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDialogues = async () => {
      try {
        setLoading(true);
        const response = await getAllDialogues();
        setDialogues(response.data);
        setError(null);
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
    <div className="dialogue-list">
      <h2>Dialogues</h2>
      {dialogues.length === 0 ? (
        <p>No dialogues available.</p>
      ) : (
        dialogues.map((dialogue) => (
          <DialogueItem key={dialogue._id} dialogue={dialogue} />
        ))
      )}
      <Link to="/create-dialogue">Create New Dialogue</Link>
    </div>
  );
};

export default DialogueList;