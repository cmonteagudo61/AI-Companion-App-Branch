import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getAllDialogues } from '../api/dialogueAPI';
import DialogueItem from './DialogueItem';

const DialogueList = () => {
  const [dialogues, setDialogues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

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

  useEffect(() => {
    fetchDialogues();
  }, []);

  const handleUpdate = () => {
    fetchDialogues();
  };

  const handleDelete = () => {
    fetchDialogues();
  };

  const joinVideoConference = (dialogueId) => {
    navigate(`/dialogue/${dialogueId}`, { state: { startVideo: true } });
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="dialogue-list">
      <h2>Dialogues</h2>
      {dialogues.length === 0 ? (
        <p>No dialogues available.</p>
      ) : (
        dialogues.map((dialogue) => (
          <div key={dialogue._id}>
            <DialogueItem
              dialogue={dialogue}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
            />
            <button onClick={() => joinVideoConference(dialogue._id)}>Join Video Conference</button>
          </div>
        ))
      )}
      <Link to="/create-dialogue">Create New Dialogue</Link>
    </div>
  );
};

export default DialogueList;