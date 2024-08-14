import axios from 'axios';

const API_URL = 'http://localhost:5000/api/auth';

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

export const register = (username, email, password) => 
  authAxios.post(`/register`, { username, email, password })
    .catch(error => {
      console.error('Registration error:', error.response ? error.response.data : error.message);
      throw error;
    });

export const login = (usernameOrEmail, password) => 
  authAxios.post(`/login`, { login: usernameOrEmail, password })
    .catch(error => {
      console.error('Login error:', error.response ? error.response.data : error.message);
      throw error;
    });