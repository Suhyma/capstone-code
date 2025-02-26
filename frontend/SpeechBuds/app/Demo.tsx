import React, { useRef, useState } from "react";
import { View, Text, StyleSheet, Dimensions, TouchableOpacity } from "react-native";
import { Video, ResizeMode } from "expo-av";
import { Link } from "expo-router";
import { useNavigate } from "./hooks/useNavigate";
import { useRoute } from "@react-navigation/native";

// Get screen width and height for responsiveness
const { width, height } = Dimensions.get("window");

const DemoScreen = () => {
  const { navigateTo } = useNavigate();
  const route = useRoute();
  const { exerciseType, word } = route.params as { exerciseType: string; word: string };
  const attempt = 0; // TODO: RETRIEVE THE ATTEMPT NO. FROM THE STATUS OR SOMEWHERE EVENTUALLY, max. 3 attempts for recording


  const video = useRef<Video>(null);
  const [status, setStatus] = useState<any>(null);

  return (
    <View style={styles.container}>
      {/* Brown Card (80% of Screen) */}
      <View style={styles.card}>
        {/* Header with Exit Button */}
        <View style={styles.header}>
          <Text style={styles.title}>{word}</Text>
          <Link href="/ChildHomeScreen" style={styles.exitButton}>
            <Text style={styles.exitButtonText}>Exit</Text>
          </Link>
        </View>

        {/* Video Container (Fixed Aspect Ratio & Scaling) */}
        <View style={styles.videoContainer}>
          <Video
            ref={video}
            style={styles.video}
            source={require("../assets/images/Test.mp4")} // use "word" param to identify which video to use
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
        {/* <Link href="/Record" style={styles.startButton}>
          <Text style={styles.startButtonText}>Start Exercise</Text>
        </Link> */}

        <TouchableOpacity
          style={styles.startButton}
          onPress={() => navigateTo("Record",  { word: word, attemptNumber: attempt})}
        >
          <Text style={styles.startButtonText}>Start Exercise</Text>
        </TouchableOpacity>

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
    width: width * 0.8, // Responsive width
    height: height * 0.8, // Responsive height
    backgroundColor: "#D1A878", // Light brown background
    //padding: 100,
    borderRadius: 10,
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
    marginTop: 10,
    marginRight: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#432818",
    textAlign: "center",
    flex: 1, // Pushes exit button to the right
    marginBottom: 15,
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
    flex: 1, // Allows video to take remaining space
    //width: "100%", // Ensures video container is full width
    //height: "60%",
    justifyContent: "center",
    alignItems: "center",
  },
  video: {
    //width: "100%", // Ensures video scales properly
    height: "100%", // Ensures video scales properly
    aspectRatio: 16 / 9, // ✅ Maintains correct video aspect ratio
    alignSelf: "stretch",
    resizeMode: "contain",
    overflow: "visible",
    marginRight: 50,
    marginLeft: 50,
    
  },
  startButton: {
    backgroundColor: "#5A3E1B",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
    marginBottom: 20, // Adds spacing from bottom
    marginTop: 15,
  },
  startButtonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  },
});

export default DemoScreen;
