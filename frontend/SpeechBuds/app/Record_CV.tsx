import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import React, { useEffect, useRef, useState } from 'react';
import { Button, StyleSheet, Text, TouchableOpacity, View, Dimensions, Image } from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { useRoute } from '@react-navigation/native';
import { useNavigate } from './hooks/useNavigate';
import { submitAudio } from '../services/api'; 
import { Audio } from 'expo-av';
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios, { AxiosResponse } from 'axios';
import * as FileSystem from 'expo-file-system';
import RNFetchBlob, { PolyfillBlob } from 'rn-fetch-blob';
import { storage, ref, uploadBytes } from '../services/firebase'
import { getDownloadURL } from 'firebase/storage';

{/*Stuff that is necessary for CV features*/}
import VideoViewComponent from './VideoViewComponent';
import { Switch } from 'react-native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function Record() {
  const { navigateTo } = useNavigate();
  const route = useRoute();
  const { wordSet, currentIndex, attemptNumber, scoreTracking } = route.params as { wordSet: string[], currentIndex: number, attemptNumber: number, scoreTracking: number[]}; 
  const currentWord = wordSet[currentIndex];
  const attempt = 0;
  const score = 0; // placeholder before backend scoring is connected
  const feedback = ""; // placeholder before backend feedback is connected

  const [facing, setFacing] = useState<CameraType>('front');
  const [permission, requestPermission] = useCameraPermissions();
  const [isRecording, setIsRecording] = useState(false);
  const [videoUri, setVideoUri] = useState<string | null>(null);

  const [screenWidth, setScreenWidth] = useState(Dimensions.get("window").width);
  const [screenHeight, setScreenHeight] = useState(Dimensions.get("window").height);
  const [isPortrait, setIsPortrait] = useState(screenHeight > screenWidth);
  
   {/*Stuff that is necessary for CV features*/}
   const [audioUri, setAudioUri] = useState<string | null>(null);
   const [audioRecording, setAudioRecording] = useState<Audio.Recording | null>(null);
   const [showComputerVision, setShowComputerVision] = useState(false); // Toggle state

  const cameraRef = useRef<CameraView>(null);
  const videoRef = useRef<Video | null>(null); 

  useEffect(() => {
    // checking screen dimensions
    const updateDimensions = () => {
      const newWidth = Dimensions.get("window").width;
      const newHeight = Dimensions.get("window").height;
      setScreenWidth(newWidth);
      setScreenHeight(newHeight);
      setIsPortrait(newHeight > newWidth);
    };

    // requesting permissions for camera and mic
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


    // check for changes in dimensions
    updateDimensions();
    const subscription = Dimensions.addEventListener("change", updateDimensions);
    return () => subscription.remove();

  }, [currentIndex]);


  // views based on permissions
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

  async function toggleRecording() {
    if (isRecording) {
      cameraRef.current?.stopRecording();
      setIsRecording(false);
    } else {
      setIsRecording(true)
      const response = await cameraRef.current?.recordAsync({maxDuration: 20});
      setVideoUri(response!.uri);
      console.log("Video URI:", response!.uri);
    }
  }
  
  // Function to submit audio to the backend and navigate to feedback page
  const sendAudioToBackend = async () => {
    if (!videoUri) {
      console.error("No video file to submit.");
      return;
    }
  
    try {
      console.log("Uploading video to Firebase from URI:", videoUri);
  
      // Upload video to Firebase using URI directly
      const downloadUri = await uploadToFirebase(videoUri); 
  
      // Prepare the FormData with the Firebase download URL
      const formData = new FormData();
      formData.append("audio_file", downloadUri);
  
      console.log("Sending video URL to backend...");
  
      const response = await axios.post(
        "https://0821-72-138-72-162.ngrok-free.app/api/submit_audio/",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
  
      console.log("Response from backend:", response?.data);
  
      // track the score
      const updatedScoreTracking = [...scoreTracking];
      updatedScoreTracking[currentIndex] = response?.data?.score || 0; // add current score to the total scores in exercise

      navigateTo("Feedback", {
        wordSet,
        currentIndex,
        attemptNumber,
        score: response?.data?.score || 0,
        feedback: response?.data?.feedback || "",
        scoreTracking: scoreTracking
      });
    } catch (error) {
      console.error("Error submitting video:", error);
    }
  };
  
  // Helper function to upload file to Firebase Storage
  const uploadToFirebase = async (fileUri: string) => {
    const fileName = `${Date.now()}.mov`;
    const fileRef = ref(storage, `audio_files/${fileName}`);
    
    // Convert the video into a blob using Expo's FileSystem
    const response = await fetch(fileUri);
    const blob = await response.blob();
    
    // Upload the blob to Firebase
    await uploadBytes(fileRef, blob);
  
    // Get the download URL
    const downloadUrl = await getDownloadURL(fileRef);
    console.log("File uploaded to Firebase. Download URL:", downloadUrl);
  
    return downloadUrl;
  };

  const progressWidth = ((currentIndex + 1) * (screenWidth/5));

  return (
    <View style={styles.container}>

      <View style={styles.progressBarContainer}>
        <View style={[styles.progressBar, { width: progressWidth }]} />
      </View>

      <View style={styles.brownContainer}>
        {/* Header with Exercise Word and Exit Button */}
        <View style={styles.header}>
          <Text style={styles.title}>Your turn! Try saying the word: {currentWord}</Text>

          {/* Exit Button */}
          <TouchableOpacity
            style={styles.exitButton}
            onPress={() => navigateTo("ChildHomeScreen")}
          >
            <Text style={styles.exitButtonText}>Exit</Text>
          </TouchableOpacity>

          {/* Back Button */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigateTo("Demo", { wordSet: wordSet, currentIndex: currentIndex, scoreTracking: scoreTracking })}
          >
            <Text style={styles.exitButtonText}>Back</Text>
          </TouchableOpacity>
        </View>

        {/* Camera View */}
        <View 
            style={[
              styles.cameraContainer,
              isPortrait ? { width: "90%", height: screenHeight * 0.7 } 
                         : { width: screenWidth * 0.8, height: "80%" }
            ]}
          >
            <CameraView ref={cameraRef} style={styles.camera} mode="video" facing={facing} />
        
        {/* Toggle Switch */}
        <View style={styles.toggleContainer}>
          <Text style={styles.toggleLabel}>Toggle the switch on for a visual guide!</Text>
          <Switch
            value={showComputerVision}
            onValueChange={setShowComputerVision}
          />
        </View>

        {/* CV Play Button*/}
        <TouchableOpacity
          style={styles.CVPlayButton}
          onPress={() => navigateTo("ChildHomeScreen")}
        >
          <Text style={styles.CVPlayButtonText}>Play Word</Text>
        </TouchableOpacity>

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
        </View>

        {/* Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={[styles.button, isRecording && styles.recordingButton]} onPress={toggleRecording}>
            <Text style={styles.text}>{isRecording ? "Stop" : "Record"}</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.button, !videoUri && styles.disabledButton]}
            onPress={sendAudioToBackend}  // Call sendAudioToBackend here to submit the audio
            disabled={!videoUri}
          >
            <Text style={styles.text}>Get Feedback</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#A4D65E",
    justifyContent: "center",
    alignItems: "center",
  },
  brownContainer: {
    flex: 1,
    width: screenWidth * 0.9,
    height: screenHeight * 0.9,
    //flexDirection: "column",
    //justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#D9B382",
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#684503',
    overflow: "hidden",
    marginTop: 50,
    marginBottom: 50,
  },
  header: {
    //flexDirection: "row",
    //justifyContent: "space-between",
    alignItems: "center",
    //paddingHorizontal: 20,
    paddingVertical: 10,
    width: "100%",
    backgroundColor: "#D9B382",
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#432818",
    textAlign: "center",
    overflow: "visible",
    marginBottom: 10,
    marginTop: 35
  },
  progressBarContainer: {
    width: "100%",
    height: 15,
    backgroundColor: "#D9B382",
    borderRadius: 3,
  },
  progressBar: {
    height: "100%",
    backgroundColor: "#684503",
  },
  exitButton: {
    position: "absolute",
    top: 10,
    right: 15, 
    backgroundColor: "#5A3E1B",
    borderRadius: 5,
    padding: 5,
  },
  backButton: {
    position: "absolute",
    top: 10,
    left: 15, 
    backgroundColor: "#5A3E1B",
    borderRadius: 5,
    padding: 5,
  },
  exitButtonText: {
    color: "white",
    fontWeight: "bold",
  },
  cameraContainer: {
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#684503',
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },
  portraitCamera: {
    width: "90%",
    height: screenHeight * 0.5,
  },
  landscapeCamera: {
    width: screenWidth * 0.8,
    height: "80%", 
  },
  camera: {
    flex: 1,
    width: "100%",
    borderRadius: 10,
  },
  message: {
    textAlign: 'center',
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
    minWidth: screenWidth * 0.3,
  },
  disabledButton: {
    backgroundColor: "#ccc", // Greyed out when disabled
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
  toggleContainer: {
    position: "absolute",
    bottom: 20,
    right: 20,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#5A3E1B",
    borderRadius: 5,
    padding: 5,
  },
  toggleLabel: {
    fontSize: 16,
    color: "white",
    marginRight: 10,
  },
  CVPlayButton: {
    position: "absolute",
    bottom: 70,
    right: 20, 
    backgroundColor: "#5A3E1B",
    borderRadius: 5,
    padding: 5,
  },
  CVPlayButtonText: {
    color: "white",
    fontWeight: "bold",
  },
});

