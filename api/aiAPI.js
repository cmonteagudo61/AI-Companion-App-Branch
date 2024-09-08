const axios = require('axios');

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/complete';
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

const anthropicAxios = axios.create({
  baseURL: ANTHROPIC_API_URL,
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': ANTHROPIC_API_KEY,
    'anthropic-version': '2023-06-01'
  },
});

exports.summarizeText = async (text) => {
  try {
    const response = await anthropicAxios.post('', {
      prompt: `Human: Summarize the following text:\n\n${text}\n\nAssistant: Here's a summary:`,
      model: "claude-2.0",
      max_tokens_to_sample: 150,
      temperature: 0.5,
      stop_sequences: ["\nHuman:"]
    });
    return response.data.completion.trim();
  } catch (error) {
    console.error('Error summarizing text:', error.response ? error.response.data : error.message);
    throw error;
  }
};

exports.formatTranscript = async (text) => {
  try {
    const response = await anthropicAxios.post('', {
      prompt: `Human: Please format the following transcript into proper sentences with appropriate punctuation and capitalization:\n\n${text}\n\nAssistant: Here's the formatted transcript:`,
      model: "claude-2.0",
      max_tokens_to_sample: 1000,
      temperature: 0.3,
      stop_sequences: ["\nHuman:"]
    });
    return response.data.completion.trim();
  } catch (error) {
    console.error('Error formatting transcript:', error.response ? error.response.data : error.message);
    throw error;
  }
};