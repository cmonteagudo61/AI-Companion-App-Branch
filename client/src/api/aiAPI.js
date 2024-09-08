import axios from 'axios';

const API_URL = 'http://localhost:5000/api/ai';

export const summarizeText = async (text) => {
  try {
    const response = await axios.post(`${API_URL}/summarize`, { text });
    return response.data.summary;
  } catch (error) {
    console.error('Error summarizing text:', error.response ? error.response.data : error.message);
    throw error;
  }
};

export const formatTranscript = async (text) => {
  try {
    console.log('Sending transcript for formatting:', text);
    const response = await axios.post(`${API_URL}/format-transcript`, { text });
    console.log('Received formatted transcript:', response.data);
    return response.data.formattedTranscript;
  } catch (error) {
    console.error('Detailed error formatting transcript:', error.response?.data || error.message);
    console.error('Error stack:', error.stack);
    throw error;
  }
};