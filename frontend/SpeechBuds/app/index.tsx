import {View, Text, StyleSheet, TouchableOpacity, Image, Dimensions, SafeAreaView} from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import { useNavigation } from "@react-navigation/native";
import { StackParamList } from "./types";
import { useRoute } from "@react-navigation/native";
import React, { useRef, useState, useEffect } from "react";

type NavigationProp = StackNavigationProp<StackParamList, "Index">;

// Get screen width and height for responsiveness
const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function Index() {
  const navigation = useNavigation<NavigationProp>();
  const [screenWidth, setScreenWidth] = useState(Dimensions.get("window").width);
  const [screenHeight, setScreenHeight] = useState(Dimensions.get("window").height);
  const [isPortrait, setIsPortrait] = useState(screenHeight > screenWidth);

  useEffect(() => {
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

  return (
    <SafeAreaView style={styles.container}>
      {/* Green Background */}
      <View style={styles.background}>
        {/* Brown Rectangle */}
        <View style={[styles.rectangle,
            isPortrait ? { width: "80%", height: screenHeight * 0.8 } 
            : { width: screenWidth * 0.8, height: "80%" }
        ]}>
          
          {/* "Speech Buds" Text */}
          <Text style={styles.title}>SPEECH BUDS</Text>

          {/* Background Images */}
          <Image source={require("@/assets/images/Flower.png")} style={styles.flower} />
          <Image source={require("@/assets/images/Corn.png")} style={styles.corn} />
          <Image source={require("@/assets/images/Strawberry.png")} style={styles.strawberry} />

          {/* Buttons */}
          <View style={styles.buttonContainer}>
            {/* <TouchableOpacity style={styles.button} onPress={() => navigation.navigate("ChildHomeScreen")}> */}
            {/* TEMPORARY CHANGE FOR CV */}
            <TouchableOpacity style={styles.button} onPress={() => navigation.navigate("Login")}>
              <Text style={styles.buttonText}>Login</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    flex: 1,
    backgroundColor: "#96C449", // Green background
    justifyContent: "center",
    alignItems: "center",
  },
  rectangle: {
    backgroundColor: "#CDA879", // Card background
    borderWidth: 3,
    borderColor: "#684503",
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  flower: {
    position: "absolute",
    top: screenHeight * 0.02,
    left: screenWidth * 0.05,
    width: screenWidth * 0.2,
    height: screenHeight * 0.15,
    resizeMode: "contain",
  },
  corn: {
    position: "absolute",
    top: screenHeight * 0.15,
    right: screenWidth * 0.05,
    width: screenWidth * 0.15,
    height: screenHeight * 0.12,
    resizeMode: "contain",
  },
  strawberry: {
    position: "absolute",
    bottom: screenHeight * 0.05,
    width: screenWidth * 0.25,
    height: screenHeight * 0.25,
    resizeMode: "contain",
  },
  title: {
    fontSize: screenWidth * 0.1,
    fontWeight: "bold",
    color: "#000", // Black text
    textAlign: "center",
    marginBottom: 10,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 20,
    width: "60%",
  },
  button: {
    backgroundColor: "#96C449", // Green button
    borderWidth: 2,
    borderColor: "#205E0B",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonText: {
    fontSize: screenWidth * 0.05,
    fontWeight: "bold",
    color: "#000", // Black text
  },
});

