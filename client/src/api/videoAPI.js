// src/api/videoAPI.js
import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

const videoAxios = axios.create({
  baseURL: API_URL,
});

// Request interceptor
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

// Response interceptor
videoAxios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error('Response error:', error.response.data);
      console.error('Status:', error.response.status);
      console.error('Headers:', error.response.headers);
    } else if (error.request) {
      // The request was made but no response was received
      console.error('No response received:', error.request);
    } else {
      // Something happened in setting up the request that triggered an Error
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

// Add other video-related API calls here as needed
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