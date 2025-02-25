import axios from 'axios';

const API_URL = 'http://127.0.0.1:8000/api/register/';  // backend URL

// Function to handle user registration
export const registerUser = async (userData: { username: string, password: string }) => {
  try {
    const response = await axios.post(API_URL, userData);
    return response.data; // Handle success
  } catch (error) {
    console.error("Registration error", error);
    throw error; // Handle failure
  }
};
