const express = require('express');
const router = express.Router();
const Anthropic = require('@anthropic-ai/sdk');

// Initialize Anthropic client with error handling
const initAnthropicClient = () => {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY environment variable is not set');
    }
    return new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  } catch (error) {
    console.error('Error initializing Anthropic client:', error);
    throw error;
  }
};

const anthropic = initAnthropicClient();

router.post('/summarize', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const message = await anthropic.messages.create({
      model: 'claude-3-sonnet-20240229',
      max_tokens: 150,
      temperature: 0.5,
      system: "You are an AI assistant that creates concise, accurate summaries of dialogue transcripts.",
      messages: [{
        role: 'user',
        content: `Summarize the following dialogue transcript in a clear and concise way:\n\n${text}`
      }]
    });

    res.json({ summary: message.content[0].text });
  } catch (error) {
    console.error('Error summarizing text:', error);
    res.status(500).json({ 
      error: 'Error summarizing text', 
      details: error.message 
    });
  }
});

router.post('/format', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const message = await anthropic.messages.create({
      model: 'claude-3-sonnet-20240229',
      max_tokens: 1000,
      temperature: 0.3,
      system: "You are an AI assistant that formats dialogue transcripts into clear, properly punctuated text.",
      messages: [{
        role: 'user',
        content: `Format the following transcript into proper sentences with appropriate punctuation and capitalization:\n\n${text}`
      }]
    });

    res.json({ formatted: message.content[0].text });
  } catch (error) {
    console.error('Error formatting text:', error);
    res.status(500).json({ 
      error: 'Error formatting text', 
      details: error.message 
    });
  }
});

module.exports = router;