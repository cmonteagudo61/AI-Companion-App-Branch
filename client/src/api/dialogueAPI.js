import axios from 'axios';
//import { useAuth } from '../context/AuthContext'; // Adjust the path as needed

const API_URL = 'http://localhost:5000/api/dialogues';

const authAxios = axios.create({
  baseURL: API_URL,
});

authAxios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

authAxios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Token has expired
      localStorage.removeItem('token');
      // Redirect to login page
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const getAllDialogues = () => authAxios.get('');
export const getDialogue = (id) => authAxios.get(`/${id}`);
export const createDialogue = (dialogue) => authAxios.post('', dialogue);
export const deleteDialogue = (id) => authAxios.delete(`/${id}`);
export const updateDialogue = (id, dialogue) => 
  authAxios.put(`/${id}`, dialogue)
    .then(response => {
      console.log('Update API response:', response);
      return response;
    })
    .catch(error => {
      console.error('Update API error:', error);
      throw error;
    });

