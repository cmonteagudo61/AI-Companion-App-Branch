import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import DialogueForm from '../components/DialogueForm';
import { createDialogue } from '../api/dialogueAPI';

const CreateDialogue = () => {
  const navigate = useNavigate();
  const { token } = useAuth();

  const handleDialogueCreated = async (dialogueData) => {
    try {
      await createDialogue(dialogueData);
      navigate('/dialogues');
    } catch (error) {
      console.error('Error creating dialogue:', error);
    }
  };

  return (
    <div>
      <h1>Create New Dialogue</h1>
      <DialogueForm onDialogueCreated={handleDialogueCreated} />
    </div>
  );
};

export default CreateDialogue;