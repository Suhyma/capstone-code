import React, { useRef, useState } from "react";
import { View, Text, StyleSheet, Dimensions, TouchableOpacity } from "react-native";
import { Video, ResizeMode } from "expo-av";
import { useNavigate } from "./hooks/useNavigate";
import { useRoute } from "@react-navigation/native";

// Get screen width and height for responsiveness
const { width, height } = Dimensions.get("window");

const DemoScreen = () => {
  const { navigateTo } = useNavigate();
  const route = useRoute();
  
  const { wordSet, currentIndex } = route.params as { wordSet: string[], currentIndex: number };
  const currentWord = wordSet[currentIndex]
  const attempt = 0;

  const videoRef = useRef<Video>(null);

  // 🎥 Video Mapping
  const videoMapping: { [key: string]: any } = {
    Summer: require("../assets/images/Summer.mp4"),
    //Stain: require("../assets/images/Stain.mp4"),
    //Silly: require("../assets/images/Silly.mp4"),
    //Sock: require("../assets/images/Sock.mp4"),
    //Say: require("../assets/images/Say.mp4"),
    Carrot: require("../assets/images/Carrot.mp4"),
    //Berry: require("../assets/images/Berry.mp4"),
    //Corn: require("../assets/images/Corn.mp4"),
    //Arrow: require("../assets/images/Arrow.mp4"),
    //Parent: require("../assets/images/Parent.mp4"),
  };

  // Select video based on `word`, default to a placeholder
  const selectedVideo = videoMapping[currentWord] || require("../assets/images/default.mp4");

  return (
    <View style={styles.container}>
      <View style={styles.brownContainer}>
        {/* Header with Exercise Word and Exit Button */}
        <View style={styles.header}>
          <Text style={styles.title}>Let's say the word: {currentWord}</Text>
          <TouchableOpacity
            style={styles.exitButton}
            onPress={() => navigateTo("ChildHomeScreen")}
          >
            <Text style={styles.exitButtonText}>Exit</Text>
          </TouchableOpacity>
        </View>

        {/* Video Container */}
        <View style={styles.videoContainer}>
          <Video
            ref={videoRef}
            source={selectedVideo} // 🎥 Dynamically update video source
            useNativeControls
            resizeMode={ResizeMode.COVER}
            shouldPlay
            style={styles.video}
          />
        </View>

        {/* Start Exercise Button */}
        <TouchableOpacity
          style={styles.startButton}
          onPress={() => navigateTo("Record", { wordSet: wordSet, currentIndex: currentIndex, attemptNumber: attempt })}
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
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    padding: 50,
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
  videoContainer: {
    flex: 2,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    position: "absolute",
    top: 50,
    left: 90,
  },
  video: {
    flex: 2,
    width: "100%",
    height: "100%",
    overflow: "visible",
  },
  startButton: {
    backgroundColor: "#5A3E1B",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
    position: "absolute",
    top: 550,
  },
  startButtonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  },
});
export default DemoScreen;