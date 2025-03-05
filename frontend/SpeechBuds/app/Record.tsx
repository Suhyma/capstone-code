import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { useRef, useState } from 'react';
import { Button, StyleSheet, Text, TouchableOpacity, View, Dimensions, Image } from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { useRoute } from '@react-navigation/native';
import { useNavigate } from './hooks/useNavigate';
import { submitAudio } from '../services/api'; 
import { Audio } from 'expo-av';
import { useEffect } from 'react';

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
  const [audioUri, setAudioUri] = useState<string | null>(null); //recording audio library
  const [audioRecording, setAudioRecording] = useState<Audio.Recording | null>(null);
  const [isButtonDisabled, setIsButtonDisabled] = useState(false);
  
  const cameraRef = useRef<CameraView>(null);
  const videoRef = useRef<Video | null>(null); 

  useEffect(() => { // this resets state when leaving the screen (not unmounting like useFocusEffect)
    console.log("New word selected. Resetting state.");
    setIsRecording(false);
    setAudioRecording(null);
    setAudioUri(null);
    setVideoUri(null);
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

  // Play the audio
  const playAudio = async () => {
    if (audioUri) {
      const { sound } = await Audio.Sound.createAsync(
        { uri: audioUri },
        { shouldPlay: true }
      );
      await sound.playAsync();
    }
  };


  const toggleRecording = async () => {
    if (isButtonDisabled) return; // preventing spam clicks that cause errors by temporarily disabling 
    setIsButtonDisabled(true);

    try {
      if (isRecording) {
        setIsRecording(false);
        if (audioRecording) {
          await audioRecording.stopAndUnloadAsync();
          const uri = audioRecording.getURI();
          if (uri) {
            setAudioUri(uri);
            console.log("Recording saved at:", uri);
          }
          setAudioRecording(null);
        }
      } else {
        if (audioRecording) {
          console.warn("Cleaning up previous recording...");
          await audioRecording.stopAndUnloadAsync();
          setAudioRecording(null);
        }

        setIsRecording(true);

        const { status } = await Audio.requestPermissionsAsync();
        if (status !== 'granted') {
          console.error("Permission to record audio denied");
          return;
        }

        const recording = new Audio.Recording();
        await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
        await recording.startAsync();
        setAudioRecording(recording);
      }
    } catch (error) {
      console.error("Error during recording:", error);
      setIsRecording(false);
    }
  
    // enable button after a short delay
    setTimeout(() => setIsButtonDisabled(false), 1);
  }
  
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
            ref={(ref) => (videoRef.current = ref)} 
            source={{ uri: videoUri }}
            style={styles.thumbnail}
            resizeMode={ResizeMode.COVER}
            shouldPlay={false}
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
          //onPress={sendAudioToBackend}> below sends 0 for score and "" for feedback by default atm
          onPress={() => navigateTo("Feedback", { wordSet: wordSet, currentIndex: currentIndex, attemptNumber: attemptNumber, score: score, feedback: feedback } )}> 
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

