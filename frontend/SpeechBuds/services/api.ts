import axios from 'axios';
import { AxiosError } from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

const API_URL = 'http://127.0.0.1:8000/api/register/';  // backend registration URL
const API_BASE_URL = "http://127.0.0.1:8000/api"; // Change if using a different URL


// Function to handle user registration
export const registerUser = async (userData: { username: string, password: string }) => {
  try {
    const response = await axios.post(API_URL, userData, {
      headers: {
        'Content-Type': 'application/json',  // Specify content type as JSON
      }
    });
    return response.data; // Handle success
  } catch (error) {
    console.error("Registration error", error);
    throw error; // Handle failure
  }
};

// Function to handle user login
export const loginUser = async (username: string, password: string) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/token/`, {
      username,
      password,
    }, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Assuming the response contains the access and refresh tokens
    const { access, refresh } = response.data;

    // Save the tokens to AsyncStorage or any secure storage mechanism
    await AsyncStorage.setItem('access_token', access);
    await AsyncStorage.setItem('refresh_token', refresh);

    return { token: access }; // Return the access token for use in the frontend

  } catch (error) {
    console.error('Login error:', error);
    throw error; // Rethrow the error to be caught in the component
  }
};

// Function to handle submission of audio file (when user presses "Get Feedback")
export const submitAudio = async (audioFileUri: string) => {
  const formData = new FormData();
  formData.append("audio_file", {
    uri: audioFileUri,
    name: "recording.wav", // Adjust name if needed
    type: "audio/wav", // Adjust type based on actual format
  } as any); // `as any` is used to avoid TypeScript type issues

  try {
    const response = await axios.post(`${API_BASE_URL}/submit-audio/`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      withCredentials: true, // Ensures authentication cookies are sent
    });

    return response.data;
  } catch (error) {
    console.error("Error uploading audio:", error);
    throw error;
  }
};
