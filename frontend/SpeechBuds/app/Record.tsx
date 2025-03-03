import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { useRef, useState } from 'react';
import { Button, StyleSheet, Text, TouchableOpacity, View, Dimensions, Image } from 'react-native';
import { Link } from 'expo-router';
import { Video, ResizeMode } from 'expo-av';  // ✅ Import ResizeMode
import { useRoute } from '@react-navigation/native';
import { useNavigate } from './hooks/useNavigate';
import { submitAudio } from '../services/api'; // Import your submitAudio function
import { Audio } from 'expo-av';
import { useEffect } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';

const { width, height } = Dimensions.get('window');

export default function Record() {
  const { navigateTo } = useNavigate();
  const route = useRoute();
  const { wordSet, currentIndex, attemptNumber } = route.params as { wordSet: string[], currentIndex: number, attemptNumber: number}; 
  const currentWord = wordSet[currentIndex] 
  const score = 0; // placeholder before backend scoring is connected
  const feedback = "" // placeholder before backend feedback is connected

  const [facing, setFacing] = useState<CameraType>('front');
  const [permission, requestPermission] = useCameraPermissions();
  const [isRecording, setIsRecording] = useState(false);
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [audioUri, setAudioUri] = useState<string | null>(null); //recording audio library
  const [audioRecording, setAudioRecording] = useState<Audio.Recording | null>(null);
  const cameraRef = useRef<CameraView>(null);
  const videoRef = useRef<Video | null>(null);  // ✅ Ensure videoRef is not undefined

  // Reset state when leaving the screen
  useFocusEffect(
    useCallback(() => {
      return () => {
        console.log("Leaving record screen. Resetting state.");
        setIsRecording(false);
        setAudioRecording(null);
        setAudioUri(null);
        setVideoUri(null);
      };
  
    }, [])
  );  

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
      setIsRecording(false);
      if (audioRecording) {
        await audioRecording.stopAndUnloadAsync();
        const uri = audioRecording.getURI();
        setAudioUri(uri);
        console.log("Recording saved:", uri);
      }
    } else {
      setIsRecording(true);
      try {
        const { status } = await Audio.requestPermissionsAsync();
        if (status !== 'granted') {
          console.error("Permission to record audio denied");
          return;
        }
  
        const recording = new Audio.Recording();
        await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
        await recording.startAsync();
        setAudioRecording(recording);
      } catch (error) {
        console.error("Error starting audio recording:", error);
        setIsRecording(false);
      }
    }
  }

  // USE THIS VERSION TO MAKE THE AUDIO RECORDING FOR FEEDBACK SUBMISSION WORK
  // async function toggleRecording() {
  //   if (isRecording) {
  //     setIsRecording(false);
  //     if (audioRecording) {
  //       await audioRecording.stopAndUnloadAsync();
  //       const uri = audioRecording.getURI();
  //       if (uri) {
  //         setAudioUri(uri);
  //         console.log("Recording saved at:", uri);
  //       } else {
  //         console.error("Failed to get recording URI.");
  //       }
  //     }
  //   } else {
  //     setIsRecording(true);
  //     try {
  //       const { status } = await Audio.requestPermissionsAsync();
  //       if (status !== 'granted') {
  //         console.error("Permission to record audio denied");
  //         return;
  //       }
  
  //       const recording = new Audio.Recording();
  //       await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
  //       await recording.startAsync();
  //       setAudioRecording(recording);
  //     } catch (error) {
  //       console.error("Error starting audio recording:", error);
  //       setIsRecording(false);
  //     }
  //   }
  // }
  
   // Function to submit audio to the backend and navigate to feedback page
  const sendAudioToBackend = async () => {
    if (!audioUri) {
      console.error("No audio file to submit.");
      return;
    }

    if (audioUri) {
      try {
        const response = await submitAudio(audioUri); // Pass the URI of the recorded audio
        console.log(response); // You can check the response structure here
        
        // Extract feedback data (e.g., score and message) from the response
        const feedback = response; // Adjust according to the response structure from the backend

        // Navigate to feedback page with word, attempt, score, and feedback message
        // { wordSet: string[], currentIndex: number, attemptNumber: number, score: number, feedback: string }
        navigateTo("Feedback", { 
          wordSet: wordSet, 
          currentIndex: currentIndex,
          attemptNumber: attemptNumber, 
          score: feedback.score, 
          feedback: feedback.message 
        });
      } catch (error) {
        console.error("Error submitting audio:", error);
      }
    }
  };

  // USE THIS VERSION FOR TAKING THE AUDIO RECORDED ON THE PAGE
  // const sendAudioToBackend = async () => {
  //   if (!audioUri) {
  //     console.error("No audio file to submit.");
  //     return;
  //   }
  
  //   try {
  //     console.log("Sending audio to backend:", audioUri);
  
  //     // Call the backend API function
  //     const response = await submitAudio(audioUri);
  
  //     // Debug: Check the response structure
  //     console.log("Backend response:", response);
  
  //     // Extract feedback (ensure the response matches backend format)
  //     const feedbackData = response || { score: 0, message: "No feedback received" };
  
  //     // Navigate to Feedback screen with evaluation results
  //     navigateTo("Feedback", { 
  //       word, 
  //       attemptNumber: attempt, 
  //       score: feedbackData.score, 
  //       feedback: feedbackData.message 
  //     });
  
  //   } catch (error) {
  //     console.error("Error submitting audio:", error);
  //   }
  // };
  

  return (
    <View style={styles.container}>
      <View style={styles.brownContainer}>
        {/* Header with Exercise Word and Exit Button */}
        <View style={styles.header}>
          <Text style={styles.title}>{currentWord}</Text>
          <TouchableOpacity
            style={styles.exitButton}
            onPress={() => navigateTo("ChildHomeScreen")}
          >
            <Text style={styles.exitButtonText}>Exit</Text>
          </TouchableOpacity>
        </View>

      {/* Camera View */}
        <View style={styles.cameraContainer}>
          <CameraView ref={cameraRef} style={styles.camera} facing={facing} />
        </View>


      {/* Video Thumbnail */}
      {videoUri && (
        <TouchableOpacity style={styles.thumbnailContainer} onPress={() => videoRef.current?.presentFullscreenPlayer()}>
          <Video
            ref={(ref) => (videoRef.current = ref)}  // ✅ Ensure videoRef is set properly
            source={{ uri: videoUri }}
            style={styles.thumbnail}
            resizeMode={ResizeMode.COVER}  // ✅ Correct usage
            shouldPlay={false}
          />
        </TouchableOpacity>
      )}

      {/* Buttons */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={[styles.button, isRecording && styles.recordingButton]} onPress={toggleRecording}>
          <Text style={styles.text}>{isRecording ? "Stop" : "Record"}</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.button}
          //onPress={sendAudioToBackend}> below sends 0 for score and "" for feedback by default atm
          onPress={() => navigateTo("Feedback", { wordSet: wordSet, currentIndex: currentIndex, attemptNumber: attemptNumber, score: score, feedback: feedback } )}> 
          <Text style={styles.text}>Get Feedback</Text>
        </TouchableOpacity>

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

