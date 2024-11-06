const express = require('express');
const router = express.Router();
const twilio = require('twilio');
require('dotenv').config();

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// Create a new room
router.post('/create-room', async (req, res) => {
  try {
    const { roomName } = req.body;
    
    if (!roomName) {
      return res.status(400).json({ error: 'Room name is required' });
    }

    // Check if room exists
    try {
      const existingRoom = await client.video.v1.rooms(roomName).fetch();
      let participantCount = 0;
      
      // Only check participants if room is in-progress
      if (existingRoom.status === 'in-progress') {
        const participants = await client.video.v1.rooms(roomName)
          .participants
          .list();
        participantCount = participants.length;
        
        if (participantCount >= 10) {
          return res.status(403).json({ 
            error: 'Room is at capacity',
            details: 'Maximum number of participants reached'
          });
        }
      }

      console.log(`Found existing room: ${existingRoom.sid} with ${participantCount} participants`);
      return res.json({ 
        roomSid: existingRoom.sid,
        roomName: existingRoom.uniqueName,
        status: 'existing',
        participantCount
      });
    } catch (error) {
      // Room doesn't exist, create new one
      if (error.code === 20404) {
        console.log('Creating new room:', roomName);
        const room = await client.video.v1.rooms.create({
          uniqueName: roomName,
          type: 'group',
          maxParticipants: 10
        });

        console.log('Created new room:', room.sid);
        return res.json({ 
          roomSid: room.sid,
          roomName: room.uniqueName,
          status: 'created',
          participantCount: 0
        });
      }
      throw error;
    }
  } catch (error) {
    console.error('Error in create-room:', error);
    if (error.code) {
      console.error('Twilio error code:', error.code);
    }
    res.status(500).json({ 
      error: 'Failed to create/fetch room',
      details: error.message 
    });
  }
});

// Get video token
router.post('/video-token', async (req, res) => {
  try {
    const { roomName } = req.body;
    if (!roomName) {
      return res.status(400).json({ error: 'Room name is required' });
    }

    let participantCount = 0;
    
    // Check room capacity before generating token
    try {
      const room = await client.video.v1.rooms(roomName).fetch();
      if (room.status === 'in-progress') {
        const participants = await client.video.v1.rooms(roomName)
          .participants
          .list();
        participantCount = participants.length;
        
        if (participantCount >= 10) {
          return res.status(403).json({ 
            error: 'Room is at capacity',
            details: 'Maximum number of participants reached'
          });
        }
      }
    } catch (error) {
      if (error.code !== 20404) {
        throw error;
      }
    }

    // Generate unique identity
    const identity = `user-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    
    const token = new twilio.jwt.AccessToken(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_API_KEY,
      process.env.TWILIO_API_SECRET,
      { identity }
    );

    const videoGrant = new twilio.jwt.AccessToken.VideoGrant({
      room: roomName
    });

    token.addGrant(videoGrant);
    
    console.log(`Generated token for ${identity} to join room ${roomName}`);
    res.json({ 
      token: token.toJwt(),
      identity,
      room: roomName,
      participantCount
    });
  } catch (error) {
    console.error('Error generating token:', error);
    res.status(500).json({ 
      error: 'Failed to generate token',
      details: error.message 
    });
  }
});

// End room
router.post('/end-room', async (req, res) => {
  try {
    const { roomName } = req.body;
    if (!roomName) {
      return res.status(400).json({ error: 'Room name is required' });
    }

    const room = await client.video.v1.rooms(roomName)
      .update({ status: 'completed' });

    console.log(`Ended room: ${room.sid}`);
    res.json({ 
      success: true,
      roomSid: room.sid,
      status: room.status 
    });
  } catch (error) {
    console.error('Error ending room:', error);
    res.status(500).json({ 
      error: 'Failed to end room',
      details: error.message 
    });
  }
});

module.exports = router;