import axios from 'axios';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_API_KEY = process.env.REACT_APP_ANTHROPIC_API_KEY;  // Note the REACT_APP_ prefix

const anthropicAxios = axios.create({
  baseURL: ANTHROPIC_API_URL,
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': ANTHROPIC_API_KEY,
    'anthropic-version': '2023-06-01',
  },
});

const retryWithDelay = async (fn, retries = 3, delay = 1000) => {
  try {
    return await fn();
  } catch (error) {
    if (retries === 0 || !error.response || error.response.status !== 529) throw error;
    await new Promise(resolve => setTimeout(resolve, delay));
    return retryWithDelay(fn, retries - 1, delay * 2);
  }
};

export const summarizeText = async (text) => {
  try {
    const response = await retryWithDelay(() => 
      anthropicAxios.post('', {
        messages: [{
          role: "user",
          content: `Summarize the following text:\n\n${text}`
        }],
        model: "claude-3-sonnet-20240229",
        max_tokens: 150,
        temperature: 0.5,
      })
    );
    return response.data.content[0].text;
  } catch (error) {
    console.error('Error summarizing text:', error.response ? error.response.data : error.message);
    return text.split('.').slice(0, 3).join('.') + '...';
  }
};

export const formatTranscript = async (text) => {
  if (text.length > 2000) {
    text = text.slice(0, 2000);
  }
  
  try {
    const response = await retryWithDelay(() =>
      anthropicAxios.post('', {
        messages: [{
          role: "user",
          content: `Format the following transcript into proper sentences with appropriate punctuation and capitalization:\n\n${text}`
        }],
        model: "claude-3-sonnet-20240229",
        max_tokens: 1000,
        temperature: 0.3,
      })
    );
    return response.data.content[0].text;
  } catch (error) {
    console.error('Error formatting transcript:', error.response ? error.response.data : error.message);
    return text;
  }
};