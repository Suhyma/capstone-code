import React from "react";
import { View, Text, Image, StyleSheet, TouchableOpacity } from "react-native";
import { useNavigate } from "./hooks/useNavigate";
import { useRoute } from "@react-navigation/native";

const CompletionScreen = () => {
  const { navigateTo } = useNavigate();
  const route = useRoute();
  const { overallScore, seedsCollected } = route.params as { overallScore: number, seedsCollected: number };


  return (
    
    <View style={styles.container}>
      {/* Card Container */}
      <View style={styles.card}>

        {/* Title */}
        <Text style={styles.title}>Mission complete, well done!</Text>

        {/* Image Placeholder (User Feedback) */}
        <Image source={require('../assets/images/SLP.png')} style={styles.faceImage} />

        {/* Feedback Text */}
        <Text style={styles.feedbackText}>
          Your score is {overallScore}.
        </Text>

        {/* Tip Section */}
        <Text style={styles.tipText}>
          <Text style={styles.boldText}>Tip: </Text>
          You get {seedsCollected} seeds!
        </Text>

        {/* Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => navigateTo("ChildHomeScreen")}
          >
            {/* to lead to game page eventually: */}
            <Text style={styles.retryText}>plant seeds!</Text> 
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.nextButton}
            onPress={() => navigateTo("ChildHomeScreen")}

          >
            <Text style={styles.nextText}>return home</Text>
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
    padding: 20,
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
  title: {
    fontSize: 22,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 10,
    color: "#3B2E1E",
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
    justifyContent: "space-between",
    width: "100%",
  },
  retryButton: {
    flex: 1,
    backgroundColor: "white",
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
    marginRight: 5,
  },
  nextButton: {
    flex: 1,
    backgroundColor: "#5C3B1E",
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
    marginLeft: 5,
  },
  retryText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#3B2E1E",
  },
  nextText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "white",
  },
});

export default CompletionScreen;
