import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Backend base URL (update this to match your Django server)
const API_BASE_URL = 'http://your-backend-ip:8000/api';

// Create an Axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Function to set auth token dynamically
export const setAuthToken = async () => {
  const token = await AsyncStorage.getItem('token');
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common['Authorization'];
  }
};

// Authentication API calls
export const loginUser = async (username: string, password: string) => {
  const response = await api.post('/token/', { username, password });
  await AsyncStorage.setItem('token', response.data.access); // Store token
  setAuthToken(); // Update token in requests
  return response.data;
};

// Submit audio file
export const submitAudio = async (audioFile: File) => {
  const formData = new FormData();
  formData.append('audio_file', audioFile);

  const token = await AsyncStorage.getItem('token');
  const response = await api.post('/submit_audio/', formData, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'multipart/form-data',
    },
  });

  return response.data;
};

export default api;
