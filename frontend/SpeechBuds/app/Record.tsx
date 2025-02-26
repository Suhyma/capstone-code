import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { useRef, useState } from 'react';
import { Button, StyleSheet, Text, TouchableOpacity, View, Dimensions, Image } from 'react-native';
import { Link } from 'expo-router';
import { Video, ResizeMode } from 'expo-av';  // ✅ Import ResizeMode
import { useRoute } from '@react-navigation/native';
import { useNavigate } from './hooks/useNavigate';

const { width, height } = Dimensions.get('window');

export default function Record() {
  const { navigateTo } = useNavigate();
  const route = useRoute();
  const { word, attempt } = route.params as { word: string, attempt: number};;  
  const score = 0; // placeholder before backend scoring is connected

  const [facing, setFacing] = useState<CameraType>('front');
  const [permission, requestPermission] = useCameraPermissions();
  const [isRecording, setIsRecording] = useState(false);
  const [videoUri, setVideoUri] = useState<string | null>(null);
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
        //setVideoUri(video.uri);
      } catch (error) {
        console.error("Error recording video:", error);
      } finally {
        setIsRecording(false);
      }
    }
  }

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
          onPress={() => navigateTo("Feedback", { word: word, attemptNumber: attempt, score: score })}
          //random comment for Sandra
        >
          <Text style={styles.text}>Get Feedback</Text>
          
        </TouchableOpacity>

        {/* <Link href="/Feedback" style={styles.button}>
          <Text style={styles.text}>Get Feedback</Text>
        </Link> */}
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
    //padding: 200,
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

