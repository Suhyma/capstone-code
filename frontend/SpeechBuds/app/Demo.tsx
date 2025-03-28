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

  const { wordSet, currentIndex, scoreTracking } = route.params as { wordSet: string[], currentIndex: number, scoreTracking: number[] };
  const currentWord = wordSet[currentIndex]
  const attempt = 0;

  const videoRef = useRef<Video>(null);

  const videoMapping: { [key: string]: any } = {
    Summer: "https://firebasestorage.googleapis.com/v0/b/speech-buds.firebasestorage.app/o/Cropped_Summer.MOV?alt=media&token=20ba1c01-3397-4bfd-b64b-3d007087eecd",
    Stain: "https://firebasestorage.googleapis.com/v0/b/speech-buds.firebasestorage.app/o/Stain.MOV?alt=media&token=e325012d-aa21-42fe-8b76-0469ee1f65dd",
    Silly: "https://firebasestorage.googleapis.com/v0/b/speech-buds.firebasestorage.app/o/Silly.MOV?alt=media&token=163b56cc-f788-433d-9bc2-4dd3ddcf5bf8",
    Sock: "https://firebasestorage.googleapis.com/v0/b/speech-buds.firebasestorage.app/o/Sock.MOV?alt=media&token=48303891-f5a9-46f8-ba10-2e1dd171eae9",
    Say: "https://firebasestorage.googleapis.com/v0/b/speech-buds.firebasestorage.app/o/Say.MOV?alt=media&token=a96ae207-5a7f-4f4a-9c71-5d05ec9d6eee",
    Carrot: "https://firebasestorage.googleapis.com/v0/b/speech-buds.firebasestorage.app/o/Cropped_Carrot.mov?alt=media&token=27bb2bc7-a5b1-4492-a106-1b4df94d2813",
    Berry: "https://firebasestorage.googleapis.com/v0/b/speech-buds.firebasestorage.app/o/Berry.MOV?alt=media&token=3abaccc9-05aa-4ae4-8080-370cd26fe444",
    Arrow: "https://firebasestorage.googleapis.com/v0/b/speech-buds.firebasestorage.app/o/Arrow.MOV?alt=media&token=403842dd-34f9-4f93-b1c4-4b6190a8d185",
    Cherry: "https://firebasestorage.googleapis.com/v0/b/speech-buds.firebasestorage.app/o/Cherry.MOV?alt=media&token=6faf5a8a-02a5-4a71-a74b-becc4495ed19",
    Parent: "https://firebasestorage.googleapis.com/v0/b/speech-buds.firebasestorage.app/o/Parent.MOV?alt=media&token=127a99a9-f690-4236-b7a9-a2238abda7c5"
  }

  useEffect(() => {
    // preloading the video beforehand to try and reduce load time
    const preloadVideo = async (uri: string) => {
      if (videoRef.current) {
        try {
          await videoRef.current.loadAsync(
            { uri },
            { shouldPlay: true },
          );
          console.log("Video preloaded");
        } catch (error) {
          console.error("Error preloading video:", error);
        }
      }
    };
  
    preloadVideo(videoMapping[currentWord]);
    
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

  const progressWidth = ((currentIndex + 1) * (screenWidth/5));

  const handlePlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (!status.isLoaded) {
      return;
    }
    if (status.didJustFinish) {
      videoRef.current?.setPositionAsync(0); // reset position to start of vid
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
          {/* <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigateTo("Demo", { wordSet: wordSet, currentIndex: currentIndex - 1, scoreTracking: scoreTracking })}
          > */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              if (currentIndex === 0) {
                navigateTo("ChildHomeScreen"); // navigate to the child home screen if currentIndex is 0
              } else {
                navigateTo("Demo", {
                  wordSet: wordSet,
                  currentIndex: currentIndex - 1, // else navigate to the previous word
                  scoreTracking: scoreTracking,
                });
              }
            }}>
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
            onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
            onError={(error) => console.log("Error loading video:", error)}
          />
        </View>

        {/* Start Exercise Button */}
        <TouchableOpacity
          style={styles.startButton}
          // onPress={() => navigateTo("Record_CV", { wordSet: wordSet, currentIndex: currentIndex, attemptNumber: attempt })}
          onPress={() => navigateTo("Record_CV", { wordSet: wordSet, currentIndex: currentIndex, attemptNumber: attempt, scoreTracking: scoreTracking })}
        >
          <Text style={styles.startButtonText}>Start</Text>
        </TouchableOpacity>

        {/* <View style={styles.startButton}>
          <Link href="/ExerciseScreen-React-Cam" style={styles.button}>
            React cam CV test
          </Link>
        </View>
        
        <View style={styles.startButton}>
          <Link href="/Test_CV" style={styles.button}>
            test cv
          </Link>
        </View> */}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#A4D65E", // Green background
    justifyContent: "center",
    alignItems: "center",
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
    height: screenHeight * 0.6,
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
  videoContainer: {
    width: screenWidth * 0.8,
    height: screenHeight * 0.7,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#684503',
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },
  video: {
    width: screenWidth * 0.8,
    height: screenHeight * 0.7,
  },
  startButton: {
    backgroundColor: "#5A3E1B",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
    position: "absolute",
    top: 950, // for ipad
    // top: 60 // for suhyma phone
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