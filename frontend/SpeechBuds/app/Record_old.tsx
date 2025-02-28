import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { useRef, useState } from 'react';
import { Button, StyleSheet, Text, TouchableOpacity, View, Dimensions, Image } from 'react-native';
import { Link } from 'expo-router';
import { Video, ResizeMode } from 'expo-av';  // ✅ Import ResizeMode
import { useRoute } from '@react-navigation/native';
import { useNavigate } from './hooks/useNavigate';
import { submitAudio } from '../services/api'; // Import your submitAudio function


const { width, height } = Dimensions.get('window');

export default function Record() {
  const { navigateTo } = useNavigate();
  const route = useRoute();
  const { word, attempt, feedback } = route.params as { word: string, attempt: number, feedback: string};;  
  const score = 0; // placeholder before backend scoring is connected

  const [facing, setFacing] = useState<CameraType>('front');
  const [permission, requestPermission] = useCameraPermissions();
  const [isRecording, setIsRecording] = useState(false);
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [audioUri, setAudioUri] = useState<string | null>(null); //recording audio library
  const cameraRef = useRef<CameraView>(null);
  const videoRef = useRef<Video | null>(null);  // ✅ Ensure videoRef is not undefined

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
    if (!cameraRef.current) return;

    if (isRecording) {
      setIsRecording(false);
      cameraRef.current.stopRecording();
    } else {
      setIsRecording(true);
      try {
        const video = await cameraRef.current.recordAsync({
          maxDuration: 30,
          //mute: false,
        });
        if (video) {
          //setVideoUri(video.uri);
          setAudioUri(video.uri); // recording audio
        } else {
          console.error("No video returned from camera.");
        }
      } catch (error) {
        console.error("Error recording video:", error);
      } finally {
        setIsRecording(false);
      }
    }
  }

   // Function to submit audio to the backend and navigate to feedback page
  const sendAudioToBackend = async () => {
    if (audioUri) {
      try {
        const response = await submitAudio(audioUri); // Pass the URI of the recorded audio
        console.log(response); // You can check the response structure here
        
        // Extract feedback data (e.g., score and message) from the response
        const feedback = response; // Adjust according to the response structure from the backend

        // Navigate to feedback page with word, attempt, score, and feedback message
        navigateTo("Feedback", { 
          word: word, 
          attemptNumber: attempt, 
          score: feedback.score, 
          feedback: feedback.message 
        });
      } catch (error) {
        console.error("Error submitting audio:", error);
      }
    }
  };

  return (
    <View style={styles.container}>
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
          onPress={sendAudioToBackend}>
          <Text style={styles.text}>Get Feedback</Text>
        </TouchableOpacity>

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
  cameraContainer: {
    width: width * 0.8,
    height: height * 0.7,
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
    flex: 1,
    width: "80%",
    //height: "60%",
    marginTop: 20,
    marginBottom: 20,
    marginLeft: 20,
    marginRight: 20,
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

