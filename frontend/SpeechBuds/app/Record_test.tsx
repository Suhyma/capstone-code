import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Modal,
  Switch,
} from "react-native";
import { Camera, CameraType } from "expo-camera";
import { Video, AVPlaybackStatus } from "expo-av";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";

const ExerciseScreen = () => {
  const navigation = useNavigation();
  const [cameraPermission, setCameraPermission] = useState<boolean | null>(
    null
  );
  const [recording, setRecording] = useState(false);
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [showDemo, setShowDemo] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSwitchOn, setIsSwitchOn] = useState(false);
  const cameraRef = useRef<Camera | null>(null);
  const videoRef = useRef<Video | null>(null);

  // Request Camera Permission
  React.useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setCameraPermission(status === "granted");
    })();
  }, []);

  if (cameraPermission === null) {
    return <View />;
  }
  if (cameraPermission === false) {
    return <Text>No access to camera</Text>;
  }

  // Start or Stop Recording
  const handleRecord = async () => {
    if (!cameraRef.current) return;

    if (recording) {
      cameraRef.current.stopRecording();
      setRecording(false);
    } else {
      setRecording(true);
      const video = await cameraRef.current.recordAsync();
      setVideoUri(video.uri);
      setRecording(false);
    }
  };

  // Play Video
  const handlePlayVideo = async () => {
    if (videoRef.current) {
      const status = await videoRef.current.getStatusAsync();
      if (status.isLoaded) {
        if (status.isPlaying) {
          videoRef.current.pauseAsync();
        } else {
          videoRef.current.playAsync();
        }
        setIsPlaying(!isPlaying);
      }
    }
  };

  // Toggle Switch
  const handleToggleSwitch = () => {
    setIsSwitchOn(!isSwitchOn);
  };

  return (
    <View style={styles.container}>
      {/* Help Button */}
      <TouchableOpacity
        style={styles.helpButton}
        onPress={() => setShowDemo(true)}
      >
        <Ionicons name="help-circle-outline" size={30} color="black" />
      </TouchableOpacity>

      {/* Demo Video Modal */}
      <Modal visible={showDemo} transparent={true} animationType="slide">
        <View style={styles.modalContainer}>
          <Video
            source={{ uri: "https://www.example.com/demo.mp4" }} // Replace with actual video URL
            style={styles.demoVideo}
            useNativeControls
            resizeMode="contain"
          />
          <TouchableOpacity
            style={styles.closeModal}
            onPress={() => setShowDemo(false)}
          >
            <Ionicons name="close" size={30} color="white" />
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Camera View */}
      <View style={styles.cameraContainer}>
        <Camera ref={cameraRef} style={styles.camera} type={CameraType.front} />
        <Text style={styles.title}>Right</Text>

        {/* Close Button */}
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => navigation.navigate("ChildHomeScreen")}
        >
          <Ionicons name="close" size={30} color="black" />
        </TouchableOpacity>
      </View>

      {/* Recording & Playback Controls */}
      <View style={styles.controls}>
        {/* Record Button */}
        <TouchableOpacity
          style={styles.recordButton}
          onPress={handleRecord}
        >
          <Ionicons
            name={recording ? "stop-circle" : "radio-button-on"}
            size={40}
            color="red"
          />
        </TouchableOpacity>

        {/* Video Thumbnail */}
        {videoUri && (
          <Video
            ref={videoRef}
            source={{ uri: videoUri }}
            style={styles.videoThumbnail}
            useNativeControls
            resizeMode="cover"
          />
        )}

        {/* Play Button */}
        <TouchableOpacity style={styles.playButton} onPress={handlePlayVideo}>
          <Ionicons name="play-circle" size={40} color="black" />
        </TouchableOpacity>

        {/* Toggle Switch */}
        <Switch value={isSwitchOn} onValueChange={handleToggleSwitch} />
      </View>

      {/* Get Feedback Button */}
      <TouchableOpacity style={styles.feedbackButton}>
        <Text style={styles.feedbackText}>get feedback</Text>
      </TouchableOpacity>
    </View>
  );
};

export default ExerciseScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#A4D65E", // Light green background
    alignItems: "center",
    justifyContent: "center",
  },
  cameraContainer: {
    width: "80%",
    aspectRatio: 1,
    borderWidth: 3,
    borderColor: "#5A3E1B",
    borderRadius: 10,
    overflow: "hidden",
    position: "relative",
  },
  camera: {
    flex: 1,
  },
  title: {
    position: "absolute",
    top: 10,
    alignSelf: "center",
    fontSize: 22,
    fontWeight: "bold",
  },
  closeButton: {
    position: "absolute",
    top: 10,
    right: 10,
  },
  helpButton: {
    position: "absolute",
    top: 20,
    left: 20,
  },
  recordButton: {
    position: "absolute",
    bottom: 20,
    left: 20,
  },
  playButton: {
    position: "absolute",
    bottom: 20,
    right: 60,
  },
  videoThumbnail: {
    position: "absolute",
    bottom: 10,
    left: 80,
    width: 50,
    height: 50,
    borderRadius: 5,
  },
  feedbackButton: {
    marginTop: 20,
    backgroundColor: "#5A3E1B",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
  },
  feedbackText: {
    color: "white",
    fontWeight: "bold",
    textTransform: "uppercase",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "center",
    alignItems: "center",
  },
  demoVideo: {
    width: "90%",
    height: 300,
  },
  closeModal: {
    position: "absolute",
    top: 20,
    right: 20,
  },
});
