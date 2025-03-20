import React, { useEffect, useRef, useState } from "react";
import { View, Text, Image, StyleSheet, TouchableOpacity, Dimensions } from "react-native";
import { ActivityIndicator } from "react-native-paper";
import { useNavigate } from "./hooks/useNavigate";
import { useRoute } from "@react-navigation/native";
import { AVPlaybackStatus, ResizeMode, Video } from "expo-av";

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const FeedbackScreen = () => {
  const { navigateTo } = useNavigate();
  const route = useRoute();
  const { wordSet, currentIndex, attemptNumber, feedback, score, scoreTracking } = route.params as { wordSet: string[], currentIndex: number, attemptNumber: number, feedback: string, score: number, scoreTracking: number[]};

  const [screenWidth, setScreenWidth] = useState(Dimensions.get("window").width);
  const [screenHeight, setScreenHeight] = useState(Dimensions.get("window").height);
  const [isPortrait, setIsPortrait] = useState(screenHeight > screenWidth);
  const [loading, setLoading] = useState(true);
  
  const [isExerciseComplete, setIsExerciseComplete] = useState(false)
  const isLastWord = currentIndex >= wordSet.length - 1;

  const videoRef = useRef<Video>(null);

  const videoMapping: { [key: string]: string } = {
    Generic_S: "https://firebasestorage.googleapis.com/v0/b/speech-buds.firebasestorage.app/o/Generic%20S%20Feedback.MOV?alt=media&token=4bc47151-e8a0-4733-b216-332970201386", // generic S
    "Bring your tongue far enough": "https://firebasestorage.googleapis.com/v0/b/speech-buds.firebasestorage.app/o/Th%20to%20S%20Feedback.MOV?alt=media&token=95726d03-9946-46b7-b15f-7d25bc4d3333", // Th to S
    "Try to keep your lips": "https://firebasestorage.googleapis.com/v0/b/speech-buds.firebasestorage.app/o/Sh%20to%20S%20Feedback.MOV?alt=media&token=dce11cca-b940-4af3-bc31-1e1a8eac1a7e", // Sh to S
    "Touch your throat while you": "https://firebasestorage.googleapis.com/v0/b/speech-buds.firebasestorage.app/o/Z%20to%20S%20Feedback.MOV?alt=media&token=2a4f9359-4bea-4a48-8c3b-6b7485e33446", // Z to S
    Generic_R: "https://firebasestorage.googleapis.com/v0/b/speech-buds.firebasestorage.app/o/Generic%20R%20Feedback.MOV?alt=media&token=1d2d4691-2151-4494-8f4d-46448bb0b062", // generic R
    "Try starting with closed lips": "https://firebasestorage.googleapis.com/v0/b/speech-buds.firebasestorage.app/o/W%20to%20R%20Feedback.MOV?alt=media&token=a4498b8d-e212-4069-a7ce-f8ebba1e0602", // W to R
    "Try lowering the tip of": "https://firebasestorage.googleapis.com/v0/b/speech-buds.firebasestorage.app/o/L%20to%20R%20Feedback.MOV?alt=media&token=f724eba2-73d6-44d3-ad6e-2ef09f6db362", // L to R
    "Focus on keeping your tongue": "https://firebasestorage.googleapis.com/v0/b/speech-buds.firebasestorage.app/o/D%20to%20R%20Feedback.MOV?alt=media&token=5b7555f9-66c8-44a8-904f-13f11b379dbb", // D to R
    Way_To_Go: "https://firebasestorage.googleapis.com/v0/b/speech-buds.firebasestorage.app/o/way2go.MOV?alt=media&token=d3a38151-500e-486b-aee6-35f342be37eb" // Way to go!
  }

  const getFeedbackType = (feedback: string) => {
    // no feedback needed
    if (feedback == "") {
      return videoMapping["Way_To_Go"];
    }

    // // generic feedbacks
    // if (feedback.startsWith("No specific feedback for correcting")) {
    //   if (wordSet[0] == "Summer"){
    //     return videoMapping["Generic_S"];
    //   } 
    //   else {
    //     return videoMapping["Generic_R"];
    //   }
    // }

    // specific feedbacks
    
    // const feedbackWithoutPrefix = feedback.replace(/^To improve the sound: /, "").trim(); 
    // const firstFewWords = feedbackWithoutPrefix.split(" ").slice(0, 5).join(" "); 
    // return videoMapping[firstFewWords]

    // Default fallback
    if (wordSet[0] == "Summer"){
      return videoMapping["Generic_S"];
    } 
    else {
      return videoMapping["Generic_R"];
    }
  };

  const calculateFinalScore = (allScores: number[]) =>  {
    const sum = allScores.reduce((acc, score) => acc + score, 0);
    const finalScore = sum / allScores.length;
    console.log("FINAL OVERALL SCORE: " + finalScore);
    return finalScore;
  }

  const handleNextWord = () => {
    if (isLastWord) {
      setIsExerciseComplete(true);
      const finalScore = calculateFinalScore(scoreTracking);
      console.log(scoreTracking)
      navigateTo("CompletionScreen", { overallScore: finalScore, seedsCollected: Math.ceil(finalScore / 10) });  // placeholder values until backend is fully connected
    } else {
      navigateTo("Demo", { wordSet: wordSet, currentIndex: currentIndex + 1, scoreTracking: scoreTracking});
    }
  };

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
  }, []);

  const progressWidth = ((currentIndex + 1) * (screenWidth/5));

  const handlePlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (!status.isLoaded) {
      return;
    }
    if (status.didJustFinish) {
      videoRef.current?.setPositionAsync(0); // reset position to start of vid
    }
    // TODO: add video thumbnail so it's not just a black screen
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
          {/* Title */}
          <Text style={styles.title}>Your feedback</Text>
        </View>
        
        {/* Feedback Video Container */}
        <View style={styles.videoContainer}>
          {/* add a loading animation as video loads */}
          {loading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color= "#A4D65E" />
              <Text style={styles.loadingText}>Loading Video...</Text>
            </View>
          )}
          <Video
            ref={videoRef}
            source={{ uri: getFeedbackType(feedback) }} // specify the video based on the feedback returned
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
          
        {/* Feedback Text */}
        <Text style={styles.text}>
            {`Your score for the word ${wordSet[currentIndex]} is: ${score}`}
        </Text>
        <Text style={styles.feedbackText}>
          {feedback}
        </Text>


        {/* Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => navigateTo("Record_CV", { wordSet: wordSet, currentIndex: currentIndex, attemptNumber: attemptNumber, scoreTracking: scoreTracking })}
          >
            <Text style={styles.retryText}>Retry Word</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.nextButton}
            onPress={handleNextWord}
          >
            <Text style={styles.nextText}>{isLastWord ? "Finish Exercise" : "Next Word"}</Text>
          </TouchableOpacity>
        </View>
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
    // padding: 20,
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
  videoContainer: {
    width: screenWidth * 0.8,
    height: screenHeight * 0.6,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#684503',
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },
  video: {
    width: screenWidth * 0.8,
    height: screenHeight * 0.6,
  },
  card: {
    backgroundColor: "#CDA879", // Brown card background
    padding: 20,
    borderRadius: 12,
    alignItems: "center",
    width: "90%",
    maxWidth: 400,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  carrotIcon: {
    width: 50,
    height: 50,
    position: "absolute",
    top: -25,
    left: 15,
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
    fontSize: 22,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 10,
    color: "#3B2E1E",
  },
  text: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#3B2E1E",
    marginTop: 40
  },
  faceImage: {
    width: 150,
    height: 150,
    borderRadius: 10,
    backgroundColor: "white",
    marginBottom: 15,
  },
  feedbackText: {
    fontSize: 16,
    textAlign: "center",
    color: "#3B2E1E",
    marginBottom: 10,
    paddingHorizontal: 20,
  },
  tipText: {
    fontSize: 14,
    textAlign: "center",
    color: "#3B2E1E",
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  boldText: {
    fontWeight: "bold",
  },
  buttonContainer: {
    flexDirection: "row",
    marginTop: 70,
    // top: -400, // just to test on suhymas phone
    gap: 15,
  },
  retryButton: {
    // flex: 1,
    paddingHorizontal: 20,
    backgroundColor: "white",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    minWidth: screenWidth * 0.3,
  },
  nextButton: {
    // flex: 1,
    paddingHorizontal: 18,
    backgroundColor: "#5C3B1E",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    minWidth: screenWidth * 0.3,
  },
  retryText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#3B2E1E",
  },
  nextText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "white",
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

export default FeedbackScreen;
