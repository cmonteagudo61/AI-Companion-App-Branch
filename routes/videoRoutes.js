const express = require('express');
const router = express.Router();
const twilio = require('twilio');
require('dotenv').config();


const AccessToken = twilio.jwt.AccessToken;
const VideoGrant = AccessToken.VideoGrant;

router.post('/video-token', (req, res) => {
  console.log('Received request for video token. Room name:', req.body.roomName);
  
  const { roomName } = req.body;
  
  try {
    const token = new AccessToken(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_API_KEY,
      process.env.TWILIO_API_SECRET,
      { identity: 'user-' + Math.random().toString(36).substring(7) }  // Add this line
    );

    const videoGrant = new VideoGrant({ room: roomName });
    token.addGrant(videoGrant);

    console.log('Generated token for room:', roomName);
    
    res.json({ token: token.toJwt() });
  } catch (error) {
    console.error('Error generating token:', error);
    res.status(500).json({ error: 'Failed to generate token', details: error.message });
  }
});

module.exports = router;