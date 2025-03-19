import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, Dimensions, TouchableOpacity } from "react-native";
import { Video, ResizeMode, AVPlaybackStatus } from "expo-av";
import { useNavigate } from "./hooks/useNavigate";
import { useRoute } from "@react-navigation/native";
import { ActivityIndicator } from "react-native-paper";

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const DemoScreen = () => {
  const { navigateTo } = useNavigate();
  const route = useRoute();
  
  const [screenWidth, setScreenWidth] = useState(Dimensions.get("window").width);
  const [screenHeight, setScreenHeight] = useState(Dimensions.get("window").height);
  const [isPortrait, setIsPortrait] = useState(screenHeight > screenWidth);
  const [loading, setLoading] = useState(true);

  const { wordSet, currentIndex } = route.params as { wordSet: string[], currentIndex: number };
  const currentWord = wordSet[currentIndex]
  const attempt = 0;

  const videoRef = useRef<Video>(null);

    // 🎥 Video Mapping
  const videoMapping: { [key: string]: any } = {
    Summer: "https://firebasestorage.googleapis.com/v0/b/speech-buds.firebasestorage.app/o/Summer.mp4?alt=media&token=b537e7ed-ced2-4819-b8b5-96efce589748",
    // Summer: require("assets/images/Summer.mp4"),
    Carrot: "https://firebasestorage.googleapis.com/v0/b/speech-buds.firebasestorage.app/o/484258902_9332589840167314_759553405236316434_n.mp4?alt=media&token=6f18fe5c-810b-4aa5-a01d-1ee29e832937",
  }

  useEffect(() => {
    // preloading the video beforehand to try and reduce load time
    // const preloadVideo = async (uri: string) => {
    //   const video = new Video();
    //   await video.loadAsync({ uri }, {}, false); 
    //   console.log("Video preloaded");
    // };

    // preloadVideo(videoMapping[currentWord])
    
    // checking screen dimensions
    const updateDimensions = () => {
      const newWidth = Dimensions.get("window").width;
      const newHeight = Dimensions.get("window").height;
      setScreenWidth(newWidth);
      setScreenHeight(newHeight);
      setIsPortrait(newHeight > newWidth);
    };

    // check for changes in dimensions
    updateDimensions();
      const subscription = Dimensions.addEventListener("change", updateDimensions);
      return () => subscription.remove();
      
  }, []);

  // Select video based on `word`, default to a placeholder
  const selectedVideo = videoMapping[currentWord] || "https://drive.google.com/uc?export=download&id=1_IZfzWCWZ8iz5X-bYHFdTWWYHR1r8rdu";
  const progressWidth = ((currentIndex + 1) * (screenWidth/5));

  const handleReplay = async () => {
    if (videoRef.current) {
      await videoRef.current.stopAsync();
      await videoRef.current.playAsync();
    }
  };
  
  return (
    <View style={styles.container}>
       {/* Progress Bar */}
      <View style={styles.progressBarContainer}>
        <View style={[styles.progressBar, { width: progressWidth }]} />
      </View>

      <View style={styles.brownContainer}>
        {/* Header with Exercise Word and Exit Button */}
        <View style={styles.header}>
          <Text style={styles.title}>Let's say the word: {currentWord}</Text>
          
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
            onPress={() => navigateTo("ChildHomeScreen")}
          >
            <Text style={styles.exitButtonText}>Back</Text>
          </TouchableOpacity>
        </View>

        {/* Video Container */}
        <View style={styles.videoContainer}>
          {/* add a loading animation as demo video loads */}
          {loading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color= "#A4D65E" />
              <Text style={styles.loadingText}>Loading Video...</Text>
            </View>
          )}
          <Video
            ref={videoRef}
            source={{ uri: videoMapping[currentWord] }}
            useNativeControls
            resizeMode={ResizeMode.COVER}
            shouldPlay
            style={styles.video}
            // usePoster={true}
            onLoadStart={() => setLoading(true)} 
            onReadyForDisplay={() => setLoading(false)}
            onError={(error) => console.log("Error loading video:", error)}
          />
        </View>

        {/* Start Exercise Button */}
        <TouchableOpacity
          style={styles.startButton}
          // onPress={() => navigateTo("Record_CV", { wordSet: wordSet, currentIndex: currentIndex, attemptNumber: attempt })}
          onPress={() => navigateTo("Record", { wordSet: wordSet, currentIndex: currentIndex, attemptNumber: attempt })}
        >
          <Text style={styles.startButtonText}>Start</Text>
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
    // flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    // padding: 50,
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
  brownContainer: {
    flex: 1,
    width: screenWidth * 0.9,
    height: screenHeight * 0.9,
    // flexDirection: "column",
    // justifyContent: "center",
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
    // flexDirection: "row",
    // justifyContent: "space-between",
    alignItems: "center",
    // paddingHorizontal: 20,
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
  backButton: {
    position: "absolute",
    top: 10,
    left: 15, 
    backgroundColor: "#5A3E1B",
    borderRadius: 5,
    padding: 5,
  },
  // videoContainer: {
  //   flex: 2,
  //   // flexDirection: "row",
  //   justifyContent: "center",
  //   alignItems: "center",
  //   // position: "absolute",
  //   // top: 50,
  //   left: 90,
  // },
  videoContainer: {
    width: screenWidth * 0.8,
    height: screenHeight * 0.5,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#684503',
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },
  video: {
    width: screenWidth * 0.8,
    height: screenHeight * 0.5,
  },
  startButton: {
    backgroundColor: "#5A3E1B",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
    position: "absolute",
    top: 580,
  },
  startButtonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  },
  loadingContainer: {
    position: "absolute",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    fontWeight: "bold",
    color: "#432818"
  },
});
export default DemoScreen;