import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import React, { useEffect, useRef, useState } from 'react';
import { Button, StyleSheet, Text, TouchableOpacity, View, Dimensions, Image } from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { useRoute } from '@react-navigation/native';
import { useNavigate } from './hooks/useNavigate';
import { submitAudio } from '../services/api'; 
import { Audio } from 'expo-av';
import VideoViewComponent from './VideoViewComponent';
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from 'axios';

const { width, height } = Dimensions.get('window');

export default function Record() {
  const { navigateTo } = useNavigate();
  const route = useRoute();
  const { wordSet, currentIndex, attemptNumber } = route.params as { wordSet: string[], currentIndex: number, attemptNumber: number}; 
  const currentWord = wordSet[currentIndex];
  const score = 0; // placeholder before backend scoring is connected
  const feedback = ""; // placeholder before backend feedback is connected

  const [facing, setFacing] = useState<CameraType>('front');
  const [permission, requestPermission] = useCameraPermissions();
  const [isRecording, setIsRecording] = useState(false);
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const [audioRecording, setAudioRecording] = useState<Audio.Recording | null>(null);
  const [isButtonDisabled, setIsButtonDisabled] = useState(false);
  
  const cameraRef = useRef<CameraView>(null);
  const videoRef = useRef<Video | null>(null); 

 useEffect(() => {
  const requestPermissions = async () => {
    if (permission?.granted) return; // Don't request if already granted

    console.log("Requesting camera and microphone permissions...");

    // Request camera permissions
    await requestPermission();

    // Request microphone permissions
    const { status: micStatus } = await Audio.requestPermissionsAsync();
    if (micStatus !== 'granted') {
      console.error("Microphone permission denied");
    }
  };

  requestPermissions();

  // reset state when a new word is selected
  console.log("New word selected. Resetting state.");
  setIsRecording(false);
  setAudioRecording(null);
  setAudioUri(null);
  // setVideoUri(null); // remove this after testing video view component
  }, [currentIndex]);

  

  if (!permission) {
    return <View />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>We need your permission to show the camera</Text>
        <Button onPress={requestPermission} title="Grant Permission" />
      </View>
    );
  }

  if (videoUri) return <VideoViewComponent video={videoUri} setVideo={setVideoUri} />; // eventually modify this to be just in the corner

  // Play the audio for testing
  const playAudio = async () => {
    if (audioUri) {
      const { sound } = await Audio.Sound.createAsync(
        { uri: audioUri },
        { shouldPlay: true }
      );
      await sound.playAsync();
    }
  };

  async function toggleRecording() {
    if (isRecording) {
      cameraRef.current?.stopRecording();
      setIsRecording(false);
    } else {
      setIsRecording(true)
      const response = await cameraRef.current?.recordAsync({maxDuration: 20});
      setVideoUri(response!.uri);
    }
  }

  // const toggleRecording = async () => {
  //   // if (isButtonDisabled) return; // preventing spam clicks that cause errors by temporarily disabling 
  //   // setIsButtonDisabled(true);

  //   await Audio.setAudioModeAsync({
  //     allowsRecordingIOS: true, // ✅ Enable recording
  //     staysActiveInBackground: false,
  //     interruptionModeIOS: 1,
  //   });

  //   try {
  //     if (isRecording) { // stop recording options if we just pressed "record"
  //       setIsRecording(false);

  //       if (cameraRef.current) {
  //         cameraRef.current?.stopRecording(); // Stop video recording
  //       }
  
  //       if (audioRecording) {
  //         await audioRecording.stopAndUnloadAsync();
  //         const audioUri = audioRecording.getURI();
  //         if (audioUri) {
  //           setAudioUri(audioUri);
  //           console.log("Recording saved at:", audioUri);
  //         }
  //         setAudioRecording(null);
  //       }
  //     } else {
  //       if (audioRecording) {
  //         // resetting the recording state from previous uses
  //         console.warn("Cleaning up previous recording...");
  //         await audioRecording.stopAndUnloadAsync();
  //         setAudioRecording(null);
  //       }

  //       setIsRecording(true);
        
  //       // req mic permission
  //       const { status } = await Audio.requestPermissionsAsync();
  //       if (status !== 'granted') {
  //         console.error("Permission to record audio denied");
  //         return;
  //       }

  //       // starting video recording
  //       if (cameraRef.current) {
  //         try {
  //           console.log("Starting video recording...");
            
  //           const videoResponse = await cameraRef.current?.recordAsync({});
  //           console.log(videoResponse?.uri)
  //           setVideoUri(videoResponse!.uri)
  //           //   onRecordingFinished: (video) => {
  //           //     console.log("Video recorded:", video);
  //           //     setVideoUri(video.filePath);  // Save the video URI
  //           //   },
  //           //   onRecordingError: (error) => {
  //           //     console.error("Recording error:", error);
  //           //   },
  //           // });
  //         } catch (error) {
  //           console.error("Error while recording video:", error);
  //         }
  //       }

  //       // starting audio recording
  //       const recording = new Audio.Recording();
  //       await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
  //       await recording.startAsync();
  //       setAudioRecording(recording);
  //     }
  //   } catch (error) {
  //     console.error("Error during recording:", error);
  //     setIsRecording(false);
  //   }
  
  //   // enable button after a short delay
  //   setTimeout(() => setIsButtonDisabled(false), 1);
  // }
  
   // Function to submit audio to the backend and navigate to feedback page
   const sendAudioToBackend = async () => {
    if (!audioUri) {
      console.error("No audio file to submit.");
      return;
    }
  
    try {
      // Fetch the audio file from the URI and convert it to a Blob
      const fetchResponse = await fetch(audioUri); // Renamed 'response' to 'fetchResponse'
      const blob = await fetchResponse.blob(); // Converts URI to Blob
  
      // Create a new FormData object and append the audio file
      const formData = new FormData();
      formData.append("audio_file", blob, "recording.m4a"); // 'recording.m4a' is the filename
  
      // Get the access token from AsyncStorage
      const token = await AsyncStorage.getItem("accessToken");
  
      // Send the request to your backend
      const axiosResponse = await axios.post( // Renamed 'response' to 'axiosResponse'
        "https://207f-2620-101-f000-7c0-00-c0eb.ngrok-free.app/api/submit_audio/",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${token}`,
          },
        }
      );
  
      console.log("API Response:", axiosResponse.data);
  
      // Navigate to the feedback screen with the response data
      navigateTo("Feedback", { 
        wordSet, 
        currentIndex, 
        attemptNumber, 
        score: axiosResponse.data?.score || 0, 
        feedback: axiosResponse.data?.feedback || "", 
      });
    } catch (error: unknown) { // Explicitly typing 'error' as 'unknown'
      // Checking if the error is an AxiosError and then extracting data
      if (axios.isAxiosError(error)) {
        console.error("Axios error submitting audio:", error.response?.data || error.message);
      } else {
        console.error("Unexpected error submitting audio:", error);
      }
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.brownContainer}>
        {/* Header with Exercise Word and Exit Button */}
        <View style={styles.header}>
          <Text style={styles.title}>Your turn! Try saying the word: {currentWord}</Text>
          <TouchableOpacity
            style={styles.exitButton}
            onPress={() => navigateTo("ChildHomeScreen")}
          >
            <Text style={styles.exitButtonText}>Exit</Text>
          </TouchableOpacity>
        </View>

      {/* Camera View */}
        <View style={styles.cameraContainer}>
          <CameraView ref={cameraRef} style={styles.camera} mode="video" facing={facing} />
        </View>


      {/* Video Thumbnail */}
      
      {videoUri && (
        <TouchableOpacity 
          style={styles.thumbnailContainer} 
          onPress={() => videoRef.current?.presentFullscreenPlayer()}
        >
          <Video
            ref={(ref) => (videoRef.current = ref)} 
            source={{ uri: videoUri }}
            style={styles.thumbnail}
            resizeMode={ResizeMode.COVER}
            useNativeControls
          />
        </TouchableOpacity>
      )}


      {/* Buttons */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={[styles.button, isRecording && styles.recordingButton]} onPress={toggleRecording} disabled={isButtonDisabled}>
          <Text style={styles.text}>{isRecording ? "Stop" : "Record"}</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.button}
          onPress={sendAudioToBackend}  // Call sendAudioToBackend here to submit the audio
        >
          <Text style={styles.text}>Get Feedback</Text>
        </TouchableOpacity>

        {/* just testing out the audio playback capabilities */}
        {/* <TouchableOpacity 
          style={styles.button}
          //onPress={sendAudioToBackend}> below sends 0 for score and "" for feedback by default atm
          onPress={playAudio}> 
          <Text style={styles.text}>Play Audio</Text>
        </TouchableOpacity> */}

       {/* USE THIS VERSION OF FEEDBACK BUTTON WHEN FEEDBACK WORKS */}
      {/* <TouchableOpacity 
        style={styles.button}
        onPress={sendAudioToBackend}>
        <Text style={styles.text}>Get Feedback</Text>
      </TouchableOpacity> */}


      </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#88C040",
    justifyContent: "center",
    alignItems: "center",
  },
  brownContainer: {
    flex: 1,
    width: width * 0.9,
    height: height * 0.8,
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#D9B382",
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#684503',
    overflow: "visible",
    marginTop: 50,
    marginBottom: 50,
  },
  header: {
    flex: 1,
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 5,
  },
  title: {
    fontSize: 25,
    fontWeight: "bold",
    color: "#432818",
    textAlign: "center",
  },
  exitButton: {
    position: "absolute",
    top: 10,
    right: 15, 
    backgroundColor: "#5A3E1B",
    borderRadius: 5,
    padding: 5,
  },
  exitButtonText: {
    color: "white",
    fontWeight: "bold",
  },
  cameraContainer: {
    width: width * 0.8,
    height: height * 0.8,
    //aspectRatio: 4 / 3,
    backgroundColor: "#D9B382",
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#684503',
    //overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },
  camera: {
    flex: 2,
    width: "100%",
    height: "100%",
    borderRadius: 10,
    //marginTop: 20,
    //marginBottom: 20,
    //marginLeft: 20,
    //marginRight: 20,
  },
  message: {
    textAlign: 'center',
    //paddingBottom: 10,
  },
  buttonContainer: {
    flexDirection: "row",
    marginTop: 20,
    gap: 15,
  },
  button: {
    backgroundColor: "#684503",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    minWidth: width * 0.3,
  },
  recordingButton: {
    backgroundColor: "red",
  },
  text: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  thumbnailContainer: {
    position: "absolute",
    bottom: 20,
    left: 20,
    borderRadius: 10,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "#684503",
  },
  thumbnail: {
    width: 80,
    height: 80,
    borderRadius: 10,
  },
});

