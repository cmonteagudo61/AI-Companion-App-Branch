import axios from 'axios';

const API_URL = 'http://localhost:5000/api/ai'; // Use our backend endpoint instead of calling Anthropic directly

const aiAxios = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

export const summarizeText = async (text) => {
  try {
    console.log('Sending text for summarization:', text);
    const response = await aiAxios.post('/summarize', { text });
    console.log('Summary response:', response.data);
    return response.data.summary;
  } catch (error) {
    console.error('Error summarizing text:', error.message);
    return text;
  }
};

export const formatTranscript = async (text) => {
  try {
    console.log('Sending text for formatting:', text);
    if (text.length > 2000) {
      text = text.slice(0, 2000);
    }
    
    const response = await aiAxios.post('/format', { text });
    console.log('Format response:', response.data);
    return response.data.formatted;
  } catch (error) {
    console.error('Error formatting transcript:', error.message);
    return text;
  }
};