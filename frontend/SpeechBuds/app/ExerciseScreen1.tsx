import * as React from "react";
import { View, StyleSheet, Dimensions } from "react-native";
import { Video, ResizeMode, AVPlaybackStatusSuccess } from "expo-av";
import { Link } from "expo-router";

// Get screen width for responsive sizing
const { width } = Dimensions.get("window");

export default function VideoScreen() {
  const video = React.useRef<Video>(null);
  const [status, setStatus] = React.useState<AVPlaybackStatusSuccess | null>(null);

  return (
    <View style={styles.contentContainer}>
      
      {/* Video Wrapper */}
      <View style={styles.videoContainer}>
        <Video style={styles.video}
          ref={video}
          //style={styles.video}
          source={require("../assets/images/Test.mp4")}
          useNativeControls
          //resizeMode={ResizeMode.CONTAIN} // ✅ Corrected syntax
          shouldPlay
          onPlaybackStatusUpdate={(status) => {
            if (status.isLoaded) {
              setStatus(status);
            }
          }}
        />

        {/* Button */}
        <View style={styles.controlsContainer}>
          <Link href="/ExerciseScreen2" style={styles.button}>
            Start Exercise
          </Link>
        </View>
      
      </View>
    </View>
  );
}

// Styles
const styles = StyleSheet.create({
  contentContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#88C040", // Green background
  },
  videoContainer: {
    width: width * 0.9, // ✅ Dynamic width (90% of screen)
    //width: 550,
    height: width * 0.5, // ✅ Dynamic height (Maintain aspect ratio)
    //height: 375,
    backgroundColor: "#D9B382", // Brown background
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 10,
    overflow: "hidden",
  },
  video: {
    //flex:3,
    //paddingHorizontal: 150,
    width: "100%", // ✅ Ensures full width
    height: "100%", // ✅ Ensures full height
  },
  controlsContainer: {
    marginTop: 20,
  },
  button: {
    backgroundColor: "#684503", // Brown button
    borderWidth: 2,
    borderColor: "#684503",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "bold",
    color: "#FFFFFF", // White text
  },
});
