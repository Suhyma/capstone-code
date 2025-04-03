

import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import React, { useEffect, useRef, useState } from 'react';
import { Button, StyleSheet, Text, TouchableOpacity, View, Dimensions, Image } from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { useRoute } from '@react-navigation/native';
import { useNavigate } from './hooks/useNavigate';
import { submitAudio } from '../services/api'; 
import { Audio } from 'expo-av';
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios, { AxiosResponse } from 'axios';
import * as FileSystem from 'expo-file-system';
import RNFetchBlob, { PolyfillBlob } from 'rn-fetch-blob';
import { storage, ref, uploadBytes } from '../services/firebase'
import { getDownloadURL } from 'firebase/storage';

{/*Stuff that is necessary for CV features*/}
import VideoViewComponent from './VideoViewComponent';
import { Switch } from 'react-native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function Record() {
  const { navigateTo } = useNavigate();
  const route = useRoute();
  const { wordSet, currentIndex, attemptNumber, scoreTracking, returnFromCv = false } = route.params as { wordSet: string[], currentIndex: number, attemptNumber: number, scoreTracking: number[], returnFromCv?: boolean, cvEnabled?: boolean}; 
  const currentWord = wordSet[currentIndex];
  const attempt = 0;
  const score = 0; // placeholder before backend scoring is connected
  const feedback = ""; // placeholder before backend feedback is connected

  const [facing, setFacing] = useState<CameraType>('front');
  const [permission, requestPermission] = useCameraPermissions();
  const [isRecording, setIsRecording] = useState(false);
  const [videoUri, setVideoUri] = useState<string | null>(null);

  const [screenWidth, setScreenWidth] = useState(Dimensions.get("window").width);
  const [screenHeight, setScreenHeight] = useState(Dimensions.get("window").height);
  const [isPortrait, setIsPortrait] = useState(screenHeight > screenWidth);
  
   {/*Stuff that is necessary for CV features*/}
   const [audioUri, setAudioUri] = useState<string | null>(null);
   const [audioRecording, setAudioRecording] = useState<Audio.Recording | null>(null);
   const [showComputerVision, setShowComputerVision] = useState(returnFromCv || false); // Toggle state

  const cameraRef = useRef<CameraView>(null);
  const videoRef = useRef<Video | null>(null); 

  useEffect(() => {
    // checking screen dimensions
    const updateDimensions = () => {
      const newWidth = Dimensions.get("window").width;
      const newHeight = Dimensions.get("window").height;
      setScreenWidth(newWidth);
      setScreenHeight(newHeight);
      setIsPortrait(newHeight > newWidth);
    };

    // requesting permissions for camera and mic
    const requestPermissions = async () => {
      if (permission?.granted) return; // Don't request if already granted

      console.log("Requesting camera and microphone permissions...");

      // Request camera permissions
      await requestPermission();

      // Request microphone permissions
      const { status: micStatus } = await Audio.requestPermissionsAsync();
      if (micStatus !== 'granted') {
        console.error("Microphone permission denied");
      }
    };

    requestPermissions();

    // reset state when a new word is selected
    console.log("New word selected. Resetting state.");
    setIsRecording(false);


    // check for changes in dimensions
    updateDimensions();
    const subscription = Dimensions.addEventListener("change", updateDimensions);
    return () => subscription.remove();

  }, [currentIndex]);


  // views based on permissions
  if (!permission) {
    return <View />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>We need your permission to show the camera</Text>
        <Button onPress={requestPermission} title="Grant Permission" />
      </View>
    );
  }

  async function toggleRecording() {
    if (isRecording) {
      cameraRef.current?.stopRecording();
      setIsRecording(false);
    } else {
      setIsRecording(true)
      const response = await cameraRef.current?.recordAsync({maxDuration: 20});
      setVideoUri(response!.uri);
      console.log("Video URI:", response!.uri);
    }
  }
  
  // Function to submit audio to the backend and navigate to feedback page
  const sendAudioToBackend = async () => {
    if (!videoUri) {
      console.error("No video file to submit.");
      return;
    }
  
    try {
      console.log("Uploading video to Firebase from URI:", videoUri);
  
      // Upload video to Firebase using URI directly
      const downloadUri = await uploadToFirebase(videoUri); 
  
      // Prepare the FormData with the Firebase download URL
      const formData = new FormData();
      formData.append("audio_file", downloadUri);
  
      console.log("Sending video URL to backend...");
  
      const response = await axios.post(
        "https://7cdd-72-138-72-162.ngrok-free.app/api/submit_audio/",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
  
      console.log("Response from backend:", response?.data);
  
      // track the score
      const updatedScoreTracking = [...scoreTracking];
      updatedScoreTracking[currentIndex] = response?.data?.score || 0; // add current score to the total scores in exercise

      navigateTo("Feedback", {
        wordSet,
        currentIndex,
        attemptNumber,
        score: response?.data?.score || 0,
        feedback: response?.data?.feedback || "",
        scoreTracking: scoreTracking
      });
    } catch (error) {
      console.error("Error submitting video:", error);
    }
  };
  
  // Helper function to upload file to Firebase Storage
  const uploadToFirebase = async (fileUri: string) => {
    const fileName = `${Date.now()}.mov`;
    const fileRef = ref(storage, `audio_files/${fileName}`);
    
    // Convert the video into a blob using Expo's FileSystem
    const response = await fetch(fileUri);
    const blob = await response.blob();
    
    // Upload the blob to Firebase
    await uploadBytes(fileRef, blob);
  
    // Get the download URL
    const downloadUrl = await getDownloadURL(fileRef);
    console.log("File uploaded to Firebase. Download URL:", downloadUrl);
  
    return downloadUrl;
  };

  // Handle toggle change
  const handleToggleChange = (value: boolean) => {
    setShowComputerVision(value);
    
    if (value) {
      // When toggle is switched ON, navigate to CV screen
      navigateTo("new_CV", { 
        cvEnabled: true,
        wordSet: wordSet,
        currentIndex: currentIndex,
        attemptNumber: attemptNumber,
        scoreTracking: scoreTracking
      });
    }
  };

  const progressWidth = ((currentIndex + 1) * (screenWidth/5));

  return (
    <View style={styles.container}>

      <View style={styles.progressBarContainer}>
        <View style={[styles.progressBar, { width: progressWidth }]} />
      </View>

      <View style={styles.brownContainer}>
        {/* Header with Exercise Word and Exit Button */}
        <View style={styles.header}>
          <Text style={styles.title}>Your turn! Try saying the word: {currentWord}</Text>

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
            onPress={() => navigateTo("Demo", { wordSet: wordSet, currentIndex: currentIndex, scoreTracking: scoreTracking })}
          >
            <Text style={styles.exitButtonText}>Back</Text>
          </TouchableOpacity>
        </View>

        {/* Camera View */}
        <View 
            style={[
              styles.cameraContainer,
              isPortrait ? { width: "90%", height: screenHeight * 0.7 } 
                         : { width: screenWidth * 0.8, height: "80%" }
            ]}
          >
            <CameraView ref={cameraRef} style={styles.camera} mode="video" facing={facing} />
        
        {/* Toggle Switch */}
        <View style={styles.toggleContainer}>
          <Text style={styles.toggleLabel}>Try out a visual guide!</Text>
          <Switch
            value={showComputerVision}
            onValueChange={handleToggleChange}
          />
        </View>

        {/* CV Play Button
        <TouchableOpacity
          style={styles.CVPlayButton}
          onPress={() => navigateTo("ChildHomeScreen")}
        >
          <Text style={styles.CVPlayButtonText}>Play Word</Text>
        </TouchableOpacity> */}

        {/* Video Thumbnail */}
          {videoUri && (
          <TouchableOpacity 
            style={styles.thumbnailContainer} 
            onPress={() => videoRef.current?.presentFullscreenPlayer()}
          >
            <Video
              ref={(ref) => (videoRef.current = ref)} 
              source={{ uri: videoUri }}
              style={styles.thumbnail}
              resizeMode={ResizeMode.COVER}
              useNativeControls
            />
          </TouchableOpacity>
          )}
        </View>

        {/* Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={[styles.button, isRecording && styles.recordingButton]} onPress={toggleRecording}>
            <Text style={styles.text}>{isRecording ? "Stop" : "Record"}</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.button, !videoUri && styles.disabledButton]}
            onPress={sendAudioToBackend}  // Call sendAudioToBackend here to submit the audio
            disabled={!videoUri}
          >
            <Text style={styles.text}>Get Feedback</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#A4D65E",
    justifyContent: "center",
    alignItems: "center",
  },
  brownContainer: {
    flex: 1,
    width: screenWidth * 0.9,
    height: screenHeight * 0.9,
    //flexDirection: "column",
    //justifyContent: "center",
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
    //flexDirection: "row",
    //justifyContent: "space-between",
    alignItems: "center",
    //paddingHorizontal: 20,
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
  exitButton: {
    position: "absolute",
    top: 10,
    right: 15, 
    backgroundColor: "#5A3E1B",
    borderRadius: 5,
    padding: 5,
  },
  backButton: {
    position: "absolute",
    top: 10,
    left: 15, 
    backgroundColor: "#5A3E1B",
    borderRadius: 5,
    padding: 5,
  },
  exitButtonText: {
    color: "white",
    fontWeight: "bold",
  },
  cameraContainer: {
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#684503',
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },
  portraitCamera: {
    width: "90%",
    height: screenHeight * 0.5,
  },
  landscapeCamera: {
    width: screenWidth * 0.8,
    height: "80%", 
  },
  camera: {
    flex: 1,
    width: "100%",
    borderRadius: 10,
  },
  message: {
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: "row",
    marginTop: 20,
    gap: 15,
  },
  button: {
    backgroundColor: "#684503",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    minWidth: screenWidth * 0.3,
  },
  disabledButton: {
    backgroundColor: "#ccc", // Greyed out when disabled
  },
  recordingButton: {
    backgroundColor: "red",
  },
  text: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  thumbnailContainer: {
    position: "absolute",
    bottom: 20,
    left: 20,
    borderRadius: 10,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "#684503",
  },
  thumbnail: {
    width: 80,
    height: 80,
    borderRadius: 10,
  },
  toggleContainer: {
    position: "absolute",
    bottom: 20,
    right: 20,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#5A3E1B",
    borderRadius: 5,
    padding: 5,
  },
  toggleLabel: {
    fontSize: 16,
    color: "white",
    marginRight: 10,
  },
  CVPlayButton: {
    position: "absolute",
    bottom: 70,
    right: 20, 
    backgroundColor: "#5A3E1B",
    borderRadius: 5,
    padding: 5,
  },
  CVPlayButtonText: {
    color: "white",
    fontWeight: "bold",
  },
});





































// import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
// import React, { useEffect, useRef, useState } from 'react';
// import { Button, StyleSheet, Text, TouchableOpacity, View, Dimensions, Image } from 'react-native';
// import { Video, ResizeMode } from 'expo-av';
// import { useRoute } from '@react-navigation/native';
// import { useNavigate } from './hooks/useNavigate';
// import { submitAudio } from '../services/api'; 
// import { Audio } from 'expo-av';
// import AsyncStorage from "@react-native-async-storage/async-storage";
// import axios, { AxiosResponse } from 'axios';
// import * as FileSystem from 'expo-file-system';
// import RNFetchBlob, { PolyfillBlob } from 'rn-fetch-blob';
// import { storage, ref, uploadBytes } from '../services/firebase'
// import { getDownloadURL } from 'firebase/storage';

// {/*Stuff that is necessary for CV features*/}
// import VideoViewComponent from './VideoViewComponent';
// import { Switch } from 'react-native';
// import { LandmarksData } from './LandmarksData';
// import { Camera, useCameraDevice, useCameraPermission } from 'react-native-vision-camera';
// import { useCVIntegration } from './new_CV';


// const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// export default function Record() {
//   const { navigateTo } = useNavigate();
//   const route = useRoute();
//   const { wordSet, currentIndex, attemptNumber, scoreTracking } = route.params as { wordSet: string[], currentIndex: number, attemptNumber: number, scoreTracking: number[]}; 
//   const currentWord = wordSet[currentIndex];
//   const attempt = 0;
//   const score = 0; // placeholder before backend scoring is connected
//   const feedback = ""; // placeholder before backend feedback is connected

//   const [facing, setFacing] = useState<CameraType>('front');
//   const [permission, requestPermission] = useCameraPermissions();
//   const [isRecording, setIsRecording] = useState(false);
//   const [videoUri, setVideoUri] = useState<string | null>(null);

//   const [screenWidth, setScreenWidth] = useState(Dimensions.get("window").width);
//   const [screenHeight, setScreenHeight] = useState(Dimensions.get("window").height);
//   const [isPortrait, setIsPortrait] = useState(screenHeight > screenWidth);
  
//    //Stuff that is necessary for CV features*
//   const [audioUri, setAudioUri] = useState<string | null>(null);
//   const [audioRecording, setAudioRecording] = useState<Audio.Recording | null>(null);

//   const [showComputerVision, setShowComputerVision] = useState(false); // Toggle state
//   const device = useCameraDevice(facing);
//   const [isReactCameraActive, setIsReactCameraActive] = useState(true); //As opposed to Expo
//   const [cvRunning, setCvRunning] = useState(false);
//   const [landmarks, setLandmarks] = useState<LandmarksData | null>(null);
//   const [isActive, setIsActive] = useState(true);
  
  


//   // refs
//   const ws = useRef<WebSocket | null>(null);
//   const cameraRef = useRef<CameraView>(null); // expo camera ref
//   const visionCameraRef = useRef<Camera | null>(null); // react camera ref
//   const videoRef = useRef<Video | null>(null); 


//   const {
//     // Methods
//     handleToggle,
//     handlePlayReference,
//     handleCameraLayout,
//     renderLandmarks,
//     captureSingleFrame,
//   }= useCVIntegration();

//   useEffect(() => {
//     // checking screen dimensions
//     const updateDimensions = () => {
//       const newWidth = Dimensions.get("window").width;
//       const newHeight = Dimensions.get("window").height;
//       setScreenWidth(newWidth);
//       setScreenHeight(newHeight);
//       setIsPortrait(newHeight > newWidth);
//     };

//     // requesting permissions for camera and mic
//     const requestPermissions = async () => {
//       if (permission?.granted) return; // Don't request if already granted

//       console.log("Requesting camera and microphone permissions...");

//       // Request camera permissions
//       await requestPermission();

//       // Request microphone permissions
//       const { status: micStatus } = await Audio.requestPermissionsAsync();
//       if (micStatus !== 'granted') {
//         console.error("Microphone permission denied");
//       }
//     };

//     requestPermissions();

//     // reset state when a new word is selected
//     console.log("New word selected. Resetting state.");
//     setIsRecording(false);


//     // check for changes in dimensions
//     updateDimensions();
//     const subscription = Dimensions.addEventListener("change", updateDimensions);
//     return () => subscription.remove();

//   }, [currentIndex]);


//   // views based on permissions
//   if (!permission) {
//     return <View />;
//   }

//   if (!permission.granted) {
//     return (
//       <View style={styles.container}>
//         <Text style={styles.message}>We need your permission to show the camera</Text>
//         <Button onPress={requestPermission} title="Grant Permission" />
//       </View>
//     );
//   }

//   async function toggleRecording() {
//     if (isRecording) {
//       cameraRef.current?.stopRecording();
//       setIsRecording(false);
//     } else {
//       setIsRecording(true)
//       const response = await cameraRef.current?.recordAsync({maxDuration: 20});
//       setVideoUri(response!.uri);
//       console.log("Video URI:", response!.uri);
//     }
//   }
  
//   // Function to submit audio to the backend and navigate to feedback page
//   const sendAudioToBackend = async () => {
//     if (!videoUri) {
//       console.error("No video file to submit.");
//       return;
//     }
  
//     try {
//       console.log("Uploading video to Firebase from URI:", videoUri);
  
//       // Upload video to Firebase using URI directly
//       const downloadUri = await uploadToFirebase(videoUri); 
  
//       // Prepare the FormData with the Firebase download URL
//       const formData = new FormData();
//       formData.append("audio_file", downloadUri);
  
//       console.log("Sending video URL to backend...");
  
//       const response = await axios.post(
//         "https://b57f-2605-8d80-6e3-8976-c11-737e-f412-3d58.ngrok-free.app/api/submit_audio/",
//         formData,
//         {
//           headers: {
//             "Content-Type": "multipart/form-data",
//           },
//         }
//       );
  
//       console.log("Response from backend:", response?.data);
  
//       // track the score
//       const updatedScoreTracking = [...scoreTracking];
//       updatedScoreTracking[currentIndex] = response?.data?.score || 0; // add current score to the total scores in exercise

//       navigateTo("Feedback", {
//         wordSet,
//         currentIndex,
//         attemptNumber,
//         score: response?.data?.score || 0,
//         feedback: response?.data?.feedback || "",
//         scoreTracking: scoreTracking
//       });
//     } catch (error) {
//       console.error("Error submitting video:", error);
//     }
//   };
  
//   // Helper function to upload file to Firebase Storage
//   const uploadToFirebase = async (fileUri: string) => {
//     const fileName = `${Date.now()}.mov`;
//     const fileRef = ref(storage, `audio_files/${fileName}`);
    
//     // Convert the video into a blob using Expo's FileSystem
//     const response = await fetch(fileUri);
//     const blob = await response.blob();
    
//     // Upload the blob to Firebase
//     await uploadBytes(fileRef, blob);
  
//     // Get the download URL
//     const downloadUrl = await getDownloadURL(fileRef);
//     console.log("File uploaded to Firebase. Download URL:", downloadUrl);
  
//     return downloadUrl;
//   };

//   const progressWidth = ((currentIndex + 1) * (screenWidth/5));

//   // To fix the switch between expo camera and rwact camera 
//   // Render method for camera based on platform and vision camera availability
//   const renderCamera = () => {
//     // If computer vision is enabled
//     if (showComputerVision) {
//       // Check for device and permission
//       if (!device) {
//         return (
//           <View style={styles.camera}>
//             <Text style={styles.message}>No camera device available</Text>
//           </View>
//         );
//       }

//       if (!permission) {
//         return (
//           <View style={styles.camera}>
//             <Text style={styles.message}>Camera permission not granted</Text>
//             <Button 
//               title="Request Permission" 
//               onPress={() => requestPermission()} 
//             />
//           </View>
//         );
//       }

//       // Render Vision Camera
//       return (
//         <Camera
//           ref={visionCameraRef}
//           style={styles.camera}
//           device={device}
//           isActive={true}
//           photo={true}
//         />
//       );
//     }

//     // Default to Expo Camera when computer vision is off
//     return (
//       <CameraView 
//         ref={cameraRef}
//         style={styles.camera} 
//         mode="video" 
//         facing={facing}
//         active={true}
//       />
//     );
//   };


//   return (
//     <View style={styles.container}>
//       <View style={styles.progressBarContainer}>
//         <View style={[styles.progressBar, { width: progressWidth }]} />
//       </View>

//       <View style={styles.brownContainer}>
//         {/* Header with Exercise Word and Exit Button */}
//         <View style={styles.header}>
//           <Text style={styles.title}>Your turn! Try saying the word: {currentWord}</Text>

//           {/* Exit Button */}
//           <TouchableOpacity
//             style={styles.exitButton}
//             onPress={() => navigateTo("ChildHomeScreen")}
//           >
//             <Text style={styles.exitButtonText}>Exit</Text>
//           </TouchableOpacity>

//           {/* Back Button */}
//           <TouchableOpacity
//             style={styles.backButton}
//             onPress={() => navigateTo("Demo", { wordSet: wordSet, currentIndex: currentIndex, scoreTracking: scoreTracking })}
//           >
//             <Text style={styles.exitButtonText}>Back</Text>
//           </TouchableOpacity>
//         </View>

//         {/* Camera View */}
//         <View 
//           style={[
//             styles.cameraContainer,
//             isPortrait ? { width: "90%", height: screenHeight * 0.7 } 
//                      : { width: screenWidth * 0.8, height: "80%" }
//           ]}
//           onLayout={handleCameraLayout}
//         >
//           {renderCamera()}

//           {/* Conditional rendering based on whether CV is enabled */}
//           {showComputerVision ? (
//             // Vision Camera for computer vision features
//             device ? (
//               <Camera
//                 ref={visionCameraRef}
//                 style={styles.camera}
//                 device={device}
//                 isActive={showComputerVision && isActive}
//                 photo={true}
//               />
//             ) : (
//               <View style={styles.camera}>
//                 <Text style={styles.message}>Camera device not available</Text>
//               </View>
//             )
//           ) : (
//             // Expo Camera for video recording
//             <CameraView 
//               ref={cameraRef} 
//               style={styles.camera} 
//               mode="video" 
//               facing={facing}
//               active={!showComputerVision && isActive}
//             />
//           )}
          
//           {/* Landmarks overlay */}
//           {showComputerVision && renderLandmarks()}
          
//           {/* Toggle Switch */}
//           <View style={styles.toggleContainer}>
//             <Text style={styles.toggleLabel}>Toggle the switch on for a visual guide!</Text>
//             <Switch
//               value={showComputerVision}
//               onValueChange={(value) => {
//                 setShowComputerVision(value);
//                 if (value) {
//                   handleToggle();
//                   setIsActive(false);
//                 } else {
//                   // Reactivate Expo camera when switching back
//                   setIsActive(true);
//                   // Turn off CV if toggled off
//                   if (ws.current?.readyState === WebSocket.OPEN) {
//                     ws.current.send(
//                       JSON.stringify({
//                         type: 'toggle',
//                         value: false,
//                       })
//                     );
//                     setCvRunning(false);
//                     setLandmarks(null);


//                       // Ensure the camera is active when CV is turned off
//                     // setIsActive(true);
//                   }
//                 }
//               }}
//             />
//           </View>

//           {/* CV Play Button*/}
//           {showComputerVision && (
//             <TouchableOpacity
//               style={styles.CVPlayButton}
//               onPress={handlePlayReference}
//             >
//               <Text style={styles.CVPlayButtonText}>Play Word</Text>
//             </TouchableOpacity>
//           )}

//           {/* Video Thumbnail */}
//           {videoUri && (
//             <TouchableOpacity 
//               style={styles.thumbnailContainer} 
//               onPress={() => videoRef.current?.presentFullscreenPlayer()}
//             >
//               <Video
//                 ref={(ref) => (videoRef.current = ref)} 
//                 source={{ uri: videoUri }}
//                 style={styles.thumbnail}
//                 resizeMode={ResizeMode.COVER}
//                 useNativeControls
//               />
//             </TouchableOpacity>
//           )}
//         </View>

//         {/* Buttons */}
//         <View style={styles.buttonContainer}>
//           <TouchableOpacity 
//             style={[
//               styles.button, 
//               isRecording && styles.recordingButton,
//               showComputerVision && styles.disabledButton // Disable record button when CV is on
//             ]} 
//             onPress={toggleRecording}
//             disabled={showComputerVision} // Disable when CV is enabled
//           >
//             <Text style={styles.text}>{isRecording ? "Stop" : "Record"}</Text>
//           </TouchableOpacity>

//           <TouchableOpacity 
//             style={[styles.button, !videoUri && styles.disabledButton]}
//             onPress={sendAudioToBackend}
//             disabled={!videoUri}
//           >
//             <Text style={styles.text}>Get Feedback</Text>
//           </TouchableOpacity>
//         </View>
//       </View>
//     </View>
//   );
// };

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: "#A4D65E",
//     justifyContent: "center",
//     alignItems: "center",
//   },
//   brownContainer: {
//     flex: 1,
//     width: screenWidth * 0.9,
//     height: screenHeight * 0.9,
//     alignItems: "center",
//     backgroundColor: "#D9B382",
//     borderRadius: 10,
//     borderWidth: 2,
//     borderColor: '#684503',
//     overflow: "hidden",
//     marginTop: 50,
//     marginBottom: 50,
//   },
//   header: {
//     alignItems: "center",
//     paddingVertical: 10,
//     width: "100%",
//     backgroundColor: "#D9B382",
//   },
//   title: {
//     fontSize: 20,
//     fontWeight: "bold",
//     color: "#432818",
//     textAlign: "center",
//     overflow: "visible",
//     marginBottom: 10,
//     marginTop: 35
//   },
//   progressBarContainer: {
//     width: "100%",
//     height: 15,
//     backgroundColor: "#D9B382",
//     borderRadius: 3,
//   },
//   progressBar: {
//     height: "100%",
//     backgroundColor: "#684503",
//   },
//   exitButton: {
//     position: "absolute",
//     top: 10,
//     right: 15, 
//     backgroundColor: "#5A3E1B",
//     borderRadius: 5,
//     padding: 5,
//   },
//   backButton: {
//     position: "absolute",
//     top: 10,
//     left: 15, 
//     backgroundColor: "#5A3E1B",
//     borderRadius: 5,
//     padding: 5,
//   },
//   exitButtonText: {
//     color: "white",
//     fontWeight: "bold",
//   },
//   cameraContainer: {
//     borderRadius: 10,
//     borderWidth: 2,
//     borderColor: '#684503',
//     overflow: "hidden",
//     justifyContent: "center",
//     alignItems: "center",
//   },
//   portraitCamera: {
//     width: "90%",
//     height: screenHeight * 0.5,
//   },
//   landscapeCamera: {
//     width: screenWidth * 0.8,
//     height: "80%", 
//   },
//   camera: {
//     flex: 1,
//     width: "100%",
//     borderRadius: 10,
//   },
//   message: {
//     textAlign: 'center',
//   },
//   buttonContainer: {
//     flexDirection: "row",
//     marginTop: 20,
//     gap: 15,
//   },
//   button: {
//     backgroundColor: "#684503",
//     paddingHorizontal: 20,
//     paddingVertical: 12,
//     borderRadius: 8,
//     alignItems: "center",
//     justifyContent: "center",
//     minWidth: screenWidth * 0.3,
//   },
//   disabledButton: {
//     backgroundColor: "#ccc", // Greyed out when disabled
//   },
//   recordingButton: {
//     backgroundColor: "red",
//   },
//   text: {
//     fontSize: 18,
//     fontWeight: "bold",
//     color: "#FFFFFF",
//   },
//   thumbnailContainer: {
//     position: "absolute",
//     bottom: 20,
//     left: 20,
//     borderRadius: 10,
//     overflow: "hidden",
//     borderWidth: 2,
//     borderColor: "#684503",
//   },
//   thumbnail: {
//     width: 80,
//     height: 80,
//     borderRadius: 10,
//   },
//   toggleContainer: {
//     position: "absolute",
//     bottom: 20,
//     right: 20,
//     flexDirection: "row",
//     alignItems: "center",
//     backgroundColor: "#5A3E1B",
//     borderRadius: 5,
//     padding: 5,
//   },
//   toggleLabel: {
//     fontSize: 16,
//     color: "white",
//     marginRight: 10,
//   },
//   CVPlayButton: {
//     position: "absolute",
//     bottom: 70,
//     right: 20, 
//     backgroundColor: "#5A3E1B",
//     borderRadius: 5,
//     padding: 5,
//   },
//   CVPlayButtonText: {
//     color: "white",
//     fontWeight: "bold",
//   },
// });

// import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
// import React, { useEffect, useRef, useState } from 'react';
// import { Button, StyleSheet, Text, TouchableOpacity, View, Dimensions, Image, Switch, Platform} from 'react-native';
// import { Video, ResizeMode } from 'expo-av';
// import { useRoute } from '@react-navigation/native';
// // import { useNavigate } from './hooks/useNavigate';
// // import { submitAudio } from '../services/api'; 
// import { Audio } from 'expo-av';
// import AsyncStorage from "@react-native-async-storage/async-storage";
// // import axios from 'axios';
// import * as FileSystem from 'expo-file-system';
// import Svg, { Line } from 'react-native-svg';
// import * as Device from 'expo-device';
// import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

// const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// interface LandmarksData {
//   landmarks: [number, number][] | null;
//   type: string;
//   indices: {
//     jaw: number[];
//     mouth: number[];
//   };
//   bounds: {
//     minX: number;
//     maxX: number;
//     minY: number;
//     maxY: number;
//   };
// }

// export default function Record() {
//   // const { navigateTo } = useNavigate();
//   const route = useRoute();
//   const { wordSet, currentIndex, attemptNumber } = route.params as { wordSet: string[], currentIndex: number, attemptNumber: number }; 
//   const currentWord = wordSet[currentIndex];
//   const attempt = 0;
//   const score = 0; // placeholder before backend scoring is connected
//   const feedback = ""; // placeholder before backend feedback is connected

//   const [facing, setFacing] = useState<CameraType>('front');
//   const [permission, requestPermission] = useCameraPermissions();
//   const [isRecording, setIsRecording] = useState(false);
//   const [videoUri, setVideoUri] = useState<string | null>(null);
//   const [screenWidth, setScreenWidth] = useState(Dimensions.get("window").width);
//   const [screenHeight, setScreenHeight] = useState(Dimensions.get("window").height);
//   const [isPortrait, setIsPortrait] = useState(screenHeight > screenWidth);

//   // CV State
//   const [showComputerVision, setShowComputerVision] = useState(false);
//   const [landmarks, setLandmarks] = useState<LandmarksData | null>(null);
//   const [isConnected, setIsConnected] = useState(false);
//   const [cvRunning, setCvRunning] = useState(false);
//   const [playingReference, setPlayingReference] = useState(false);
//   const [serverUrl, setServerUrl] = useState('');
//   const [cameraViewDimensions, setCameraViewDimensions] = useState({ width: 0, height: 0 });
//   const ws = useRef<WebSocket | null>(null);
//   const frameIntervalRef = useRef<NodeJS.Timeout | null>(null);

//   const cameraRef = useRef<CameraView>(null);
//   const videoRef = useRef<Video | null>(null); 

//   useEffect(() => {
//     // Determine appropriate server URL based on device
//     const getServerUrl = async () => {
//       const devServerUrl = Platform.select({
//         ios: Device.isDevice ? 'wss://your-server-url' : 'ws://localhost:8000/ws',
//         android: Device.isDevice ? 'wss://your-server-url' : 'ws://localhost:8000/ws',
//         default: 'ws://localhost:8000/ws',
//       });
//       setServerUrl(devServerUrl);
//     };

//     getServerUrl();
//   }, []);

//   useEffect(() => {
//     if (serverUrl) {
//       connectWebSocket();
//     }
//     return () => {
//       if (ws.current) {
//         ws.current.close();
//       }
//       if (frameIntervalRef.current) {
//         clearInterval(frameIntervalRef.current);
//       }
//     };
//   }, [serverUrl]);

//   const connectWebSocket = () => {
//     try {
//       ws.current = new WebSocket(serverUrl);
//       ws.current.onopen = () => {
//         console.log('✅ WebSocket Connected');
//         setIsConnected(true);
//       };
//       ws.current.onclose = () => {
//         console.log('❌ WebSocket Disconnected');
//         setIsConnected(false);
//         setTimeout(connectWebSocket, 3000); // Auto-reconnect
//       };
//       ws.current.onmessage = (event) => {
//         const data = JSON.parse(event.data);
//         if (data.type === 'landmarks') {
//           setLandmarks(data.data);
//         } else if (data.type === 'play_reference') {
//           setPlayingReference(data.value);
//           if (data.value && data.reference_landmarks) {
//             setLandmarks(data.reference_landmarks);
//           }
//         }
//       };
//       ws.current.onerror = (event) => {
//         console.error('⚠️ WebSocket Error:', event);
//       };
//     } catch (error) {
//       console.error('❌ WebSocket Connection Failed:', error);
//     }
//   };

//   const startCapturingFrames = async () => {
//     if (!cameraRef.current) return;

//     if (frameIntervalRef.current) {
//       clearInterval(frameIntervalRef.current);
//     }

//     frameIntervalRef.current = setInterval(async () => {
//       if (!cameraRef.current || !isConnected || !ws.current || ws.current.readyState !== WebSocket.OPEN) {
//         return;
//       }

//       try {
//         const photo = await cameraRef.current.takePictureAsync({
//           quality: 0.5,
//           base64: true,
//           exif: false,
//         });

//         if (!photo || !photo.base64) return;

//         const processedImage = await manipulateAsync(
//           photo.uri,
//           [{ resize: { width: 320 } }],
//           { base64: true, format: SaveFormat.JPEG, compress: 0.5 }
//         );

//         if (!processedImage.base64) return;

//         ws.current.send(
//           JSON.stringify({
//             type: 'frame',
//             data: processedImage.base64,
//           })
//         );
//       } catch (error) {
//         console.error('❌ Error capturing frame:', error);
//       }
//     }, 200);
//   };

//   const stopCapturingFrames = () => {
//     if (frameIntervalRef.current) {
//       clearInterval(frameIntervalRef.current);
//       frameIntervalRef.current = null;
//     }
//   };

//   const handleToggleCV = () => {
//     setShowComputerVision(!showComputerVision);
//     if (!showComputerVision) {
//       startCapturingFrames();
//     } else {
//       stopCapturingFrames();
//       setLandmarks(null);
//     }
//   };

//   const handlePlayReference = () => {
//     if (ws.current?.readyState === WebSocket.OPEN) {
//       ws.current.send(
//         JSON.stringify({
//           type: 'play_reference',
//           value: true,
//         })
//       );
//     }
//   };

//   const renderLandmarks = () => {
//     if (!landmarks?.landmarks || landmarks.landmarks.length === 0) return null;

//     const scaleX = (x: number) => {
//       const { minX, maxX } = landmarks.bounds || { minX: 0, maxX: screenWidth };
//       return ((x - minX) / (maxX - minX)) * cameraViewDimensions.width;
//     };

//     const scaleY = (y: number) => {
//       const { minY, maxY } = landmarks.bounds || { minY: 0, maxY: screenHeight };
//       return ((y - minY) / (maxY - minY)) * cameraViewDimensions.height;
//     };

//     const renderLines = (indices: number[]) => {
//       if (!landmarks?.landmarks) return null; // Check if landmarks.landmarks exists

//       return indices.map((index, i) => {
//         if (i === 0) return null;
//         const prevIndex = indices[i - 1];
//         const currentIndex = index;

//          // Ensure the indices are within bounds
//         if (
//           prevIndex >= landmarks.landmarks.length ||
//           currentIndex >= landmarks.landmarks.length
//         ) {
//           return null;
//         }

//         const start = landmarks.landmarks[prevIndex];
//         const end = landmarks.landmarks[currentIndex];

//          // Ensure start and end points are valid
//         if (!start || !end) return null;

//         return (
//           <Line
//             key={`line-${landmarks.type}-${i}`}
//             x1={scaleX(start[0])}
//             y1={scaleY(start[1])}
//             x2={scaleX(end[0])}
//             y2={scaleY(end[1])}
//             stroke={landmarks.type === 'reference' ? '#4CAF50' : '#FFFFFF'}
//             strokeWidth={landmarks.type === 'reference' ? 3 : 2}
//           />
//         );
//       });
//     };

//     return (
//       <Svg style={StyleSheet.absoluteFill}>
//         {landmarks.indices?.jaw && renderLines(landmarks.indices.jaw)}
//         {landmarks.indices?.mouth && renderLines(landmarks.indices.mouth)}
//       </Svg>
//     );
//   };

//   return (
//     <View style={styles.container}>
//       <View style={styles.brownContainer}>
//         <View style={styles.header}>
//           <Text style={styles.title}>Your turn! Try saying the word: {currentWord}</Text>
//           {/* <TouchableOpacity style={styles.exitButton} onPress={() => navigateTo("ChildHomeScreen")}> */}
//           <TouchableOpacity style={styles.exitButton}>
//             <Text style={styles.exitButtonText}>Exit</Text>
//           </TouchableOpacity>
//           {/* <TouchableOpacity style={styles.backButton} onPress={() => navigateTo("Demo", { wordSet, currentIndex })}> */}
//           <TouchableOpacity style={styles.backButton}>
//             <Text style={styles.exitButtonText}>Back</Text>
//           </TouchableOpacity>
//         </View>

//         <View style={styles.cameraContainer}>
//           <CameraView ref={cameraRef} style={styles.camera} mode="video" facing={facing}>
//             {showComputerVision && renderLandmarks()}
//           </CameraView>

//           <View style={styles.toggleContainer}>
//             <Text style={styles.toggleLabel}>Toggle the switch on for a visual guide!</Text>
//             <Switch value={showComputerVision} onValueChange={handleToggleCV} />
//           </View>

//           <TouchableOpacity style={styles.CVPlayButton} onPress={handlePlayReference}>
//             <Text style={styles.CVPlayButtonText}>Play Word</Text>
//           </TouchableOpacity>
//         </View>

//         <View style={styles.buttonContainer}>
//           <TouchableOpacity style={[styles.button, isRecording && styles.recordingButton]}>
//             <Text style={styles.text}>{isRecording ? "Stop" : "Record"}</Text>
//           </TouchableOpacity>
//           <TouchableOpacity style={styles.button}>
//             <Text style={styles.text}>Get Feedback</Text>
//           </TouchableOpacity>
//         </View>
//       </View>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: "#88C040",
//     justifyContent: "center",
//     alignItems: "center",
//   },
//   brownContainer: {
//     flex: 1,
//     width: screenWidth * 0.9,
//     height: screenHeight * 0.9,
//     flexDirection: "column",
//     justifyContent: "center",
//     alignItems: "center",
//     backgroundColor: "#D9B382",
//     borderRadius: 10,
//     borderWidth: 2,
//     borderColor: '#684503',
//     overflow: "visible",
//     marginTop: 50,
//     marginBottom: 50,
//   },
//   header: {
//     flexDirection: "row",
//     justifyContent: "space-between",
//     alignItems: "center",
//     paddingHorizontal: 20,
//     paddingVertical: 10,
//     width: "100%",
//     backgroundColor: "#D9B382",
//   },
//   title: {
//     fontSize: 20,
//     fontWeight: "bold",
//     color: "#432818",
//     textAlign: "center",
//     overflow: "visible",
//     marginBottom: 10,
//   },
//   progressBarContainer: {
//     width: "100%",
//     height: 15,
//     backgroundColor: "#D9B382",
//     borderRadius: 3,
//   },
//   progressBar: {
//     height: "100%",
//     backgroundColor: "#684503",
//   },
//   exitButton: {
//     position: "absolute",
//     top: -25,
//     right: 15, 
//     backgroundColor: "#5A3E1B",
//     borderRadius: 5,
//     padding: 5,
//   },
//   backButton: {
//     position: "absolute",
//     top: -25,
//     left: 15, 
//     backgroundColor: "#5A3E1B",
//     borderRadius: 5,
//     padding: 5,
//   },
//   exitButtonText: {
//     color: "white",
//     fontWeight: "bold",
//   },
//   cameraContainer: {
//     borderRadius: 10,
//     borderWidth: 2,
//     borderColor: '#684503',
//     overflow: "hidden",
//     justifyContent: "center",
//     alignItems: "center",
//   },
//   portraitCamera: {
//     width: "90%",
//     height: screenHeight * 0.5,
//   },
//   landscapeCamera: {
//     width: screenWidth * 0.8,
//     height: "80%", 
//   },
//   camera: {
//     flex: 1,
//     width: "100%",
//     borderRadius: 10,
//   },
//   message: {
//     textAlign: 'center',
//   },
//   buttonContainer: {
//     flexDirection: "row",
//     marginTop: 20,
//     gap: 15,
//   },
//   button: {
//     backgroundColor: "#684503",
//     paddingHorizontal: 20,
//     paddingVertical: 12,
//     borderRadius: 8,
//     alignItems: "center",
//     justifyContent: "center",
//     minWidth: screenWidth * 0.3,
//   },
//   recordingButton: {
//     backgroundColor: "red",
//   },
//   text: {
//     fontSize: 18,
//     fontWeight: "bold",
//     color: "#FFFFFF",
//   },
//   thumbnailContainer: {
//     position: "absolute",
//     bottom: 20,
//     left: 20,
//     borderRadius: 10,
//     overflow: "hidden",
//     borderWidth: 2,
//     borderColor: "#684503",
//   },
//   thumbnail: {
//     width: 80,
//     height: 80,
//     borderRadius: 10,
//   },
//   toggleContainer: {
//     position: "absolute",
//     bottom: 20,
//     right: 20,
//     flexDirection: "row",
//     alignItems: "center",
//     backgroundColor: "#5A3E1B",
//     borderRadius: 5,
//     padding: 5,
//   },
//   toggleLabel: {
//     fontSize: 16,
//     color: "white",
//     marginRight: 10,
//   },
//   CVPlayButton: {
//     position: "absolute",
//     bottom: 70,
//     right: 20, 
//     backgroundColor: "#5A3E1B",
//     borderRadius: 5,
//     padding: 5,
//   },
//   CVPlayButtonText: {
//     color: "white",
//     fontWeight: "bold",
//   },
// });

// import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
// import React, { useEffect, useRef, useState } from 'react';
// import { SafeAreaView, StyleSheet, View, TouchableOpacity, Text, Alert, Platform, Dimensions} from 'react-native';
// import Svg, { Line } from 'react-native-svg';
// import * as Device from 'expo-device';
// import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
// import { useNavigate } from "./hooks/useNavigate";
// import { useRoute } from "@react-navigation/native";


// interface LandmarksData {
//   landmarks: [number, number][] | null;
//   type: string;
//   indices: {
//     jaw: number[];
//     mouth: number[];
//   };
//   bounds: {
//     minX: number;
//     maxX: number;
//     minY: number;
//     maxY: number;
//   }
// }

// const App = () => {
//   const [facing, setFacing] = useState<CameraType>('front');
//   const cameraRef = useRef<CameraView | null>(null);
//   const ws = useRef<WebSocket | null>(null);
//   const [isConnected, setIsConnected] = useState(false);
//   const [cvRunning, setCvRunning] = useState(false);
//   const [playingReference, setPlayingReference] = useState(false);
//   const [landmarks, setLandmarks] = useState<LandmarksData | null>(null);
//   const [permission, requestPermission] = useCameraPermissions();
//   const frameIntervalRef = useRef<NodeJS.Timeout | null>(null);
//   const [serverUrl, setServerUrl] = useState('');
//   const [cameraViewDimensions, setCameraViewDimensions] = useState({ width: 0, height: 0 });
//   // Add a debug state to help troubleshoot
//   const [debugInfo, setDebugInfo] = useState<string>('');
//   const [lastLandmarkType, setLastLandmarkType] = useState<string>('none');
//   const [referenceCompleted, setReferenceCompleted] = useState(false);
//   const [frameCaptured, setFrameCaptured] = useState(false);
//   const { width: screenWidth, height: screenHeight } = Dimensions.get('window');


//   useEffect(() => {
//     // Determine appropriate server URL based on device
//     const getServerUrl = async () => {
//       // For Expo Go on physical devices, we need to use the host machine's IP address
//       const devServerUrl = Platform.select({
//         ios: Device.isDevice ?  'wss://eb16-192-159-178-211.ngrok-free.app/ws' : 'ws://localhost:8000/ws' ,
//         android: Device.isDevice ? 'wss://eb16-192-159-178-211.ngrok-free.app/ws' : 'ws://localhost:8000/ws' ,
//         default: 'ws://localhost:8000/ws',
//         // ios: Device.isDevice ?  'ws://10.10.89.52:8000/ws' : 'ws://localhost:8000/ws' ,
//         // android: Device.isDevice ? 'ws://10.10.89.52:8000/ws' : 'ws://localhost:8000/ws' ,
//         // default: 'ws://localhost:8000/ws',
//       });

//       setServerUrl(devServerUrl);
//     };

//     getServerUrl();
//   }, []);

//   useEffect(() => {
//     if (serverUrl) {
//       connectWebSocket();
//     }
//     return () => {
//       if (ws.current) {
//         ws.current.close();
//       }
//       if (frameIntervalRef.current) {
//         clearInterval(frameIntervalRef.current);
//       }
//     };
//   }, [serverUrl]);

//   const connectWebSocket = () => {
//     try {
//       console.log(`Attempting to connect to WebSocket at: ${serverUrl}`);
//       setDebugInfo(`Connecting to: ${serverUrl}`);
//       ws.current = new WebSocket(serverUrl);
//       ws.current.onopen = () => {
//         console.log('✅ WebSocket Connected');
//         setIsConnected(true);
//         setDebugInfo('WebSocket connected successfully');
//       };
//       ws.current.onclose = () => {
//         console.log('❌ WebSocket Disconnected');
//         setIsConnected(false);
//         setDebugInfo('WebSocket disconnected');
//         setTimeout(connectWebSocket, 3000); // Auto-reconnect
//       };
//       ws.current.onmessage = (event) => {
//         try {
//           const data = JSON.parse(event.data);
//           console.log('📩 Received from server:', data);
//           setDebugInfo(`Received ${data.type} data`);

//           if (data.type === 'landmarks') {
//             setLandmarks(data.data);
//             if (data.data?.landmarks) {
//               setLastLandmarkType(data.data.type);
//               const count = data.data.landmarks.length;
//               console.log(`Got ${data.data.landmarks.length} landmarks of type ${data.data.type}`);
//               setDebugInfo(`Got ${data.data.landmarks.length} landmarks of type ${data.data.type}`);
//               setDebugInfo(`Got ${count} ${data.data.type} landmarks`);

//             }
//           } else if (data.type === 'status') {
//             // Update both CV and reference playback states
//             setCvRunning(data.cv_running);
//             setPlayingReference(data.play_reference);
//           } else if (data.type === 'play_reference') {
//             console.log(`🎵 Play reference: ${data.value}`);
//             setPlayingReference(data.value);
//             if (!data.value) {
//               // Reference playback has completed or been stopped
//               // setReferenceCompleted(true);
//               // Clear landmarks when reference playback ends
//               // setLandmarks(null);
//               setDebugInfo('Reference playback stopped');
//             }
           
//           } else if (data.type === 'reference_completed') {
//               // New event to handle reference completion
//               setPlayingReference(false);
//               setReferenceCompleted(true);
//               setDebugInfo('Reference playback completed');
//               // Clear landmarks if desired when reference playback completes
//               // setLandmarks(null);
//           } else if (data.type === 'error') {
//             Alert.alert('Error', data.message);
//             setDebugInfo(`Error: ${data.message}`);
//           }
//         } catch (error) {
//           console.error('❌ Error parsing WebSocket message:', error);
//           setDebugInfo(`Error: ${error instanceof Error ? error.message : String(error)}`);
//         }
//       };
//       ws.current.onerror = (event: Event) => {
//         console.error('⚠️ WebSocket Error:', event);
//         setDebugInfo(`WebSocket error occurred`);
//         Alert.alert('Connection Error', 'Failed to connect to the server.');
//       };
//     } catch (error) {
//       console.error('❌ WebSocket Connection Failed:', error);
//       setDebugInfo(`Connection failed: ${error instanceof Error ? error.message : String(error)}`);
//       Alert.alert('Connection Error', 'Failed to connect to the server.');
//     }
//   };
 

  
//   // New function to capture a single frame
//   const captureSingleFrame = async () => {
//     if (!cameraRef.current || !isConnected || !ws.current || ws.current.readyState !== WebSocket.OPEN) {
//       console.log('❌ Camera or WebSocket not ready');
//       return;
//     }

//     try {
//       // Take picture with camera (silently)
//       const photo = await cameraRef.current.takePictureAsync({
//         quality: 0.5,
//         base64: true,
//         exif: false,
//         skipProcessing: true, // Helps prevent flash on some devices
//       });
  
//       if (!photo || !photo.base64) {
//         console.warn('⚠️ No valid image captured');
//         setDebugInfo('No valid image captured');
//         return;
//       }

//       // Process image before sending
//       const processedImage = await manipulateAsync(
//         photo.uri,
//         [{ resize: { width: 320 } }],
//         { base64: true, format: SaveFormat.JPEG, compress: 0.5 }
//       );

//       if (!processedImage.base64) {
//         console.warn('⚠️ Image processing failed');
//         return;
//       }

//        // Send processed image
//     ws.current.send(
//       JSON.stringify({
//         type: 'frame',
//         data: processedImage.base64,
//         single_frame: true, // Flag to indicate this is a one-time capture
//       })
//     );
    
//     console.log('📸 Single frame captured and sent');
//     return true;

//   } catch (error) {
//     console.error('❌ Error capturing frame:', error);
//     return false;

//   }
// };

//   const handleToggle = async () => {
//     if (ws.current?.readyState === WebSocket.OPEN) {
//       const newState = !cvRunning;
//       console.log(`🔄 Toggling CV: ${newState ? 'ON' : 'OFF'}`);
      
//       if (newState) {
//         // First capture a single frame
//         const frameSuccess = await captureSingleFrame();
//         if (frameSuccess) {
//           setFrameCaptured(true);
          
//           // Then toggle CV on the server
//           ws.current.send(
//             JSON.stringify({
//               type: 'toggle',
//               value: newState,
//             })
//           );

//           setCvRunning(true);
//           setPlayingReference(false); // Ensure playback is stopped
//           setReferenceCompleted(false); // Reset completed state

//           if (frameIntervalRef.current) {
//             clearInterval(frameIntervalRef.current);
//           }
//         } else {
//           Alert.alert('Camera Error', 'Failed to capture image.');
//           return;
//         }
//       } else {
//         // Turn off CV
//         ws.current.send(
//           JSON.stringify({
//             type: 'toggle',
//             value: false,
//           })
//         );
//         setCvRunning(false);
//         setPlayingReference(false);
//         setFrameCaptured(false);
//         setLandmarks(null);

//          // Stop sending frames
//          if (frameIntervalRef.current) {
//           clearInterval(frameIntervalRef.current);
//           frameIntervalRef.current = null;
//         }
//       }
//     } else {
//       Alert.alert('Connection Error', 'Server not available.');
//       connectWebSocket();
//     }
//   };

//   const handlePlayReference = () => {
//     if (ws.current?.readyState === WebSocket.OPEN) {
//       // If reference was completed before, reset the state
//       if (referenceCompleted) {
//         setReferenceCompleted(false);
//       }

//       const newPlayingState = !playingReference;
//       console.log(`🎵 Toggling Reference Playback: ${newPlayingState ? 'ON' : 'OFF'}`);


//       ws.current.send(
//         JSON.stringify({
//           type: 'play_reference',
//           value: newPlayingState,
//           play_once: true  // Add flag to indicate one-time playback

//         })
//       );
//       setPlayingReference(newPlayingState);
//       setDebugInfo(`Reference playback ${newPlayingState ? 'started' : 'stopped'}`);
//     } else {
//       Alert.alert('Connection Error', 'Server not available.');
//       connectWebSocket();
//     }
//   };

//   const [layoutUpdated, setLayoutUpdated] = useState(false);


//   const handleCameraLayout = (event: { nativeEvent: { layout: { width: number; height: number } } }) => {
//     const { width, height } = event.nativeEvent.layout;
  
//     // Determine whether the screen is in portrait or landscape mode
//     const isPortrait = screenHeight > screenWidth;
  
//     // Set camera dimensions based on orientation
//     const newCameraDimensions = isPortrait
//       ? { width: screenWidth * 0.9, height: screenHeight * 0.5 } // Portrait mode
//       : { width: screenWidth * 0.8, height: screenHeight * 0.8 }; // Landscape mode
  
//     setCameraViewDimensions(newCameraDimensions);
    
//     console.log(`📏 Camera view dimensions: ${newCameraDimensions.width}x${newCameraDimensions.height}`);
  
//     // Mark that we've updated the layout at least once
//     if (!layoutUpdated) {
//       setLayoutUpdated(true);
//     }
//   };

  

//   const renderLandmarks = () => {
//     if (!landmarks?.landmarks || landmarks.landmarks.length === 0) {
//       console.log('No landmarks to render');
//       return null;
//     }

//       // Make sure we have valid camera dimensions
//     if (cameraViewDimensions.width <= 0 || cameraViewDimensions.height <= 0) {
//       console.log('Camera view dimensions not available yet');
//       return null;
//     }

//     console.log(`🔍 Rendering ${landmarks.landmarks.length} landmarks, type: ${landmarks.type}`);
//     console.log('Sample landmark:', landmarks.landmarks[0]);
//     console.log('Landmarks indices:', landmarks.indices);

//     // Calculate scaling factors to better fit the landmarks to the camera view
    
//     // Get landmark type and log it
//     const landmarkType = landmarks.type || 'unknown';
//     console.log(`🔍 Rendering ${landmarks.landmarks.length} landmarks, type: ${landmarkType}`);
    
    
//     // Use camera dimensions to determine scaling factor
//     const viewWidth = cameraViewDimensions.width;
//     const viewHeight = cameraViewDimensions.height;
    
    
    
//     // Calculate the viewport center
//     const viewCenterX = viewWidth / 2;
//     const viewCenterY = viewHeight / 2;
//      // Calculate the bounds of landmarks
//     const landmarkWidth = landmarks.bounds.maxX - landmarks.bounds.minX;
//     const landmarkHeight = landmarks.bounds.maxY - landmarks.bounds.minY;
    
//     // Calculate the landmark center
//     const landmarkCenterX = (landmarks.bounds.minX + landmarks.bounds.maxX) / 2;
//     const landmarkCenterY = (landmarks.bounds.minY + landmarks.bounds.maxY) / 2;

//     // Target size should be proportional to view size but not too large
//     const targetWidthRatio = 0.8; // Use 60% of view width
//     const targetHeightRatio = 0.8; // Use 60% of view height
//     // console.log(`🔍 Rendering ${landmarks.landmarks.length} landmarks, type: ${landmarks.type}`);

//     const targetSize = Math.min(cameraViewDimensions.width, cameraViewDimensions.height) * 0.7;
//     const landmarkSize = Math.max(landmarkWidth, landmarkHeight);
//     const scaleFactor = targetSize / landmarkSize;

//     // Transform function for X coordinates
//     const transformX = (x: number) => {
//       return viewCenterX + (x - landmarkCenterX) * scaleFactor;
//     };
    
//     // Transform function for Y coordinates
//     const transformY = (y: number) => {
//       return viewCenterY + (y - landmarkCenterY) * scaleFactor;
//     };

//      // Choose color based on landmark type
//     const strokeColor = landmarks.type === 'reference' ? '#4CAF50' : '#FFFFFF';
//     const strokeWidth = landmarks.type === 'reference' ? "3" : "2";  // Make reference lines slightly thicker
    
//     const renderLines = (indices: number[]) => {
    
//         if (!indices || indices.length < 2) {
//         console.log('No valid indices to render lines');
//         return null;
//         }

//         return indices.map((index, i) => {
//             if (i === 0) return null;
//             const prevIndex = indices[i - 1];
//             const currentIndex = index;
        
//         // Safety check for indices
//         if (!landmarks.landmarks || 
//             prevIndex >= landmarks.landmarks.length || 
//             currentIndex >= landmarks.landmarks.length) {
//         return null;
//         }
        
//         const start = landmarks.landmarks[prevIndex];
//         const end = landmarks.landmarks[currentIndex];

//         if (!start || !end) return null;

//         return (
//           <Line
//             key={`line-${landmarks.type}-${i}`}
//             x1={transformX(start[0])}
//             y1={transformY(start[1])}
//             x2={transformX(end[0])}
//             y2={transformY(end[1])}
//             stroke={strokeColor}
//             strokeWidth={strokeWidth}
//             />
//         );
//       });
//     };

//     return (
//       <Svg style={StyleSheet.absoluteFill} onLayout={handleCameraLayout} width={cameraViewDimensions.width} 
//       height={cameraViewDimensions.height}>
//         {landmarks.indices?.jaw && renderLines(landmarks.indices.jaw)}
//         {landmarks.indices?.mouth && renderLines(landmarks.indices.mouth)}
//       </Svg>
//     );
//   };

//   // Camera permission handling
//   if (!permission) {
//     return <View style={styles.container}><Text>Loading camera permissions...</Text></View>;
//   }

//   if (!permission.granted) {
//     return (
//       <View style={styles.container}>
//         <Text style={{ textAlign: 'center' }}>We need your permission to show the camera</Text>
//         <TouchableOpacity onPress={requestPermission} style={styles.button}>
//           <Text style={styles.buttonText}>Grant Permission</Text>
//         </TouchableOpacity>
//       </View>
//     );
//   }

//   return (
//     <SafeAreaView style={styles.container}>
//       <View style={styles.statusBar}>
//         <Text style={styles.statusText}>
//           Server: {isConnected ? '✅ Connected' : '❌ Disconnected'}
//         </Text>
//         <Text style={styles.statusText}>
//           Debug: {debugInfo}
//         </Text>
//       </View>

//       <View style={styles.cameraContainer} onLayout={handleCameraLayout}>
//         <CameraView ref={cameraRef} style={styles.camera} facing={facing} onLayout={handleCameraLayout}>
//           {renderLandmarks()}
//         </CameraView>
//       </View>

//       <View style={styles.buttonsContainer}>
//       <TouchableOpacity 
//           onPress={handleToggle} 
//           style={[styles.button, cvRunning && styles.activeButton, !playingReference && styles.activeButton]}
//         >
//           <Text style={styles.buttonText}>
//             {cvRunning ? 'Turn Off' : 'Capture & Show Reference'}
//           </Text>
//         </TouchableOpacity>

//         <TouchableOpacity 
//           onPress={handlePlayReference} 
//           style={[
//             styles.button, 
//             playingReference && styles.activeButton,
//             cvRunning && styles.activeButton
//           ]}
//         >
//           <Text style={[
//             styles.buttonText
//           ]}>
//             {playingReference ? 'Stop Reference' : 'Play Reference'}
//           </Text>
//         </TouchableOpacity>
//       </View>
//     </SafeAreaView>
//   );
// };

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: 'black',
//     justifyContent: 'center',
//   },
//   cameraContainer: {
//     flex: 1,
//   },
//   camera: {
//     flex: 1,
//   },
//   buttonsContainer: {
//     flexDirection: 'row',
//     justifyContent: 'space-evenly',
//     padding: 10,
//   },
//   button: {
//     backgroundColor: '#4CAF50',
//     padding: 15,
//     borderRadius: 5,
//   },
//   activeButton: {
//     backgroundColor: '#2E7D32',
//   },
//   disabledButton: {
//     backgroundColor: '#555555',
//   },
//   buttonText: {
//     color: 'white',
//     fontSize: 16,
//   },
//   statusBar: {
//     padding: 10,
//     backgroundColor: 'black',
//   },
//   statusText: {
//     textAlign: 'center',
//     color: 'white',
//     fontSize: 12,
//   },
// });

// export default App;

//EXPO CAM SET UP

// import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
// import React, { useEffect, useRef, useState } from 'react';
// import { SafeAreaView, StyleSheet, View, TouchableOpacity, Text, Alert, Platform, Dimensions} from 'react-native';
// import Svg, { Line } from 'react-native-svg';
// import * as Device from 'expo-device';
// import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
// import { useNavigate } from "./hooks/useNavigate";
// import { useRoute } from "@react-navigation/native";


// interface LandmarksData {
//   landmarks: [number, number][] | null;
//   type: string;
//   indices: {
//     jaw: number[];
//     mouth: number[];
//   };
//   bounds: {
//     minX: number;
//     maxX: number;
//     minY: number;
//     maxY: number;
//   }
// }

// const App = () => {
//   const [facing, setFacing] = useState<CameraType>('front');
//   const cameraRef = useRef<CameraView | null>(null);
//   const ws = useRef<WebSocket | null>(null);
//   const [isConnected, setIsConnected] = useState(false);
//   const [cvRunning, setCvRunning] = useState(false);
//   const [playingReference, setPlayingReference] = useState(false);
//   const [landmarks, setLandmarks] = useState<LandmarksData | null>(null);
//   const [permission, requestPermission] = useCameraPermissions();
//   const frameIntervalRef = useRef<NodeJS.Timeout | null>(null);
//   const [serverUrl, setServerUrl] = useState('');
//   const [cameraViewDimensions, setCameraViewDimensions] = useState({ width: 0, height: 0 });
//   // Add a debug state to help troubleshoot
//   const [debugInfo, setDebugInfo] = useState<string>('');
//   const [lastLandmarkType, setLastLandmarkType] = useState<string>('none');
//   const [referenceCompleted, setReferenceCompleted] = useState(false);
//   const [frameCaptured, setFrameCaptured] = useState(false);
//   const { width: screenWidth, height: screenHeight } = Dimensions.get('window');


//   useEffect(() => {
//     // Determine appropriate server URL based on device
//     const getServerUrl = async () => {
//       // For Expo Go on physical devices, we need to use the host machine's IP address
//       const devServerUrl = Platform.select({
//         ios: Device.isDevice ?  'wss://b197-192-159-178-211.ngrok-free.app/ws' : 'ws://localhost:8000/ws' ,
//         android: Device.isDevice ? 'wss://b197-192-159-178-211.ngrok-free.app/ws' : 'ws://localhost:8000/ws' ,
//         default: 'ws://localhost:8000/ws',
//         // ios: Device.isDevice ?  'ws://10.10.89.52:8000/ws' : 'ws://localhost:8000/ws' ,
//         // android: Device.isDevice ? 'ws://10.10.89.52:8000/ws' : 'ws://localhost:8000/ws' ,
//         // default: 'ws://localhost:8000/ws',
//       });

//       setServerUrl(devServerUrl);
//     };

//     getServerUrl();
//   }, []);

//   useEffect(() => {
//     if (serverUrl) {
//       connectWebSocket();
//     }
//     return () => {
//       if (ws.current) {
//         ws.current.close();
//       }
//       if (frameIntervalRef.current) {
//         clearInterval(frameIntervalRef.current);
//       }
//     };
//   }, [serverUrl]);

//   const connectWebSocket = () => {
//     try {
//       console.log(`Attempting to connect to WebSocket at: ${serverUrl}`);
//       setDebugInfo(`Connecting to: ${serverUrl}`);
//       ws.current = new WebSocket(serverUrl);
//       ws.current.onopen = () => {
//         console.log('✅ WebSocket Connected');
//         setIsConnected(true);
//         setDebugInfo('WebSocket connected successfully');
//       };
//       ws.current.onclose = () => {
//         console.log('❌ WebSocket Disconnected');
//         setIsConnected(false);
//         setDebugInfo('WebSocket disconnected');
//         setTimeout(connectWebSocket, 3000); // Auto-reconnect
//       };
//       ws.current.onmessage = (event) => {
//         try {
//           const data = JSON.parse(event.data);
//           console.log('📩 Received from server:', data);
//           setDebugInfo(`Received ${data.type} data`);

//           if (data.type === 'landmarks') {
//             setLandmarks(data.data);
//             if (data.data?.landmarks) {
//               setLastLandmarkType(data.data.type);
//               const count = data.data.landmarks.length;
//               console.log(`Got ${data.data.landmarks.length} landmarks of type ${data.data.type}`);
//               setDebugInfo(`Got ${data.data.landmarks.length} landmarks of type ${data.data.type}`);
//               setDebugInfo(`Got ${count} ${data.data.type} landmarks`);

//             }
//           } else if (data.type === 'status') {
//             // Update both CV and reference playback states
//             setCvRunning(data.cv_running);
//             setPlayingReference(data.play_reference);
//           } else if (data.type === 'play_reference') {
//             console.log(`🎵 Play reference: ${data.value}`);
//             setPlayingReference(data.value);
//             if (!data.value) {
//               // Reference playback has completed or been stopped
//               // setReferenceCompleted(true);
//               // Clear landmarks when reference playback ends
//               // setLandmarks(null);
//               setDebugInfo('Reference playback stopped');
//             }
           
//           } else if (data.type === 'reference_completed') {
//               // New event to handle reference completion
//               setPlayingReference(false);
//               setReferenceCompleted(true);
//               setDebugInfo('Reference playback completed');
//               // Clear landmarks if desired when reference playback completes
//               // setLandmarks(null);
//           } else if (data.type === 'error') {
//             Alert.alert('Error', data.message);
//             setDebugInfo(`Error: ${data.message}`);
//           }
//         } catch (error) {
//           console.error('❌ Error parsing WebSocket message:', error);
//           setDebugInfo(`Error: ${error instanceof Error ? error.message : String(error)}`);
//         }
//       };
//       ws.current.onerror = (event: Event) => {
//         console.error('⚠️ WebSocket Error:', event);
//         setDebugInfo(`WebSocket error occurred`);
//         Alert.alert('Connection Error', 'Failed to connect to the server.');
//       };
//     } catch (error) {
//       console.error('❌ WebSocket Connection Failed:', error);
//       setDebugInfo(`Connection failed: ${error instanceof Error ? error.message : String(error)}`);
//       Alert.alert('Connection Error', 'Failed to connect to the server.');
//     }
//   };
 

  
//   // New function to capture a single frame
//   const captureSingleFrame = async () => {
//     if (!cameraRef.current || !isConnected || !ws.current || ws.current.readyState !== WebSocket.OPEN) {
//       console.log('❌ Camera or WebSocket not ready');
//       return;
//     }

//     try {
//       // Take picture with camera (silently)
//       const photo = await cameraRef.current.takePictureAsync({
//         quality: 0.5,
//         base64: true,
//         exif: false,
//         skipProcessing: true, // Helps prevent flash on some devices
//       });
  
//       if (!photo || !photo.base64) {
//         console.warn('⚠️ No valid image captured');
//         setDebugInfo('No valid image captured');
//         return;
//       }

//       // Process image before sending
//       const processedImage = await manipulateAsync(
//         photo.uri,
//         [{ resize: { width: 320 } }],
//         { base64: true, format: SaveFormat.JPEG, compress: 0.5 }
//       );

//       if (!processedImage.base64) {
//         console.warn('⚠️ Image processing failed');
//         return;
//       }

//        // Send processed image
//     ws.current.send(
//       JSON.stringify({
//         type: 'frame',
//         data: processedImage.base64,
//         single_frame: true, // Flag to indicate this is a one-time capture
//       })
//     );
    
//     console.log('📸 Single frame captured and sent');
//     return true;

//   } catch (error) {
//     console.error('❌ Error capturing frame:', error);
//     return false;

//   }
// };

//   const handleToggle = async () => {
//     if (ws.current?.readyState === WebSocket.OPEN) {
//       const newState = !cvRunning;
//       console.log(`🔄 Toggling CV: ${newState ? 'ON' : 'OFF'}`);
      
//       if (newState) {
//         // First capture a single frame
//         const frameSuccess = await captureSingleFrame();
//         if (frameSuccess) {
//           setFrameCaptured(true);
          
//           // Then toggle CV on the server
//           ws.current.send(
//             JSON.stringify({
//               type: 'toggle',
//               value: newState,
//             })
//           );

//           setCvRunning(true);
//           setPlayingReference(false); // Ensure playback is stopped
//           setReferenceCompleted(false); // Reset completed state

//           if (frameIntervalRef.current) {
//             clearInterval(frameIntervalRef.current);
//           }
//         } else {
//           Alert.alert('Camera Error', 'Failed to capture image.');
//           return;
//         }
//       } else {
//         // Turn off CV
//         ws.current.send(
//           JSON.stringify({
//             type: 'toggle',
//             value: false,
//           })
//         );
//         setCvRunning(false);
//         setPlayingReference(false);
//         setFrameCaptured(false);
//         setLandmarks(null);

//          // Stop sending frames
//          if (frameIntervalRef.current) {
//           clearInterval(frameIntervalRef.current);
//           frameIntervalRef.current = null;
//         }
//       }
//     } else {
//       Alert.alert('Connection Error', 'Server not available.');
//       connectWebSocket();
//     }
//   };

//   const handlePlayReference = () => {
//     if (ws.current?.readyState === WebSocket.OPEN) {
//       // If reference was completed before, reset the state
//       if (referenceCompleted) {
//         setReferenceCompleted(false);
//       }

//       const newPlayingState = !playingReference;
//       console.log(`🎵 Toggling Reference Playback: ${newPlayingState ? 'ON' : 'OFF'}`);


//       ws.current.send(
//         JSON.stringify({
//           type: 'play_reference',
//           value: newPlayingState,
//           play_once: true  // Add flag to indicate one-time playback

//         })
//       );
//       setPlayingReference(newPlayingState);
//       setDebugInfo(`Reference playback ${newPlayingState ? 'started' : 'stopped'}`);
//     } else {
//       Alert.alert('Connection Error', 'Server not available.');
//       connectWebSocket();
//     }
//   };

//   const [layoutUpdated, setLayoutUpdated] = useState(false);


//   const handleCameraLayout = (event: { nativeEvent: { layout: { width: number; height: number } } }) => {
//     const { width, height } = event.nativeEvent.layout;
  
//     // Determine whether the screen is in portrait or landscape mode
//     const isPortrait = screenHeight > screenWidth;
  
//     // Set camera dimensions based on orientation
//     const newCameraDimensions = isPortrait
//       ? { width: screenWidth * 0.9, height: screenHeight * 0.5 } // Portrait mode
//       : { width: screenWidth * 0.8, height: screenHeight * 0.8 }; // Landscape mode
  
//     setCameraViewDimensions(newCameraDimensions);
    
//     console.log(`📏 Camera view dimensions: ${newCameraDimensions.width}x${newCameraDimensions.height}`);
  
//     // Mark that we've updated the layout at least once
//     if (!layoutUpdated) {
//       setLayoutUpdated(true);
//     }
//   };

  

//   const renderLandmarks = () => {
//     if (!landmarks?.landmarks || landmarks.landmarks.length === 0) {
//       console.log('No landmarks to render');
//       return null;
//     }

//       // Make sure we have valid camera dimensions
//     if (cameraViewDimensions.width <= 0 || cameraViewDimensions.height <= 0) {
//       console.log('Camera view dimensions not available yet');
//       return null;
//     }

//     console.log(`🔍 Rendering ${landmarks.landmarks.length} landmarks, type: ${landmarks.type}`);
//     console.log('Sample landmark:', landmarks.landmarks[0]);
//     console.log('Landmarks indices:', landmarks.indices);

//     // Calculate scaling factors to better fit the landmarks to the camera view
    
//     // Get landmark type and log it
//     const landmarkType = landmarks.type || 'unknown';
//     console.log(`🔍 Rendering ${landmarks.landmarks.length} landmarks, type: ${landmarkType}`);
    
    
//     // Use camera dimensions to determine scaling factor
//     const viewWidth = cameraViewDimensions.width;
//     const viewHeight = cameraViewDimensions.height;
    
    
    
//     // Calculate the viewport center
//     const viewCenterX = viewWidth / 2;
//     const viewCenterY = viewHeight / 2;
//      // Calculate the bounds of landmarks
//     const landmarkWidth = landmarks.bounds.maxX - landmarks.bounds.minX;
//     const landmarkHeight = landmarks.bounds.maxY - landmarks.bounds.minY;
    
//     // Calculate the landmark center
//     const landmarkCenterX = (landmarks.bounds.minX + landmarks.bounds.maxX) / 2;
//     const landmarkCenterY = (landmarks.bounds.minY + landmarks.bounds.maxY) / 2;

//     // Target size should be proportional to view size but not too large
//     const targetWidthRatio = 0.8; // Use 60% of view width
//     const targetHeightRatio = 0.8; // Use 60% of view height
//     // console.log(`🔍 Rendering ${landmarks.landmarks.length} landmarks, type: ${landmarks.type}`);

//     const targetSize = Math.min(cameraViewDimensions.width, cameraViewDimensions.height) * 0.7;
//     const landmarkSize = Math.max(landmarkWidth, landmarkHeight);
//     const scaleFactor = targetSize / landmarkSize;

//     // Transform function for X coordinates
//     const transformX = (x: number) => {
//       return viewCenterX + (x - landmarkCenterX) * scaleFactor;
//     };
    
//     // Transform function for Y coordinates
//     const transformY = (y: number) => {
//       return viewCenterY + (y - landmarkCenterY) * scaleFactor;
//     };

//      // Choose color based on landmark type
//     const strokeColor = landmarks.type === 'reference' ? '#4CAF50' : '#FFFFFF';
//     const strokeWidth = landmarks.type === 'reference' ? "3" : "2";  // Make reference lines slightly thicker
    
//     const renderLines = (indices: number[]) => {
    
//         if (!indices || indices.length < 2) {
//         console.log('No valid indices to render lines');
//         return null;
//         }

//         return indices.map((index, i) => {
//             if (i === 0) return null;
//             const prevIndex = indices[i - 1];
//             const currentIndex = index;
        
//         // Safety check for indices
//         if (!landmarks.landmarks || 
//             prevIndex >= landmarks.landmarks.length || 
//             currentIndex >= landmarks.landmarks.length) {
//         return null;
//         }
        
//         const start = landmarks.landmarks[prevIndex];
//         const end = landmarks.landmarks[currentIndex];

//         if (!start || !end) return null;

//         return (
//           <Line
//             key={`line-${landmarks.type}-${i}`}
//             x1={transformX(start[0])}
//             y1={transformY(start[1])}
//             x2={transformX(end[0])}
//             y2={transformY(end[1])}
//             stroke={strokeColor}
//             strokeWidth={strokeWidth}
//             />
//         );
//       });
//     };

//     return (
//       <Svg style={StyleSheet.absoluteFill} onLayout={handleCameraLayout} width={cameraViewDimensions.width} 
//       height={cameraViewDimensions.height}>
//         {landmarks.indices?.jaw && renderLines(landmarks.indices.jaw)}
//         {landmarks.indices?.mouth && renderLines(landmarks.indices.mouth)}
//       </Svg>
//     );
//   };

//   // Camera permission handling
//   if (!permission) {
//     return <View style={styles.container}><Text>Loading camera permissions...</Text></View>;
//   }

//   if (!permission.granted) {
//     return (
//       <View style={styles.container}>
//         <Text style={{ textAlign: 'center' }}>We need your permission to show the camera</Text>
//         <TouchableOpacity onPress={requestPermission} style={styles.button}>
//           <Text style={styles.buttonText}>Grant Permission</Text>
//         </TouchableOpacity>
//       </View>
//     );
//   }

//   return (
//     <SafeAreaView style={styles.container}>
//       <View style={styles.statusBar}>
//         <Text style={styles.statusText}>
//           Server: {isConnected ? '✅ Connected' : '❌ Disconnected'}
//         </Text>
//         <Text style={styles.statusText}>
//           Debug: {debugInfo}
//         </Text>
//       </View>

//       <View style={styles.cameraContainer} onLayout={handleCameraLayout}>
//         <CameraView ref={cameraRef} style={styles.camera} facing={facing} onLayout={handleCameraLayout}>
//           {renderLandmarks()}
//         </CameraView>
//       </View>

//       <View style={styles.buttonsContainer}>
//       <TouchableOpacity 
//           onPress={handleToggle} 
//           style={[styles.button, cvRunning && styles.activeButton, !playingReference && styles.activeButton]}
//         >
//           <Text style={styles.buttonText}>
//             {cvRunning ? 'Turn Off' : 'Capture & Show Reference'}
//           </Text>
//         </TouchableOpacity>

//         <TouchableOpacity 
//           onPress={handlePlayReference} 
//           style={[
//             styles.button, 
//             playingReference && styles.activeButton,
//             cvRunning && styles.activeButton
//           ]}
//         >
//           <Text style={[
//             styles.buttonText
//           ]}>
//             {playingReference ? 'Stop Reference' : 'Play Reference'}
//           </Text>
//         </TouchableOpacity>
//       </View>
//     </SafeAreaView>
//   );
// };

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: 'black',
//     justifyContent: 'center',
//   },
//   cameraContainer: {
//     flex: 1,
//   },
//   camera: {
//     flex: 1,
//   },
//   buttonsContainer: {
//     flexDirection: 'row',
//     justifyContent: 'space-evenly',
//     padding: 10,
//   },
//   button: {
//     backgroundColor: '#4CAF50',
//     padding: 15,
//     borderRadius: 5,
//   },
//   activeButton: {
//     backgroundColor: '#2E7D32',
//   },
//   disabledButton: {
//     backgroundColor: '#555555',
//   },
//   buttonText: {
//     color: 'white',
//     fontSize: 16,
//   },
//   statusBar: {
//     padding: 10,
//     backgroundColor: 'black',
//   },
//   statusText: {
//     textAlign: 'center',
//     color: 'white',
//     fontSize: 12,
//   },
// });

// export default App;
