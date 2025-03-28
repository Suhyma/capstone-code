// import * as React from "react";
// import { View, StyleSheet, Button } from "react-native";
// import { Video, ResizeMode, AVPlaybackStatusSuccess } from "expo-av";
// import { useEvent } from 'expo';
// import { useVideoPlayer, VideoView, VideoSource } from 'expo-video';
// import {Link} from 'expo-router';

// export default function videoScreen() {
//   const video = React.useRef<Video>(null);
//   const [status, setStatus] = React.useState<AVPlaybackStatusSuccess | null>(null);

//   return (
//     <View style={styles.contentContainer}>
      
//       <View style={styles.videoContainer}>
//         <Video
//           ref={video}
//           style={styles.video}
//           source={require("../assets/images/Test.mp4")}
//           useNativeControls
//           resizeMode={ResizeMode.CONTAIN}  // ✅ Corrected type issue
//           //isLooping
//           onPlaybackStatusUpdate={(status) => {
//             if (status.isLoaded) {
//               setStatus(status);
//             }
//           }}
//         />
//       </View>

//       <View style={styles.controlsContainer}>
//         <Link href="/ExerciseScreen2" style={styles.button}>
//           Start Exercise
//         </Link>
//       </View>

//       <View style={styles.controlsContainer}>
//         <Link href="/Static_guide" style={styles.button}>
//           Static guide
//         </Link>
//       </View>

//       <View style={styles.controlsContainer}>
//         <Link href="/ExerciseScreen-React-Cam" style={styles.button}>
//           React cam CV test
//         </Link>
//       </View>

//       <View style={styles.controlsContainer}>
//         <Link href="/Test_CV" style={styles.button}>
//           test cv
//         </Link>
//       </View>

//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   contentContainer: {
//     flex: 1,
//     //padding: 10,
//     alignItems: 'center',
//     justifyContent: 'center',
//     backgroundColor: "#88C040", // Green background

//   },
//   videoContainer: {
//     //flex: 1,
//     width: 350,  // Set a fixed width
//     height: 275, // Set a fixed height
//     //padding: 10,
//     alignItems: 'center',
//     justifyContent: 'center',
//     backgroundColor: "#D9B382", // Brown background
//     //paddingHorizontal: 50,
//   },
//   video: {
//     width: "100%",
//     height: "100%",
//     alignSelf: "stretch",
//   },
//   controlsContainer: {
//     //padding: 10,
//     marginTop: 10,
//   },
//   button: {
//     backgroundColor: '#684503', // Brown button
//     borderWidth: 2,
//     borderColor: '#684503',
//     paddingHorizontal: 16,
//     paddingVertical: 8,
//     borderRadius: 8,
//     alignItems: 'center',
//     fontSize: 16,
//     fontWeight: 'bold',
//     color: '#FFFFFF', // White text
//   },
// });
