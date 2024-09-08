import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

const videoAxios = axios.create({
  baseURL: API_URL,
});

videoAxios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

videoAxios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      console.error('Response error:', error.response.data);
      console.error('Status:', error.response.status);
      console.error('Headers:', error.response.headers);
    } else if (error.request) {
      console.error('No response received:', error.request);
    } else {
      console.error('Error setting up request:', error.message);
    }
    return Promise.reject(error);
  }
);

export const getVideoToken = async (roomName) => {
  console.log('Requesting video token for room:', roomName);
  try {
    const response = await videoAxios.post('/video/video-token', { roomName });
    console.log('Received video token response:', response.data);
    return response.data.token;
  } catch (error) {
    console.error('Error fetching video token:', error.response?.data || error.message);
    throw error;
  }
};

export const createRoom = async (roomName) => {
  try {
    const response = await videoAxios.post('/video/create-room', { roomName });
    console.log('Room created:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error creating room:', error.response?.data || error.message);
    throw error;
  }
};

export const endRoom = async (roomName) => {
  try {
    const response = await videoAxios.post('/video/end-room', { roomName });
    console.log('Room ended:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error ending room:', error.response?.data || error.message);
    throw error;
  }
};