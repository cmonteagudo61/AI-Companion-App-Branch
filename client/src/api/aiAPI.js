import axios from 'axios';

const API_URL = 'http://localhost:5000/api/ai'; // Adjust if your server port is different

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
    const response = await axios.post(`${API_URL}/format-transcript`, { text });
    return response.data.formattedTranscript;
  } catch (error) {
    console.error('Error formatting transcript:', error.response ? error.response.data : error.message);
    throw error;
  }
};