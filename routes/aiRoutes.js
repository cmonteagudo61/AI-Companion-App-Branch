const express = require('express');
const router = express.Router();
const { summarizeText, formatTranscript } = require('../api/aiAPI');

router.post('/summarize', async (req, res) => {
  try {
    const { text } = req.body;
    const summary = await summarizeText(text);
    res.json({ summary });
  } catch (error) {
    console.error('Error in /summarize endpoint:', error);
    res.status(500).json({ error: 'Failed to summarize text', details: error.message });
  }
});

router.post('/format-transcript', async (req, res) => {
  try {
    const { text } = req.body;
    const formattedTranscript = await formatTranscript(text);
    res.json({ formattedTranscript });
  } catch (error) {
    console.error('Error in /format-transcript endpoint:', error);
    res.status(500).json({ error: 'Failed to format transcript', details: error.message });
  }
});

module.exports = router;