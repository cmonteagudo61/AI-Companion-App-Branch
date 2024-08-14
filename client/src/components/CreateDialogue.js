import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import DialogueForm from '../components/DialogueForm';

const CreateDialogue = () => {
  const [error, setError] = useState('');
  const { token } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (formData) => {
    try {
      const response = await fetch('http://localhost:5000/api/dialogues', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        throw new Error('Failed to create dialogue');
      }

      const data = await response.json();
      console.log('Dialogue created:', data);
      navigate('/dialogues'); // Redirect to dialogues list
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="create-dialogue">
      <h2>Create New Dialogue</h2>
      {error && <p className="error">{error}</p>}
      <DialogueForm onSubmit={handleSubmit} />
    </div>
  );
};

export default CreateDialogue;