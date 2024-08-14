import React, { useState } from 'react';
import { updateDialogue, deleteDialogue } from '../api/dialogueAPI';

const DialogueItem = ({ dialogue, onUpdate, onDelete }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedDialogue, setEditedDialogue] = useState(dialogue);

  const handleChange = (e) => {
    setEditedDialogue({ ...editedDialogue, [e.target.name]: e.target.value });
  };

  const handleUpdate = async () => {
    try {
      console.log('Attempting to update dialogue with:', editedDialogue);
      
      // Check required fields
      console.log('Checking required fields:');
      console.log('Title:', editedDialogue.title);
      console.log('Description:', editedDialogue.description);
      console.log('Start Time:', editedDialogue.startTime);
      console.log('Participants:', editedDialogue.participants);
      
      // Check startTime format
      console.log('Is startTime a valid ISO string?', !isNaN(Date.parse(editedDialogue.startTime)));
      
      // Check participants
      console.log('Is participants a positive integer?', Number.isInteger(Number(editedDialogue.participants)) && Number(editedDialogue.participants) > 0);
  
      // Remove _id from the data sent to the server
      const { _id, host, createdAt, updatedAt, ...updateData } = editedDialogue;
      console.log('Sending update data:', updateData);
      const response = await updateDialogue(dialogue._id, updateData);
      console.log('Update response:', response);
      setIsEditing(false);
      onUpdate();
    } catch (error) {
      console.error('Error updating dialogue:', error);
      if (error.response) {
        console.error('Response data:', error.response.data);
        console.error('Response status:', error.response.status);
        console.error('Response headers:', error.response.headers);
      } else if (error.request) {
        console.error('No response received:', error.request);
      } else {
        console.error('Error message:', error.message);
      }
    }
  };

  const handleDelete = async () => {
    try {
      await deleteDialogue(dialogue._id);
      onDelete();
    } catch (error) {
      console.error('Error deleting dialogue:', error);
    }
  };

  if (isEditing) {
    return (
      <div>
        <input
          type="text"
          name="title"
          value={editedDialogue.title}
          onChange={handleChange}
        />
        <input
          type="text"
          name="description"
          value={editedDialogue.description}
          onChange={handleChange}
        />
        <input
          type="datetime-local"
          name="startTime"
          value={editedDialogue.startTime ? new Date(editedDialogue.startTime).toISOString().slice(0, 16) : ''}          onChange={handleChange}
        />
        <input
          type="number"
          name="participants"
          value={editedDialogue.participants}
          onChange={handleChange}
        />
        <textarea
          name="summary"
          value={editedDialogue.summary}
          onChange={handleChange}
        />
        <button onClick={handleUpdate}>Save</button>
        <button onClick={() => setIsEditing(false)}>Cancel</button>
      </div>
    );
  }

  return (
    <div>
      <h3>{dialogue.title}</h3>
      <p>Description: {dialogue.description}</p>
      <p>Start Time: {new Date(dialogue.startTime).toLocaleString()}</p>
      <p>Participants: {dialogue.participants}</p>
      <p>Summary: {dialogue.summary}</p>
      <button onClick={() => setIsEditing(true)}>Edit</button>
      <button onClick={handleDelete}>Delete</button>
    </div>
  );
};

export default DialogueItem;