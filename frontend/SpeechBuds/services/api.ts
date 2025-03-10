import axios from 'axios';
import { AxiosError } from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

const API_URL = 'https://631c-2620-101-f000-7c0-00-70eb.ngrok-free.app/api/register/';  // backend registration URL
const API_BASE_URL = "https://631c-2620-101-f000-7c0-00-70eb.ngrok-free.app/api"; // Change if using a different URL


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
    });
    return response.data; // This will return the access token, refresh token, and role
  } catch (error) {
    console.error('Login error:', error);
    throw error; // Or handle error appropriately
  }
};

// Function to get the token from AsyncStorage
const getAccessToken = async () => {
  return await AsyncStorage.getItem("access_token");
};

// Function to fetch the patient list
export const getPatientList = async () => {
  try {
    const token = await getAccessToken();

    if (!token) {
      throw new Error("No token found");
    }

    const response = await axios.get(`${API_BASE_URL}/patients/`, {
      headers: {
        Authorization: `Bearer ${token}`, // Send token in the Authorization header
      },
    });

    return response.data; // Return the patient data
  } catch (error) {
    console.error("Error fetching patient list", error);
    throw error; // Propagate the error
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

// try this version after gallery walk if it works with the full recording workflow, might not need
// export const submitAudio = async (audioUri: string) => {
//   try {
//     const response = await fetch(audioUri);
//     const blob = await response.blob(); // Convert file to Blob

//     const formData = new FormData();
//     formData.append("audio", blob, "recording.wav"); // Append as a Blob with filename

//     const uploadResponse = await fetch(`${API_BASE_URL}/submit-audio/`, {
//       method: "POST",
//       body: formData,
//       headers: {
//         "Content-Type": "multipart/form-data",
//       },
//     });

//     return await uploadResponse.json();
//   } catch (error) {
//     console.error("Error uploading audio:", error);
//     throw error;
//   }
// };

