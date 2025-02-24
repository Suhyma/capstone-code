import React, { useRef, useState } from "react";
import { View, Text, StyleSheet, Dimensions } from "react-native";
import { Video, ResizeMode } from "expo-av";
import { Link } from "expo-router";

// Get screen width and height for responsiveness
const { width, height } = Dimensions.get("window");

const RightScreen = () => {
  const video = useRef<Video>(null);
  const [status, setStatus] = useState<any>(null);

  return (
    <View style={styles.container}>
      {/* Brown Card (80% of Screen) */}
      <View style={styles.card}>
        {/* Header with Exit Button */}
        <View style={styles.header}>
          <Text style={styles.title}>Right</Text>
          <Link href="/ChildHomeScreen" style={styles.exitButton}>
            <Text style={styles.exitButtonText}>Exit</Text>
          </Link>
        </View>

        {/* Video Container (Fixed Aspect Ratio & Scaling) */}
        <View style={styles.videoContainer}>
          <Video
            ref={video}
            style={styles.video}
            source={require("../assets/images/Test.mp4")}
            useNativeControls
            resizeMode={ResizeMode.CONTAIN} // ✅ Corrected Type Issue
            shouldPlay
            onPlaybackStatusUpdate={(status) => {
              if (status.isLoaded) {
                setStatus(status);
              }
            }}
          />
        </View>

        {/* Start Exercise Button */}
        <Link href="/ExerciseScreen2" style={styles.startButton}>
          <Text style={styles.startButtonText}>Start Exercise</Text>
        </Link>
      </View>
    </View>
  );
};

// 🎨 Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#A4D65E", // Green background
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    width: "80%", // Responsive width
    height: "80%", // Responsive height
    backgroundColor: "#D1A878", // Light brown background
    //padding: 20,
    //borderRadius: 10,
    borderWidth: 2,
    borderColor: "#5A3E1B", // Dark brown border
    alignItems: "center",
    //justifyContent: "space-between",
    justifyContent: "center",
  },
  header: {
    flexDirection: "row",
    width: "100%",
    justifyContent: "space-between", // Exit button on the right
    alignItems: "center",
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#432818",
    textAlign: "center",
    flex: 1, // Pushes exit button to the right
  },
  exitButton: {
    backgroundColor: "#5A3E1B",
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 5,
  },
  exitButtonText: {
    color: "white",
    fontWeight: "bold",
  },
  videoContainer: {
    //flex: 1, // Allows video to take remaining space
    width: "80%", // Ensures video container is full width
    height: "60%",
    justifyContent: "center",
    alignItems: "center",
  },
  video: {
    width: "100%", // Ensures video scales properly
    height: "100%", // Ensures video scales properly
    //aspectRatio: 16 / 9, // ✅ Maintains correct video aspect ratio
    //alignSelf: "stretch",
    resizeMode: "contain",
  },
  startButton: {
    backgroundColor: "#5A3E1B",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
    marginBottom: 20, // Adds spacing from bottom
  },
  startButtonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  },
});

export default RightScreen;
