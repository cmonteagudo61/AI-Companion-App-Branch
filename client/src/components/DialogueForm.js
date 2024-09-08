import React, { useState } from 'react';

const DialogueForm = ({ onDialogueCreated }) => {
  const [dialogue, setDialogue] = useState({
    title: '',
    description: '',
    startTime: '',
    participants: 1
  });

  const handleChange = (e) => {
    const value = e.target.type === 'number' ? parseInt(e.target.value) : e.target.value;
    setDialogue({ ...dialogue, [e.target.name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (typeof onDialogueCreated === 'function') {
      try {
        await onDialogueCreated(dialogue);
        setDialogue({ title: '', description: '', startTime: '', participants: 1 });
      } catch (error) {
        console.error('Error creating dialogue:', error);
      }
    } else {
      console.error('onDialogueCreated is not a function');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        name="title"
        value={dialogue.title}
        onChange={handleChange}
        placeholder="Title"
        required
      />
      <textarea
        name="description"
        value={dialogue.description}
        onChange={handleChange}
        placeholder="Description"
        required
      />
      <input
        type="datetime-local"
        name="startTime"
        value={dialogue.startTime}
        onChange={handleChange}
        required
      />
      <input
        type="number"
        name="participants"
        value={dialogue.participants}
        onChange={handleChange}
        placeholder="Number of participants"
        min="1"
        required
      />
      <button type="submit">Create Dialogue</button>
    </form>
  );
};

export default DialogueForm;