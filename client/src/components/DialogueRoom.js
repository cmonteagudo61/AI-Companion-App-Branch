import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { getDialogue } from '../api/dialogueAPI';
import VideoConference from './VideoConference';

const DialogueRoom = () => {
  const [dialogue, setDialogue] = useState(null);
  const [currentStage, setCurrentStage] = useState('connect');
  const { id } = useParams();
  const [isVideoConferenceActive, setIsVideoConferenceActive] = useState(false);

  useEffect(() => {
    const fetchDialogue = async () => {
      try {
        const response = await getDialogue(id);
        setDialogue(response.data);
      } catch (error) {
        console.error('Error fetching dialogue:', error);
      }
    };

    fetchDialogue();
  }, [id]);

  const handleTranscriptionUpdate = useCallback((newTranscript) => {
    // You can use this function to update the transcript in the parent component if needed
    console.log('Transcript updated:', newTranscript);
  }, []);

  if (!dialogue) {
    return <div>Loading...</div>;
  }

  return (
    <div className="dialogue-room">
      <h2>{dialogue.title}</h2>
      {!isVideoConferenceActive ? (
        <button onClick={() => setIsVideoConferenceActive(true)}>
          Start Video Conference
        </button>
      ) : (
        <VideoConference
          roomName={dialogue._id}
          isBreakout={false}
          onTranscriptionUpdate={handleTranscriptionUpdate}
        />
      )}
      <div className="dialogue-stages">
        <button onClick={() => setCurrentStage('connect')}>Connect</button>
        <button onClick={() => setCurrentStage('explore')}>Explore</button>
        <button onClick={() => setCurrentStage('discover')}>Discover</button>
        <button onClick={() => setCurrentStage('harvest')}>Harvest</button>
      </div>
      {currentStage === 'connect' && <div>Connect Stage</div>}
      {currentStage === 'explore' && <div>Explore Stage</div>}
      {currentStage === 'discover' && <div>Discover Stage</div>}
      {currentStage === 'harvest' && <div>Harvest Stage</div>}
    </div>
  );
};

export default DialogueRoom;