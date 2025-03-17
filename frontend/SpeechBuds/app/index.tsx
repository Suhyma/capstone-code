import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  SafeAreaView,
} from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import { useNavigation } from "@react-navigation/native";
import { StackParamList } from "./types";
import { useRoute } from "@react-navigation/native";

type NavigationProp = StackNavigationProp<StackParamList, "Index">;

// Get screen width and height for responsiveness
const { width, height } = Dimensions.get("window");

export default function Index() {
  const navigation = useNavigation<NavigationProp>();

  return (
    <SafeAreaView style={styles.container}>
      {/* Green Background */}
      <View style={styles.background}>
        {/* Brown Rectangle */}
        <View style={styles.rectangle}>
          {/* "Speech Buds" Text */}
          <Text style={styles.title}>SPEECH BUDS</Text>

          {/* Background Images */}
          <Image source={require("@/assets/images/Flower.png")} style={styles.flower} />
          <Image source={require("@/assets/images/Corn.png")} style={styles.corn} />
          <Image source={require("@/assets/images/Strawberry.png")} style={styles.strawberry} />

          {/* Buttons */}
          <View style={styles.buttonContainer}>
            {/* <TouchableOpacity style={styles.button} onPress={() => navigation.navigate("ChildHomeScreen")}> */}
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
    width: width * 0.9,
    maxWidth: 400,
    height: height * 0.7, // Scales better on small screens
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
    top: height * 0.02,
    left: width * 0.05,
    width: width * 0.2,
    height: height * 0.15,
    resizeMode: "contain",
  },
  corn: {
    position: "absolute",
    top: height * 0.15,
    right: width * 0.05,
    width: width * 0.15,
    height: height * 0.12,
    resizeMode: "contain",
  },
  strawberry: {
    position: "absolute",
    bottom: height * 0.05,
    width: width * 0.18,
    height: height * 0.12,
    resizeMode: "contain",
  },
  title: {
    fontSize: width * 0.1,
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
    fontSize: width * 0.05,
    fontWeight: "bold",
    color: "#000", // Black text
  },
});

