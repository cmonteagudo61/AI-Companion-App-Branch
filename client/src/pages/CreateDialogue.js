import React from 'react';
import { useNavigate } from 'react-router-dom';
import DialogueForm from '../components/DialogueForm';

const CreateDialogue = () => {
  const navigate = useNavigate();

  const handleDialogueCreated = () => {
    navigate('/');
  };

  return (
    <div>
      <h1>Create New Dialogue</h1>
      <DialogueForm onDialogueCreated={handleDialogueCreated} />
    </div>
  );
};

export default CreateDialogue;