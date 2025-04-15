//Opening to separate page


import React, { useEffect, useRef, useState } from 'react';
import { SafeAreaView, StyleSheet, View, TouchableOpacity, Text, Alert, Platform, Dimensions, Switch } from 'react-native';
import { Camera, useCameraDevice, useCameraPermission } from 'react-native-vision-camera';
import { runOnJS } from 'react-native-reanimated';
import Sound from 'react-native-sound';
import Svg, { Line } from 'react-native-svg';
import * as Device from 'expo-device';
import { Audio } from 'expo-av';  // Import the Audio module
import { ActivityIndicator } from "react-native-paper";
import { useRoute } from '@react-navigation/native';
import { useNavigate } from './hooks/useNavigate'; 

interface LandmarksData {
  landmarks: [number, number][] | null;
  type: string;
  indices: {
    jaw: number[];
    mouth: number[];
  };
  bounds: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  }
  frameWidth: number;
  frameHeight: number;
}

const App = () => {
  const [facing, setFacing] = useState<'front' | 'back'>('front');
  const camera = useRef<Camera | null>(null);
  const ws = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [cvRunning, setCvRunning] = useState(true);
  const [playingReference, setPlayingReference] = useState(false);
  const [landmarks, setLandmarks] = useState<LandmarksData | null>(null);
  const { hasPermission, requestPermission } = useCameraPermission();
  const [serverUrl, setServerUrl] = useState('');
  const [cameraViewDimensions, setCameraViewDimensions] = useState({ width: 0, height: 0 });
  const [debugInfo, setDebugInfo] = useState<string>('');
  const [lastLandmarkType, setLastLandmarkType] = useState<string>('none');
  const [referenceCompleted, setReferenceCompleted] = useState(false);
  const [frameCaptured, setFrameCaptured] = useState(false);
  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
  const device = useCameraDevice(facing);
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(true);
  const [showInstructions, setShowInstructions] = useState<boolean>(false);

  

   const [preProcessedLandmarks, setPreProcessedLandmarks] = useState<LandmarksData[]>([]);
   const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
   const soundRef = useRef<Audio.Sound | null>(null);
   const animationRef = useRef<NodeJS.Timeout | null>(null);
   const audioLoadedRef = useRef<boolean>(false);

   const route = useRoute();
   const { wordSet, currentIndex, attemptNumber, scoreTracking, cvEnabled} = route.params as { wordSet: string[], currentIndex: number, attemptNumber: number, scoreTracking: number[], returnFromCv?: boolean, cvEnabled?: boolean}; 
   const { navigateTo } = useNavigate();
   

  
   // Constant for frame timing 
   const FRAME_DURATION_MS = 33; // ~30fps
  


  // const audioFiles: Record<string, Sound> = {
  //   "carrot": new Sound(require('frontend/SpeechBuds/assets/audio/carrot_audio.mp3'), Sound.MAIN_BUNDLE),
  //   "banana": new Sound(require('frontend/SpeechBuds/assets/audio/carrot_audio.mp3'), Sound.MAIN_BUNDLE),
  //   "cat": new Sound(require('frontend/SpeechBuds/assets/audio/carrot_audio.mp3'), Sound.MAIN_BUNDLE),
  // };
  // const [selectedWord, setSelectedWord] = useState<string>("carrot");  // Default to "apple" or set dynamically

  // let currentSound: Sound | null = null; // Track current playing sound
  

  useEffect(() => {
    // Determine appropriate server URL based on device
    const getServerUrl = async () => {
      // For physical devices, we need to use the host machine's IP address
      const devServerUrl = Platform.select({
        ios: Device.isDevice ? 'wss://453a-2620-101-f000-7c0-00-1-8472.ngrok-free.app/ws' : 'ws://localhost:8000/ws',
        android: Device.isDevice ? 'wss://453a-2620-101-f000-7c0-00-1-8472.ngrok-free.app/ws' : 'ws://localhost:8000/ws',
        default: 'ws://localhost:8000/ws',
      });

      setServerUrl(devServerUrl);
    };

    getServerUrl();

     // Load audio in advance
    loadAudio();
    
     return () => {
       // Clean up audio and animation when component unmounts
       cleanupResources();
    };  
  }, []);

  useEffect(() => {
    if (serverUrl) {
      connectWebSocket();
    }
    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [serverUrl]);

    // Handle animation frame updates
  useEffect(() => {
    if (playingReference && preProcessedLandmarks.length > 0) {
      startAnimationAndAudio();
    } else {
      stopAnimationAndAudio();
    }
    
    return () => {
      stopAnimationAndAudio();
    };
  }, [playingReference, preProcessedLandmarks]);

  // Handle loading state and instructions
  useEffect(() => {
    // When landmarks are received from the server, turn off loading
    if (landmarks && landmarks.landmarks && landmarks.landmarks.length > 0) {
      setLoading(false);
      if (cvRunning) {
        setShowInstructions(true);
      }
    }
    
    // If CV is turned off, hide instructions
    if (!cvRunning) {
      setShowInstructions(false);
    }
  }, [landmarks, cvRunning]);

  useEffect(() => {
    // Auto-start CV if the toggle was enabled when navigating to this page
    if (cvEnabled) {
      setCvRunning(true);
      handleToggle(true);
    }
  }, []);

  const cleanupResources = async () => {
    // Stop animation
    if (animationRef.current) {
      clearInterval(animationRef.current);
      animationRef.current = null;
    }
    
    // Unload audio
    if (soundRef.current) {
      try {
        await soundRef.current.unloadAsync();
      } catch (error) {
        console.error('Error unloading sound:', error);
      }
      soundRef.current = null;
    }
  };

  const loadAudio = async () => {
    try {
      if (!soundRef.current) {
        soundRef.current = new Audio.Sound();
        const source = require('../assets/audio/carrot_audio.mp3');
        await soundRef.current.loadAsync(source);
        audioLoadedRef.current = true;
        console.log('Audio loaded successfully');
      }
    } catch (error) {
      console.error('Error loading sound:', error);
      audioLoadedRef.current = false;
    }
  };

  const startAnimationAndAudio = async () => {
    // Reset frame index
    setCurrentFrameIndex(0);
    
    // Make sure audio is loaded
    if (!audioLoadedRef.current) {
      await loadAudio();
    }
    
    // Start animation loop
    if (animationRef.current) {
      clearInterval(animationRef.current);
    }
    
    // Play audio
    try {
      if (soundRef.current) {
        await soundRef.current.setPositionAsync(0);
        await soundRef.current.playAsync();
      }
    } catch (error) {
      console.error('Error playing sound:', error);
    }
    
    // Start frame animation
    animationRef.current = setInterval(() => {
      setCurrentFrameIndex(prevIndex => {
        const nextIndex = prevIndex + 1;
        if (nextIndex >= preProcessedLandmarks.length) {
          // End of animation
          stopAnimationAndAudio();
          setReferenceCompleted(true);
          setPlayingReference(false);
          return 0;
        }
        setLandmarks(preProcessedLandmarks[nextIndex]);
        return nextIndex;
      });
    }, FRAME_DURATION_MS);
  };

  const stopAnimationAndAudio = async () => {
    // Stop animation
    if (animationRef.current) {
      clearInterval(animationRef.current);
      animationRef.current = null;
    }
    
    // Stop audio
    try {
      if (soundRef.current) {
        await soundRef.current.stopAsync();
      }
    } catch (error) {
      // console.error('Error stopping sound:', error);
    }
  };

  const connectWebSocket = () => {
    try {
      console.log(`Attempting to connect to WebSocket at: ${serverUrl}`);
      setDebugInfo(`Connecting to: ${serverUrl}`);
      ws.current = new WebSocket(serverUrl);
      ws.current.onopen = () => {
        console.log('✅ WebSocket Connected');
        setIsConnected(true);
        setDebugInfo('WebSocket connected successfully');
      };
      ws.current.onclose = () => {
        console.log('❌ WebSocket Disconnected');
        setIsConnected(false);
        setDebugInfo('WebSocket disconnected');
        setTimeout(connectWebSocket, 3000); // Auto-reconnect
      };
      ws.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('📩 Received from server:', data);
          setDebugInfo(`Received ${data.type} data`);

          if (data.type === 'landmarks') {
            console.log('Received landmarks data:', data.data);
            setLandmarks(data.data);
            if (data.data?.landmarks) {
              setLastLandmarkType(data.data.type);
              const count = data.data.landmarks.length;
              console.log(`Got ${count} ${data.data.type} landmarks`);
              setDebugInfo(`Got ${count} ${data.data.type} landmarks`);
            }
          }  else if (data.type === 'all_landmarks') {
            // NEW: Handle receiving all pre-processed landmarks at once
            console.log(`Received ${data.landmarks.length} frames of pre-processed landmarks`);
            setPreProcessedLandmarks(data.landmarks);
            setDebugInfo(`Loaded ${data.landmarks.length} reference frames`);
            
            // Set initial landmark display
            if (data.landmarks.length > 0) {
              setLandmarks(data.landmarks[0]);
            }
          } else if (data.type === 'status') {
            // Update both CV and reference playback states
            setCvRunning(data.cv_running);
            setPlayingReference(data.play_reference);
          } else if (data.type === 'play_reference') {
            console.log(`🎵 Play reference: ${data.value}`);
            setPlayingReference(data.value);
            if (!data.value) {
              setDebugInfo('Reference playback stopped');
            }
          } else if (data.type === 'reference_completed') {
            // New event to handle reference completion
            setPlayingReference(false);
            setReferenceCompleted(true);
            setDebugInfo('Reference playback completed');
          } else if (data.type === 'error') {
            Alert.alert('Error', data.message);
            setDebugInfo(`Error: ${data.message}`);
          }
        } catch (error) {
          console.error('❌ Error parsing WebSocket message:', error);
          setDebugInfo(`Error: ${error instanceof Error ? error.message : String(error)}`);
        }
      };
      ws.current.onerror = (event: Event) => {
        console.error('⚠️ WebSocket Error:', event);
        setDebugInfo(`WebSocket error occurred`);
        Alert.alert('Connection Error', 'Failed to connect to the server.');
      };
    } catch (error) {
      console.error('❌ WebSocket Connection Failed:', error);
      setDebugInfo(`Connection failed: ${error instanceof Error ? error.message : String(error)}`);
      Alert.alert('Connection Error', 'Failed to connect to the server.');
    }
  };

  // Function to capture and process a single frame
  const captureSingleFrame = async () => {
    if (!camera.current || !isConnected || !ws.current || ws.current.readyState !== WebSocket.OPEN) {
      console.log('❌ Camera or WebSocket not ready');
      return false;
    }

    try {
      console.log('📸 Taking photo...');
      // Take a photo with low quality to minimize flash
      const photo = await camera.current.takePhoto({
        flash: 'off',
        enableShutterSound: false,
        // quality: 70,
        
      });

      if (!photo || !photo.path) {
        console.warn('⚠️ No valid image captured');
        setDebugInfo('No valid image captured');
        return false;
      }

      console.log(`📸 Photo captured at path: ${photo.path}`);

      // Read the file as base64
      const fileUri = `file://${photo.path}`;
      console.log(`📸 Reading file from URI: ${fileUri}`);
      const response = await fetch(fileUri);
      const blob = await response.blob();
      
      return new Promise<boolean>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          try {
            // Get base64 data and remove prefix
            const base64data = reader.result as string;
            const base64Image = base64data.split(',')[1];

            // Send processed image
            ws.current?.send(
              JSON.stringify({
                type: 'frame',
                data: base64Image,
                // single_frame: true,
                prepare_all_frames: true
              })
            );
            
            console.log('📸 Single frame captured and sent successfully');
            setDebugInfo('Frame sent to server');
            resolve(true);
          } catch (error) {
            console.error('❌ Error processing image data:', error);
            setDebugInfo(`Error processing image: ${error instanceof Error ? error.message : String(error)}`);
            resolve(false);
          }
        };
        reader.onerror = () => {
          console.error('❌ Error reading file');
          setDebugInfo('Error reading image file');
          resolve(false);
        };
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error('❌ Error capturing frame:', error);
      setDebugInfo(`Error capturing frame: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  };

  const handleToggle = async (newState?: boolean) => {
    const toggledState = newState !== undefined ? newState : !cvRunning;
    
    if (!toggledState) {
      // When toggling OFF, navigate back to Record page
      if (ws.current?.readyState === WebSocket.OPEN) {
        // Turn off CV on the server
        ws.current.send(
          JSON.stringify({
            type: 'toggle',
            value: false,
          })
        );
      }
      
      // Clean up resources before navigation
      cleanupResources();
      
      // Navigate back to Record screen with returnFromCv flag
      navigateTo("Record_CV", { 
        wordSet, 
        currentIndex, 
        attemptNumber, 
        scoreTracking,
        returnFromCv: false // Set to false when returning
      });
    } else {
      if (ws.current?.readyState === WebSocket.OPEN && !frameCaptured) {
        // Show loading indicator when CV starts
        setLoading(true); 
        // First capture a single frame
        setDebugInfo('Capturing frame...');
      
        const frameSuccess = await captureSingleFrame();


        if (frameSuccess) {
          setFrameCaptured(true);
          setDebugInfo('Frame captured and sent. Toggling CV...');
          
          // Then toggle CV on the server
          ws.current.send(
            JSON.stringify({
              type: 'toggle',
              value: true,
            })
          );

          setCvRunning(true);
          // setPlayingReference(false); // Ensure playback is stopped
          // setReferenceCompleted(false); // Reset completed state
        } else {
          //turn off loading if there is an error
          setLoading(false); 
          Alert.alert('Camera Error', 'Failed to capture image.');
          return;
        }
      }
    }
      // } else {
      //   // Turn off CV
      //   ws.current.send(
      //     JSON.stringify({
      //       type: 'toggle',
      //       value: false,
      //     })
      //   );
      //   setCvRunning(false);
      //   setPlayingReference(false);
      //   setFrameCaptured(false);
      //   setLandmarks(null);
      //   setPreProcessedLandmarks([]);
      //   setLoading(false);
      //   setShowInstructions(false);


    //   }
    // } else {
    //   Alert.alert('Connection Error', 'Server not available.');
    //   connectWebSocket();
    // }
  };

 
  const handlePlayReference = async () => {
    // We now handle playback locally with the pre-processed landmarks
    if (preProcessedLandmarks.length === 0) {
      Alert.alert('Not Ready', 'Reference data is still loading. Please wait.');
      return;
    }
    
    // If reference was completed before, reset the state
    if (referenceCompleted) {
      setReferenceCompleted(false);
    }

      const newPlayingState = !playingReference;
      console.log(`🎵 Toggling Reference Playback: ${newPlayingState ? 'ON' : 'OFF'}`);

     
       // **🎧 Play the selected word's audio**
      if (newPlayingState) {
      // Start local playback
      setPlayingReference(true);
      setDebugInfo('Reference playback started');
    } else {
      // Stop local playback
      setPlayingReference(false);
      setDebugInfo('Reference playback stopped');
    }
  };

  const [layoutUpdated, setLayoutUpdated] = useState(false);

  const handleCameraLayout = (event: { nativeEvent: { layout: { width: number; height: number } } }) => {
    // Get the actual layout dimensions from the event
    const { width, height } = event.nativeEvent.layout;
    
    // Determine whether the screen is in portrait or landscape mode
    const isPortrait = screenHeight > screenWidth;
    
    // Set camera dimensions to fill more of the screen
    // Use the actual layout dimensions instead of calculating from screen size
    const newCameraDimensions = {
      width: width,  // Use the full width available in the layout
      height: height  // Use the full height available in the layout
    };
    
    setCameraViewDimensions(newCameraDimensions);
    
    console.log(`📏 Camera view dimensions updated: ${newCameraDimensions.width}x${newCameraDimensions.height}`);
    
  
    // Mark that we've updated the layout at least once
    if (!layoutUpdated) {
      setLayoutUpdated(true);
    }
  };

  const renderLandmarks = () => {
        if (!landmarks?.landmarks || landmarks.landmarks.length === 0) {
          console.log('No landmarks to render');
          return null;
        }
    
        
        // // Use camera dimensions to determine scaling factor
        const viewWidth = cameraViewDimensions.width;
        const viewHeight = cameraViewDimensions.height;
        
        
        // // Calculate the viewport center
        const viewCenterX = viewWidth / 2;
        const viewCenterY = viewHeight / 2;
       
        // // Calculate the landmark center
        const landmarkCenterX = (landmarks.bounds.minX + landmarks.bounds.maxX) / 2;
        const landmarkCenterY = (landmarks.bounds.minY + landmarks.bounds.maxY) / 2;
    
        const scaleX = cameraViewDimensions.width / landmarks.frameWidth ;  // 834 / 3392 landmarks.frameWidth
        const scaleY = cameraViewDimensions.height / (landmarks.bounds.maxY - landmarks.bounds.minY) ; // 1012 / 1908 landmarks.frameHeight

        // // Transform function for X coordinates
        const transformX = (x: number) => {
          return viewCenterX + (x - landmarkCenterX) * scaleX;
        };
        
        // Transform function for Y coordinates
        const transformY = (y: number) => {
          return viewCenterY + ((y - landmarks.bounds.minY) - landmarkCenterY) * scaleY;
        };
    
         // Choose color based on landmark type
        const strokeColor = landmarks.type === 'reference' ? '#4CAF50' : '#FFFFFF';
        const strokeWidth = landmarks.type === 'reference' ? "4" : "2";  // Make reference lines slightly thicker
        
        const renderLines = (indices: number[]) => {
        
            if (!indices || indices.length < 2) {
            console.log('No valid indices to render lines');
            return null;
            }
    
            return indices.map((index, i) => {
                if (i === 0) return null;
                const prevIndex = indices[i - 1];
                const currentIndex = index;
            
            // Safety check for indices
            if (!landmarks.landmarks || 
                prevIndex >= landmarks.landmarks.length || 
                currentIndex >= landmarks.landmarks.length) {
            return null;
            }
            
            const start = landmarks.landmarks[prevIndex];
            const end = landmarks.landmarks[currentIndex];
    
            if (!start || !end) return null;
    
            return (
              <Line
                key={`line-${landmarks.type}-${i}`}
                x1={transformX(start[0])}
                y1={transformY(start[1])}
                x2={transformX(end[0])}
                y2={transformY(end[1])}
                stroke={strokeColor}
                strokeWidth={strokeWidth}
                />
            );
          });
        };
    
        return (
          <Svg style={StyleSheet.absoluteFill} onLayout={handleCameraLayout} width={cameraViewDimensions.width} 
          height={cameraViewDimensions.height}>
            {landmarks.indices?.jaw && renderLines(landmarks.indices.jaw)}
            {landmarks.indices?.mouth && renderLines(landmarks.indices.mouth)}
          </Svg>
        );
      };
  // Camera permission handling
  if (!hasPermission) {
    return (
      <View style={styles.container}>
        <Text style={{ textAlign: 'center' }}>We need your permission to show the camera</Text>
        <TouchableOpacity onPress={requestPermission} style={styles.button}>
          <Text style={styles.buttonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!device) {
    return (
      <View style={styles.container}>
        <Text style={{ textAlign: 'center' }}>Camera not available</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* <View style={styles.statusBar}>
        <Text style={styles.statusText}>
          Server: {isConnected ? '✅ Connected' : '❌ Disconnected'}
        </Text>
        <Text style={styles.statusText}>
          Debug: {debugInfo}
        </Text>
        <Text style={styles.statusText}>
          Landmarks: {landmarks ? `${landmarks.landmarks?.length || 0} (${landmarks.type})` : 'None'}
        </Text>
      </View> */}

      <View style={styles.cameraContainer} onLayout={handleCameraLayout}>
       
        <Camera
          ref={camera}
          style={styles.camera}
          device={device}
          isActive={isActive}
          photo={true}
          onLayout={handleCameraLayout}
          enableZoomGesture={false}
         
        />

          {/* add a loading animation as CV loads*/}
         {loading && cvRunning && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color= "#A4D65E" />
              <Text style={styles.loadingText}>Loading Guide...</Text>
            </View>
          )} 

          
          {/* Instruction text overlay */}
          {showInstructions && (
            <View style={styles.instructionOverlay}>
              <Text style={styles.instructionText}>
                Play the word and follow along with the lip movements of the guide!
              </Text>
            </View>
          )}

        {renderLandmarks()}
      </View>

      {/* Toggle CV */}
      <View style={styles.toggleContainer}>
        <Text style={styles.toggleLabel}>Toggle the switch on for a visual guide!</Text>
          <Switch
            value={cvRunning}
            onValueChange={(value) => handleToggle(value)}
          />
      </View>

      {/* Play Reference Landmarks */}
      {cvRunning && (
      <TouchableOpacity style={styles.CVPlayButton} onPress={handlePlayReference}>
         <Text style={styles.CVPlayButtonText}>Play Word</Text>
          </TouchableOpacity>
      )}

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
    justifyContent: 'center',
  },
  cameraContainer: {
    flex: 1,
    position: 'relative',
    margin: 0,
    padding: 0
  },
  camera: {
    flex: 1,
    margin: 0,
    padding: 0
  },
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    padding: 10,
  },
  button: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 5,
  },
  activeButton: {
    backgroundColor: '#2E7D32',
  },
  disabledButton: {
    backgroundColor: '#555555',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
  },
  statusBar: {
    padding: 10,
    backgroundColor: 'black',
  },
  statusText: {
    textAlign: 'center',
    color: 'white',
    fontSize: 12,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    // backgroundColor: 'rgba(0, 0, 0, 0.5)', // Semi-transparent background
    zIndex: 10
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    fontWeight: "bold",
    color: "#432818"
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
  instructionOverlay: {
    position: 'absolute',
    top: 20,
    left: 20,
    right: 20,
    padding: 15,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 10,
    zIndex: 5
  },
  instructionText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#FFFFFF",
    textAlign: 'center'
  }
    
});

export default App;


// // Connecting on separate page and dealing with the loading error

// import React, { useEffect, useRef, useState } from 'react';
// import { SafeAreaView, StyleSheet, View, TouchableOpacity, Text, Alert, Platform, Dimensions, Switch } from 'react-native';
// import { Camera, useCameraDevice, useCameraPermission } from 'react-native-vision-camera';
// import { runOnJS } from 'react-native-reanimated';
// import Sound from 'react-native-sound';
// import Svg, { Line } from 'react-native-svg';
// import * as Device from 'expo-device';
// import { Audio } from 'expo-av';  // Import the Audio module
// import { ActivityIndicator } from "react-native-paper";
// import { useRoute } from '@react-navigation/native';
// import { useNavigate } from './hooks/useNavigate'; 

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
//   frameWidth: number;
//   frameHeight: number;
// }

// const App = () => {
//   const [facing, setFacing] = useState<'front' | 'back'>('front');
//   const camera = useRef<Camera | null>(null);
//   const ws = useRef<WebSocket | null>(null);
//   const [isConnected, setIsConnected] = useState(false);
//   const [cvRunning, setCvRunning] = useState(true);
//   const [playingReference, setPlayingReference] = useState(false);
//   const [landmarks, setLandmarks] = useState<LandmarksData | null>(null);
//   const { hasPermission, requestPermission } = useCameraPermission();
//   const [serverUrl, setServerUrl] = useState('');
//   const [cameraViewDimensions, setCameraViewDimensions] = useState({ width: 0, height: 0 });
//   const [debugInfo, setDebugInfo] = useState<string>('');
//   const [lastLandmarkType, setLastLandmarkType] = useState<string>('none');
//   const [referenceCompleted, setReferenceCompleted] = useState(false);
//   const [frameCaptured, setFrameCaptured] = useState(false);
//   const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
//   const device = useCameraDevice(facing);
//   const [isActive, setIsActive] = useState(true);
//   const [loading, setLoading] = useState(true);
//   const [showInstructions, setShowInstructions] = useState<boolean>(false);

  

//    const [preProcessedLandmarks, setPreProcessedLandmarks] = useState<LandmarksData[]>([]);
//    const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
//    const soundRef = useRef<Audio.Sound | null>(null);
//    const animationRef = useRef<NodeJS.Timeout | null>(null);
//    const audioLoadedRef = useRef<boolean>(false);
//    const [showCenterFaceMessage, setShowCenterFaceMessage] = useState(false);
//    const messageRef = useRef<View | null>(null);

//    const route = useRoute();
//    const { wordSet, currentIndex, attemptNumber, scoreTracking, cvEnabled} = route.params as { wordSet: string[], currentIndex: number, attemptNumber: number, scoreTracking: number[], returnFromCv?: boolean, cvEnabled?: boolean}; 
//    const { navigateTo } = useNavigate();
   

  
//    // Constant for frame timing 
//    const FRAME_DURATION_MS = 33; // ~30fps
  


//   // const audioFiles: Record<string, Sound> = {
//   //   "carrot": new Sound(require('frontend/SpeechBuds/assets/audio/carrot_audio.mp3'), Sound.MAIN_BUNDLE),
//   //   "banana": new Sound(require('frontend/SpeechBuds/assets/audio/carrot_audio.mp3'), Sound.MAIN_BUNDLE),
//   //   "cat": new Sound(require('frontend/SpeechBuds/assets/audio/carrot_audio.mp3'), Sound.MAIN_BUNDLE),
//   // };
//   // const [selectedWord, setSelectedWord] = useState<string>("carrot");  // Default to "apple" or set dynamically

//   // let currentSound: Sound | null = null; // Track current playing sound
  

//   useEffect(() => {
//     // Determine appropriate server URL based on device
//     const getServerUrl = async () => {
//       // For physical devices, we need to use the host machine's IP address
//       const devServerUrl = Platform.select({
//         ios: Device.isDevice ? 'wss://a75a-192-159-178-211.ngrok-free.app/ws' : 'ws://localhost:8000/ws',
//         android: Device.isDevice ? 'wss://a75a-192-159-178-211.ngrok-free.app/ws' : 'ws://localhost:8000/ws',
//         default: 'ws://localhost:8000/ws',
//       });

//       setServerUrl(devServerUrl);
//     };

//     getServerUrl();

//      // Load audio in advance
//     loadAudio();
    
//      return () => {
//        // Clean up audio and animation when component unmounts
//        cleanupResources();
//     };  
//   }, []);

//   useEffect(() => {
//     if (serverUrl) {
//       connectWebSocket();
//     }
//     return () => {
//       if (ws.current) {
//         ws.current.close();
//       }
//     };
//   }, [serverUrl]);

//     // Handle animation frame updates
//   useEffect(() => {
//     if (playingReference && preProcessedLandmarks.length > 0) {
//       startAnimationAndAudio();
//     } else {
//       stopAnimationAndAudio();
//     }
    
//     return () => {
//       stopAnimationAndAudio();
//     };
//   }, [playingReference, preProcessedLandmarks]);

//   // Handle loading state and instructions
//   useEffect(() => {
//     // When landmarks are received from the server, turn off loading
//     if (landmarks && landmarks.landmarks && landmarks.landmarks.length > 0) {
//       setLoading(false);
//       if (cvRunning) {
//         setShowInstructions(true);
//       }
//     }
    
//     // If CV is turned off, hide instructions
//     if (!cvRunning) {
//       setShowInstructions(false);
//       setLoading(false); // Ensure loading is turned off when CV is off
//       setShowCenterFaceMessage(false); // Hide center face message when CV is off
//     }
//   }, [landmarks, cvRunning]);

//   useEffect(() => {
//     // Auto-start CV if the toggle was enabled when navigating to this page
//     if (cvEnabled) {
//       setCvRunning(true);
//       handleToggle(true);
//     }
//   }, []);

//   const cleanupResources = async () => {
//     // Stop animation
//     if (animationRef.current) {
//       clearInterval(animationRef.current);
//       animationRef.current = null;
//     }
    
//     // Unload audio
//     if (soundRef.current) {
//       try {
//         await soundRef.current.unloadAsync();
//       } catch (error) {
//         console.error('Error unloading sound:', error);
//       }
//       soundRef.current = null;
//     }
//   };

//   const loadAudio = async () => {
//     try {
//       if (!soundRef.current) {
//         soundRef.current = new Audio.Sound();
//         const source = require('../assets/audio/carrot_audio.mp3');
//         await soundRef.current.loadAsync(source);
//         audioLoadedRef.current = true;
//         console.log('Audio loaded successfully');
//       }
//     } catch (error) {
//       console.error('Error loading sound:', error);
//       audioLoadedRef.current = false;
//     }
//   };

//   const startAnimationAndAudio = async () => {
//     // Reset frame index
//     setCurrentFrameIndex(0);
    
//     // Make sure audio is loaded
//     if (!audioLoadedRef.current) {
//       await loadAudio();
//     }
    
//     // Start animation loop
//     if (animationRef.current) {
//       clearInterval(animationRef.current);
//     }
    
//     // Play audio
//     try {
//       if (soundRef.current) {
//         await soundRef.current.setPositionAsync(0);
//         await soundRef.current.playAsync();
//       }
//     } catch (error) {
//       console.error('Error playing sound:', error);
//     }
    
//     // Start frame animation
//     animationRef.current = setInterval(() => {
//       setCurrentFrameIndex(prevIndex => {
//         const nextIndex = prevIndex + 1;
//         if (nextIndex >= preProcessedLandmarks.length) {
//           // End of animation
//           stopAnimationAndAudio();
//           setReferenceCompleted(true);
//           setPlayingReference(false);
//           return 0;
//         }
//         setLandmarks(preProcessedLandmarks[nextIndex]);
//         return nextIndex;
//       });
//     }, FRAME_DURATION_MS);
//   };

//   const stopAnimationAndAudio = async () => {
//     // Stop animation
//     if (animationRef.current) {
//       clearInterval(animationRef.current);
//       animationRef.current = null;
//     }
    
//     // Stop audio
//     try {
//       if (soundRef.current) {
//         await soundRef.current.stopAsync();
//       }
//     } catch (error) {
//       // console.error('Error stopping sound:', error);
//     }
//   };

//   const connectWebSocket = () => {
//     try {
//       if (ws.current && ws.current.readyState !== WebSocket.CLOSED) {
//         console.log('Closing existing WebSocket connection before reconnecting');
//         ws.current.close();
//       }
      
//       console.log(`Attempting to connect to WebSocket at: ${serverUrl}`);
//       setDebugInfo(`Connecting to: ${serverUrl}`);
      
//       ws.current = new WebSocket(serverUrl);
      
//       // Create a timeout for connection
//       const connectionTimeout = setTimeout(() => {
//         if (ws.current && ws.current.readyState !== WebSocket.OPEN) {
//           console.log('WebSocket connection timeout');
//           setDebugInfo('Connection timeout');
//           ws.current.close();
//         }
//       }, 10000); // 10 seconds timeout

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

//         // Auto-reconnect with exponential backoff
//       if (!ws.current || ws.current.readyState === WebSocket.CLOSED) {
//         const reconnectDelay = Math.min(3000 + Math.random() * 2000, 10000);
//         console.log(`Attempting to reconnect in ${reconnectDelay}ms`);
//         setTimeout(connectWebSocket, reconnectDelay);
//       }
//       };

//       ws.current.onmessage = (event) => {
//         try {
//           const data = JSON.parse(event.data);
//           console.log('📩 Received from server:', data);
//           setDebugInfo(`Received ${data.type} data`);

//           if (data.type === 'landmarks') {
//             console.log('Received landmarks data:');
//             setLandmarks(data.data);
//             if (data.data?.landmarks) {
//               setLastLandmarkType(data.data.type);
//               const count = data.data.landmarks.length;
//               console.log(`Got ${count} ${data.data.type} landmarks`);
//               setDebugInfo(`Got ${count} ${data.data.type} landmarks`);
//             }
//           }  else if (data.type === 'all_landmarks') {
//             // NEW: Handle receiving all pre-processed landmarks at once
//             console.log(`Received ${data.landmarks.length} frames of pre-processed landmarks`);
//             setPreProcessedLandmarks(data.landmarks);
//             setDebugInfo(`Loaded ${data.landmarks.length} reference frames`);
            
//             // Set initial landmark display
//             if (data.landmarks.length > 0) {
//               setLandmarks(data.landmarks[0]);
//               setLoading(false);
//             }
//           } else if (data.type === 'status') {
//             // Update both CV and reference playback states
//             setCvRunning(data.cv_running);
//             setPlayingReference(data.play_reference);
//           } else if (data.type === 'play_reference') {
//             console.log(`🎵 Play reference: ${data.value}`);
//             setPlayingReference(data.value);
//             if (!data.value) {
//               setDebugInfo('Reference playback stopped');
//             }
//           } else if (data.type === 'reference_completed') {
//             // New event to handle reference completion
//             setPlayingReference(false);
//             setReferenceCompleted(true);
//             setDebugInfo('Reference playback completed');
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
//     // Try to reconnect after a delay
//     setTimeout(connectWebSocket, 5000);
//   }
//   };

//   // Function to capture and process a single frame
//   const captureSingleFrame = async () => {
//     if (!camera.current || !isConnected || !ws.current || ws.current.readyState !== WebSocket.OPEN) {
//       console.log('❌ Camera or WebSocket not ready');
//       return false;
//     }
  
//     try {
//       console.log('📸 Taking photo...');
//       // Take a photo with low quality to minimize flash
//       const photo = await camera.current.takePhoto({
//         flash: 'off',
//         enableShutterSound: false,
//       });
  
//       if (!photo || !photo.path) {
//         console.warn('⚠️ No valid image captured');
//         setDebugInfo('No valid image captured');
//         return false;
//       }
  
//       console.log(`📸 Photo captured at path: ${photo.path}`);
  
//       // Read the file as base64
//       const fileUri = `file://${photo.path}`;
//       console.log(`📸 Reading file from URI: ${fileUri}`);
//       const response = await fetch(fileUri);
//       const blob = await response.blob();
      
//       return new Promise<boolean>((resolve) => {
//         const reader = new FileReader();
//         reader.onload = () => {
//           try {
//             // Get base64 data and remove prefix
//             const base64data = reader.result as string;
//             const base64Image = base64data.split(',')[1];
  
//             // Create a new Promise for face check response
//             const faceCheckPromise = new Promise<boolean>((resolveCheck, rejectCheck) => {
//               const faceCheckHandler = (event: MessageEvent) => {
//                 try {
//                   const data = JSON.parse(event.data);
                  
//                   if (data.type === 'face_check_result') {
//                     // Remove this one-time listener
//                     ws.current?.removeEventListener('message', faceCheckHandler);
//                     resolveCheck(data.face_detected);
//                   }
//                 } catch (error) {
//                   console.error('Error handling face check response:', error);
//                   ws.current?.removeEventListener('message', faceCheckHandler);
//                   rejectCheck(error);
//                 }
//               };
              
//               // Add the one-time listener for face detection response
//               ws.current?.addEventListener('message', faceCheckHandler);
              
//               // Send the face check request
//               ws.current?.send(
//                 JSON.stringify({
//                   type: 'check_face',
//                   data: base64Image
//                 })
//               );
              
//               // Add timeout to prevent hanging
//               setTimeout(() => {
//                 ws.current?.removeEventListener('message', faceCheckHandler);
//                 rejectCheck(new Error('Face check timeout'));
//               }, 10000); // 10 second timeout
//             });
            
//             // Handle the face check result
//             faceCheckPromise.then(faceDetected => {
//               if (faceDetected) {
//                 // Face detected - show loading and proceed with normal frame processing
//                 setLoading(true);
//                 // Remove any "center face" message if it was showing
//                 setShowCenterFaceMessage(false);
                
//                 // Now send the frame for full processing
//                 ws.current?.send(
//                   JSON.stringify({
//                     type: 'frame',
//                     data: base64Image,
//                     prepare_all_frames: true
//                   })
//                 );
                
//                 console.log('📸 Face detected, frame sent for processing');
//                 setDebugInfo('Face detected, processing frame');
//                 resolve(true);
//               } else {
//                 // No face detected - show "center face" message
//                 setShowCenterFaceMessage(true);
//                 setLoading(false);
//                 console.log('⚠️ No face detected in frame');
//                 setDebugInfo('No face detected. Please center face on screen.');
//                 resolve(false);
//               }
//             }).catch(error => {
//               console.error('Face check failed:', error);
//               setDebugInfo(`Face check failed: ${error.message}`);
//               setShowCenterFaceMessage(true);
//               setLoading(false);
//               resolve(false);
//             });
            
//           } catch (error) {
//             console.error('❌ Error processing image data:', error);
//             setDebugInfo(`Error processing image: ${error instanceof Error ? error.message : String(error)}`);
//             resolve(false);
//           }
//         };
//         reader.onerror = () => {
//           console.error('❌ Error reading file');
//           setDebugInfo('Error reading image file');
//           resolve(false);
//         };
//         reader.readAsDataURL(blob);
//       });
//     } catch (error) {
//       console.error('❌ Error capturing frame:', error);
//       setDebugInfo(`Error capturing frame: ${error instanceof Error ? error.message : String(error)}`);
//       return false;
//     }
//   };

//   const handleToggle = async (newState?: boolean) => {
//     const toggledState = newState !== undefined ? newState : !cvRunning;
    
//     if (!toggledState) {
//       // When toggling OFF, navigate back to Record page
//       if (ws.current?.readyState === WebSocket.OPEN) {
//         // Turn off CV on the server
//         ws.current.send(
//           JSON.stringify({
//             type: 'toggle',
//             value: false,
//           })
//         );
//       }
      
//       // Clean up resources before navigation
//       cleanupResources();
      
//       // Navigate back to Record screen with returnFromCv flag
//       navigateTo("Record_CV", { 
//         wordSet, 
//         currentIndex, 
//         attemptNumber, 
//         scoreTracking,
//         returnFromCv: false // Set to false when returning
//       });
//     } else {
//       if (ws.current?.readyState === WebSocket.OPEN) {
        
//         setCvRunning(true);
//         setDebugInfo('Checking for face...');
//         setShowCenterFaceMessage(false); // Reset the center face message
      
//         // First capture a single frame
//         setDebugInfo('Capturing frame...');
      
//         const frameSuccess = await captureSingleFrame();


//         if (frameSuccess) {
//           setFrameCaptured(true);
//           setDebugInfo('Frame captured and sent. Toggling CV...');
          
//           // Then toggle CV on the server
//           ws.current.send(
//             JSON.stringify({
//               type: 'toggle',
//               value: true,
//             })
//           );

//           // setCvRunning(true);
//           // setPlayingReference(false); // Ensure playback is stopped
//           // setReferenceCompleted(false); // Reset completed state
//         } else {
//           // If no face detected, keep CV on but don't show loading
//           // "Center face" message is handled in captureSingleFrame
//           console.log('No face detected, waiting for user to center face');
//         }
//       }else {
          
//         Alert.alert('Connection Error', 'Server not available.');
//         connectWebSocket();
//         }
//       }
    
//       // } else {
//       //   // Turn off CV
//       //   ws.current.send(
//       //     JSON.stringify({
//       //       type: 'toggle',
//       //       value: false,
//       //     })
//       //   );
//       //   setCvRunning(false);
//       //   setPlayingReference(false);
//       //   setFrameCaptured(false);
//       //   setLandmarks(null);
//       //   setPreProcessedLandmarks([]);
//       //   setLoading(false);
//       //   setShowInstructions(false);


//     //   }
//     // } else {
//     //   Alert.alert('Connection Error', 'Server not available.');
//     //   connectWebSocket();
//     // }
//   };

 
//   const handlePlayReference = async () => {
//     // We now handle playback locally with the pre-processed landmarks
//     if (preProcessedLandmarks.length === 0) {
//       Alert.alert('Not Ready', 'Reference data is still loading. Please wait.');
//       return;
//     }
    
//     // If reference was completed before, reset the state
//     if (referenceCompleted) {
//       setReferenceCompleted(false);
//     }

//       const newPlayingState = !playingReference;
//       console.log(`🎵 Toggling Reference Playback: ${newPlayingState ? 'ON' : 'OFF'}`);

     
//        // **🎧 Play the selected word's audio**
//       if (newPlayingState) {
//       // Start local playback
//       setPlayingReference(true);
//       setDebugInfo('Reference playback started');
//     } else {
//       // Stop local playback
//       setPlayingReference(false);
//       setDebugInfo('Reference playback stopped');
//     }
//   };

//   const [layoutUpdated, setLayoutUpdated] = useState(false);

//   const handleCameraLayout = (event: { nativeEvent: { layout: { width: number; height: number } } }) => {
//     // Get the actual layout dimensions from the event
//     const { width, height } = event.nativeEvent.layout;
    
//     // Determine whether the screen is in portrait or landscape mode
//     const isPortrait = screenHeight > screenWidth;
    
//     // Set camera dimensions to fill more of the screen
//     // Use the actual layout dimensions instead of calculating from screen size
//     const newCameraDimensions = {
//       width: width,  // Use the full width available in the layout
//       height: height  // Use the full height available in the layout
//     };
    
//     setCameraViewDimensions(newCameraDimensions);
    
//     console.log(`📏 Camera view dimensions updated: ${newCameraDimensions.width}x${newCameraDimensions.height}`);
    
  
//     // Mark that we've updated the layout at least once
//     if (!layoutUpdated) {
//       setLayoutUpdated(true);
//     }
//   };

//   const renderLandmarks = () => {
//         if (!landmarks?.landmarks || landmarks.landmarks.length === 0) {
//           console.log('No landmarks to render');
//           return;
//         }
    
        
//         // // Use camera dimensions to determine scaling factor
//         const viewWidth = cameraViewDimensions.width;
//         const viewHeight = cameraViewDimensions.height;
        
        
//         // // Calculate the viewport center
//         const viewCenterX = viewWidth / 2;
//         const viewCenterY = viewHeight / 2;
       
//         // // Calculate the landmark center
//         const landmarkCenterX = (landmarks.bounds.minX + landmarks.bounds.maxX) / 2;
//         const landmarkCenterY = (landmarks.bounds.minY + landmarks.bounds.maxY) / 2;
    
//         const scaleX = cameraViewDimensions.width / landmarks.frameWidth ;  // 834 / 3392 landmarks.frameWidth
//         const scaleY = cameraViewDimensions.height / (landmarks.bounds.maxY - landmarks.bounds.minY) ; // 1012 / 1908 landmarks.frameHeight

//         // // Transform function for X coordinates
//         const transformX = (x: number) => {
//           return viewCenterX + (x - landmarkCenterX) * scaleX;
//         };
        
//         // Transform function for Y coordinates
//         const transformY = (y: number) => {
//           return viewCenterY + ((y - landmarks.bounds.minY) - landmarkCenterY) * scaleY;
//         };
    
//          // Choose color based on landmark type
//         const strokeColor = landmarks.type === 'reference' ? '#4CAF50' : '#FFFFFF';
//         const strokeWidth = landmarks.type === 'reference' ? "4" : "2";  // Make reference lines slightly thicker
        
//         const renderLines = (indices: number[]) => {
        
//             if (!indices || indices.length < 2) {
//             console.log('No valid indices to render lines');
//             return null;
//             }
    
//             return indices.map((index, i) => {
//                 if (i === 0) return null;
//                 const prevIndex = indices[i - 1];
//                 const currentIndex = index;
            
//             // Safety check for indices
//             if (!landmarks.landmarks || 
//                 prevIndex >= landmarks.landmarks.length || 
//                 currentIndex >= landmarks.landmarks.length) {
//             return null;
//             }
            
//             const start = landmarks.landmarks[prevIndex];
//             const end = landmarks.landmarks[currentIndex];
    
//             if (!start || !end) return null;
    
//             return (
//               <Line
//                 key={`line-${landmarks.type}-${i}`}
//                 x1={transformX(start[0])}
//                 y1={transformY(start[1])}
//                 x2={transformX(end[0])}
//                 y2={transformY(end[1])}
//                 stroke={strokeColor}
//                 strokeWidth={strokeWidth}
//                 />
//             );
//           });
//         };
    
//         return (
//           <Svg style={StyleSheet.absoluteFill} onLayout={handleCameraLayout} width={cameraViewDimensions.width} 
//           height={cameraViewDimensions.height}>
//             {landmarks.indices?.jaw && renderLines(landmarks.indices.jaw)}
//             {landmarks.indices?.mouth && renderLines(landmarks.indices.mouth)}
//           </Svg>
//         );
//       };
//   // Camera permission handling
//   if (!hasPermission) {
//     return (
//       <View style={styles.container}>
//         <Text style={{ textAlign: 'center' }}>We need your permission to show the camera</Text>
//         <TouchableOpacity onPress={requestPermission} style={styles.button}>
//           <Text style={styles.buttonText}>Grant Permission</Text>
//         </TouchableOpacity>
//       </View>
//     );
//   }

//   if (!device) {
//     return (
//       <View style={styles.container}>
//         <Text style={{ textAlign: 'center' }}>Camera not available</Text>
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
//         <Text style={styles.statusText}>
//           Landmarks: {landmarks ? `${landmarks.landmarks?.length || 0} (${landmarks.type})` : 'None'}
//         </Text>
//       </View>

//       <View style={styles.cameraContainer} onLayout={handleCameraLayout}>
       
//         <Camera
//           ref={camera}
//           style={styles.camera}
//           device={device}
//           isActive={isActive}
//           photo={true}
//           onLayout={handleCameraLayout}
//           enableZoomGesture={false}
         
//         />

//           {/* add a loading animation as CV loads*/}
//          {loading && cvRunning && (
//             <View style={styles.loadingOverlay}>
//               <ActivityIndicator size="large" color= "#A4D65E" />
//               <Text style={styles.loadingText}>Loading Guide...</Text>
//             </View>
//           )} 

          
//           {/* Instruction text overlay */}
//           {showInstructions && (
//             <View style={styles.instructionOverlay}>
//               <Text style={styles.instructionText}>
//                 Play the word and follow along with the lip movements of the guide!
//               </Text>
//             </View>
//           )}

//         {renderLandmarks()}
//       </View>

//       {/* Toggle CV */}
//       <View style={styles.toggleContainer}>
//         <Text style={styles.toggleLabel}>Toggle the switch on for a visual guide!</Text>
//           <Switch
//             value={cvRunning}
//             onValueChange={(value) => {
//               // When turning off, we should always allow it regardless of loading state
//               if (!value) {
//                 handleToggle(false);
//               } else {
//                 // Only handle toggle on if we're not already loading
//                 if (!loading) {
//                   handleToggle(true);
//                 } else {
//                   // If loading, don't allow toggling on again
//                   Alert.alert('Processing', 'Already loading visual guide, please wait...');
//                 }
//               }
//             }}
//           />
//       </View>

//       {/* Play Reference Landmarks */}
//       {cvRunning && (
//       <TouchableOpacity style={styles.CVPlayButton} onPress={handlePlayReference}>
//          <Text style={styles.CVPlayButtonText}>Play Word</Text>
//           </TouchableOpacity>
//       )}

//       {/* "Center face" message */}
//       {showCenterFaceMessage && (
//         <View style={styles.centerFaceOverlay}>
//           <Text style={styles.centerFaceText}>Center face on the screen</Text>
//         </View>
//       )}

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
//     position: 'relative',
//     margin: 0,
//     padding: 0
//   },
//   camera: {
//     flex: 1,
//     margin: 0,
//     padding: 0
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
//   loadingOverlay: {
//     position: 'absolute',
//     top: 0,
//     left: 0,
//     right: 0,
//     bottom: 0,
//     justifyContent: 'center',
//     alignItems: 'center',
//     // backgroundColor: 'rgba(0, 0, 0, 0.5)', // Semi-transparent background
//     zIndex: 10
//   },
//   loadingText: {
//     marginTop: 10,
//     fontSize: 16,
//     fontWeight: "bold",
//     color: "#432818"
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
//   instructionOverlay: {
//     position: 'absolute',
//     top: 20,
//     left: 20,
//     right: 20,
//     padding: 15,
//     backgroundColor: 'rgba(0, 0, 0, 0.7)',
//     borderRadius: 10,
//     zIndex: 5
//   },
//   instructionText: {
//     fontSize: 18,
//     fontWeight: "bold",
//     color: "#FFFFFF",
//     textAlign: 'center'
//   },
//   centerFaceOverlay: {
//     position: 'absolute',
//     top: 0,
//     left: 0,
//     right: 0,
//     bottom: 0,
//     justifyContent: 'center',
//     alignItems: 'center',
//     backgroundColor: 'rgba(0, 0, 0, 0.7)',
//     zIndex: 15
//   },
//   centerFaceText: {
//     fontSize: 24,
//     fontWeight: "bold",
//     color: "#FFFFFF",
//     textAlign: 'center'
//   }
    
// });

// export default App;





//Connecting on the same page as frontend

// import React, { useEffect, useRef, useState } from 'react';
// import { SafeAreaView, StyleSheet, View, TouchableOpacity, Text, Alert, Platform, Dimensions } from 'react-native';
// import { Camera, useCameraDevice, useCameraPermission } from 'react-native-vision-camera';
// import { runOnJS } from 'react-native-reanimated';
// import Svg, { Line } from 'react-native-svg';
// import * as Device from 'expo-device';
// import { LandmarksData } from './LandmarksData';




// export const useCVIntegration = () => {
//   const [facing, setFacing] = useState<'front' | 'back'>('front');
//   const camera = useRef<Camera | null>(null);
//   const ws = useRef<WebSocket | null>(null);
//   const [isConnected, setIsConnected] = useState(false);
//   const [cvRunning, setCvRunning] = useState(false);
//   const [playingReference, setPlayingReference] = useState(false);
//   const [landmarks, setLandmarks] = useState<LandmarksData | null>(null);
//   const { hasPermission, requestPermission } = useCameraPermission();
//   const [serverUrl, setServerUrl] = useState('');
//   const [cameraViewDimensions, setCameraViewDimensions] = useState({ width: 0, height: 0 });
//   const [debugInfo, setDebugInfo] = useState<string>('');
//   const [lastLandmarkType, setLastLandmarkType] = useState<string>('none');
//   const [referenceCompleted, setReferenceCompleted] = useState(false);
//   const [frameCaptured, setFrameCaptured] = useState(false);
//   const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
//   const device = useCameraDevice(facing);
//   const [isActive, setIsActive] = useState(true);

// //   useEffect(() => {
// //     // Determine appropriate server URL based on device
// //     const getServerUrl = async () => {
// //       // For physical devices, we need to use the host machine's IP address
// //       const devServerUrl = Platform.select({
// //         ios: Device.isDevice ? 'wss://fe44-192-159-178-211.ngrok-free.app/ws' : 'ws://localhost:8000/ws',
// //         android: Device.isDevice ? 'wss://fe44-192-159-178-211.ngrok-free.app/ws' : 'ws://localhost:8000/ws',
// //         default: 'ws://localhost:8000/ws',
// //       });

// //       setServerUrl(devServerUrl);
// //     };

// //     getServerUrl();
// //   }, []);

// //   useEffect(() => {
// //     if (serverUrl) {
// //       connectWebSocket();
// //     }
// //     return () => {
// //       if (ws.current) {
// //         ws.current.close();
// //       }
// //     };
// //   }, [serverUrl]);

//   // const connectWebSocket = () => {
//   //   const serverUrl = Platform.select({
//   //       ios: Device.isDevice 
//   //         ? 'wss://8e64-192-159-178-211.ngrok-free.app/ws' 
//   //         : 'ws://localhost:8000/ws',
//   //       android: Device.isDevice 
//   //         ? 'wss://8e64-192-159-178-211.ngrok-free.app/ws' 
//   //         : 'ws://localhost:8000/ws',
//   //       default: 'ws://localhost:8000/ws',
//   //     });

//   useEffect(() => {
//       // Determine appropriate server URL based on device
//       const getServerUrl = async () => {
//         // For physical devices, we need to use the host machine's IP address
//         const devServerUrl = Platform.select({
//           ios: Device.isDevice ? 'wss://b5b5-192-159-178-211.ngrok-free.app/ws' : 'ws://localhost:8000/ws',
//           android: Device.isDevice ? 'wss://b5b5-192-159-178-211.ngrok-free.app/ws' : 'ws://localhost:8000/ws',
//           default: 'ws://localhost:8000/ws',
//         });
  
//         setServerUrl(devServerUrl);
//       };
  
//       getServerUrl();
//     }, []);
  
//     useEffect(() => {
//       if (serverUrl) {
//         connectWebSocket();
//       }
//       return () => {
//         if (ws.current) {
//           ws.current.close();
//         }
//       };
//     }, [serverUrl]);

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
//           // handleWebSocketMessage(data);
//           console.log('📩 Received from server:', data);
//           setDebugInfo(`Received ${data.type} data`);

//           if (data.type === 'landmarks') {
//             console.log('Received landmarks data:', data.data);
//             setLandmarks(data.data);
//             if (data.data?.landmarks) {
//               setLastLandmarkType(data.data.type);
//               const count = data.data.landmarks.length;
//               console.log(`Got ${count} ${data.data.type} landmarks`);
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
//               setDebugInfo('Reference playback stopped');
//             }
//           } else if (data.type === 'reference_completed') {
//             // New event to handle reference completion
//             setPlayingReference(false);
//             setReferenceCompleted(true);
//             setDebugInfo('Reference playback completed');
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

//   // Function to capture an10a5-192-159-178-211.ngrok-free.appd process a single frame
//   const captureSingleFrame = async () => {
//     if (!camera.current || !isConnected || !ws.current || ws.current.readyState !== WebSocket.OPEN) {
//       console.log('❌ Camera or WebSocket not ready');
//       return false;
//     }

//     try {
//       console.log('📸 Taking photo...');
//       // Take a photo with low quality to minimize flash
//       const photo = await camera.current.takePhoto({
//         flash: 'off',
//         enableShutterSound: false,
//         // quality: 70,
//       });

//       if (!photo || !photo.path) {
//         console.warn('⚠️ No valid image captured');
//         setDebugInfo('No valid image captured');
//         return false;
//       }

//       console.log(`📸 Photo captured at path: ${photo.path}`);

//       // Read the file as base64
//       const fileUri = `file://${photo.path}`;
//       console.log(`📸 Reading file from URI: ${fileUri}`);
//       const response = await fetch(fileUri);
//       const blob = await response.blob();
      
//       return new Promise<boolean>((resolve) => {
//         const reader = new FileReader();
//         reader.onload = () => {
//           try {
//             // Get base64 data and remove prefix
//             const base64data = reader.result as string;
//             const base64Image = base64data.split(',')[1];

//             // Send processed image
//             ws.current?.send(
//               JSON.stringify({
//                 type: 'frame',
//                 data: base64Image,
//                 single_frame: true,
//               })
//             );
            
//             console.log('📸 Single frame captured and sent successfully');
//             setDebugInfo('Frame sent to server');
//             resolve(true);
//           } catch (error) {
//             console.error('❌ Error processing image data:', error);
//             setDebugInfo(`Error processing image: ${error instanceof Error ? error.message : String(error)}`);
//             resolve(false);
//           }
//         };
//         reader.onerror = () => {
//           console.error('❌ Error reading file');
//           setDebugInfo('Error reading image file');
//           resolve(false);
//         };
//         reader.readAsDataURL(blob);
//       });
//     } catch (error) {
//       console.error('❌ Error capturing frame:', error);
//       setDebugInfo(`Error capturing frame: ${error instanceof Error ? error.message : String(error)}`);
//       return false;
//     }
//   };

//   const handleToggle = async () => {
//     if (ws.current?.readyState === WebSocket.OPEN) {
//       const newState = !cvRunning;
//       console.log(`🔄 Toggling CV: ${newState ? 'ON' : 'OFF'}`);
      
//       if (newState) {
//         // First capture a single frame
//         setDebugInfo('Capturing frame...');
//         const frameSuccess = await captureSingleFrame();
//         if (frameSuccess) {
//           setFrameCaptured(true);
//           setDebugInfo('Frame captured and sent. Toggling CV...');
          
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
//     // Get the actual layout dimensions from the event
//     const { width, height } = event.nativeEvent.layout;
    
//     // Determine whether the screen is in portrait or landscape mode
//     const isPortrait = screenHeight > screenWidth;
    
//     // Set camera dimensions to fill more of the screen
//     // Use the actual layout dimensions instead of calculating from screen size
//     const newCameraDimensions = {
//       width: width,  // Use the full width available in the layout
//       height: height  // Use the full height available in the layout
//     };
    
//     setCameraViewDimensions(newCameraDimensions);
    
//     console.log(`📏 Camera view dimensions updated: ${newCameraDimensions.width}x${newCameraDimensions.height}`);
    
  
//     // Mark that we've updated the layout at least once
//     if (!layoutUpdated) {
//       setLayoutUpdated(true);
//     }
//   };

//   const renderLandmarks = () => {
//         if (!landmarks?.landmarks || landmarks.landmarks.length === 0) {
//           console.log('No landmarks to render');
//           return null;
//         }
    
//           // Make sure we have valid camera dimensions
//         if (cameraViewDimensions.width <= 0 || cameraViewDimensions.height <= 0) {
//           console.log('Camera view dimensions not available yet');
//           return null;
//         }
    
//         console.log(`🔍 Rendering ${landmarks.landmarks.length} landmarks, type: ${landmarks.type}`);
//         console.log('Sample landmark:', landmarks.landmarks[0]);
//         console.log('Landmarks indices:', landmarks.indices);
    
//         // Calculate scaling factors to better fit the landmarks to the camera view
        
//         // Get landmark type and log it
//         const landmarkType = landmarks.type || 'unknown';
//         console.log(`🔍 Rendering ${landmarks.landmarks.length} landmarks, type: ${landmarkType}`);
        
        
//         // Use camera dimensions to determine scaling factor
//         const viewWidth = cameraViewDimensions.width;
//         const viewHeight = cameraViewDimensions.height;
        
        
//         // Calculate the viewport center
//         const viewCenterX = viewWidth / 2;
//         const viewCenterY = viewHeight / 2;
//          // Calculate the bounds of landmarks
//         const landmarkWidth = landmarks.bounds.maxX - landmarks.bounds.minX;
//         const landmarkHeight = landmarks.bounds.maxY - landmarks.bounds.minY;
        
//         // Calculate the landmark center
//         const landmarkCenterX = (landmarks.bounds.minX + landmarks.bounds.maxX) / 2;
//         const landmarkCenterY = (landmarks.bounds.minY + landmarks.bounds.maxY) / 2;
    
//         // Target size should be proportional to view size but not too large
//         const targetWidthRatio = 0.8; // Use 60% of view width
//         const targetHeightRatio = 0.8; // Use 60% of view height
//         // console.log(`🔍 Rendering ${landmarks.landmarks.length} landmarks, type: ${landmarks.type}`);
    
//         const targetSize = Math.min(cameraViewDimensions.width, cameraViewDimensions.height) * 1;
//         const landmarkSize = Math.max(landmarkWidth, landmarkHeight);
//         const scaleFactor = targetSize / landmarkSize;
    
//         // Transform function for X coordinates
//         const transformX = (x: number) => {
//           return viewCenterX + (x - landmarkCenterX) * scaleFactor;
//         };
        
//         // Transform function for Y coordinates
//         const transformY = (y: number) => {
//           return viewCenterY + (y - landmarkCenterY) * scaleFactor;
//         };
    
//          // Choose color based on landmark type
//         const strokeColor = landmarks.type === 'reference' ? '#4CAF50' : '#FFFFFF';
//         const strokeWidth = landmarks.type === 'reference' ? "3" : "2";  // Make reference lines slightly thicker
        
//         const renderLines = (indices: number[]) => {
        
//             if (!indices || indices.length < 2) {
//             console.log('No valid indices to render lines');
//             return null;
//             }
    
//             return indices.map((index, i) => {
//                 if (i === 0) return null;
//                 const prevIndex = indices[i - 1];
//                 const currentIndex = index;
            
//             // Safety check for indices
//             if (!landmarks.landmarks || 
//                 prevIndex >= landmarks.landmarks.length || 
//                 currentIndex >= landmarks.landmarks.length) {
//             return null;
//             }
            
//             const start = landmarks.landmarks[prevIndex];
//             const end = landmarks.landmarks[currentIndex];
    
//             if (!start || !end) return null;
    
//             return (
//               <Line
//                 key={`line-${landmarks.type}-${i}`}
//                 x1={transformX(start[0])}
//                 y1={transformY(start[1])}
//                 x2={transformX(end[0])}
//                 y2={transformY(end[1])}
//                 stroke={strokeColor}
//                 strokeWidth={strokeWidth}
//                 />
//             );
//           });
//         };
    
//         return (
//           <Svg style={StyleSheet.absoluteFill} onLayout={handleCameraLayout} width={cameraViewDimensions.width} 
//           height={cameraViewDimensions.height}>
//             {landmarks.indices?.jaw && renderLines(landmarks.indices.jaw)}
//             {landmarks.indices?.mouth && renderLines(landmarks.indices.mouth)}
//           </Svg>
//         );
//       };

//       // useEffect(() => {
//       //   connectWebSocket();
//       //   return () => {
//       //     ws.current?.close();
//       //   };
//       // }, []);
      
      
//       return {
//         // States and Refs
//         camera,
//         device,
//         facing,
//         isConnected,
//         cvRunning,
//         playingReference,
//         landmarks,
//         hasPermission,
//         debugInfo,
//         cameraViewDimensions,
//         referenceCompleted,
//         ws,
//         // frameCaptured,
    
//         // Methods
//         handleToggle,
//         handlePlayReference,
//         requestPermission,
//         handleCameraLayout,
//         renderLandmarks,
//         captureSingleFrame,
//       };
//     };
    
  


// import React, { useEffect, useRef, useState } from 'react';
// import { SafeAreaView, StyleSheet, View, TouchableOpacity, Text, Alert, Platform, Dimensions } from 'react-native';
// import { Camera, useCameraDevice, useCameraPermission } from 'react-native-vision-camera';
// import { runOnJS } from 'react-native-reanimated';
// import Sound from 'react-native-sound';
// import Svg, { Line } from 'react-native-svg';
// import * as Device from 'expo-device';
// import { Audio } from 'expo-av';  // Import the Audio module



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
//   frameWidth: number;
//   frameHeight: number;
// }

// const App = () => {
//   const [facing, setFacing] = useState<'front' | 'back'>('front');
//   const camera = useRef<Camera | null>(null);
//   const ws = useRef<WebSocket | null>(null);
//   const [isConnected, setIsConnected] = useState(false);
//   const [cvRunning, setCvRunning] = useState(false);
//   const [playingReference, setPlayingReference] = useState(false);
//   const [landmarks, setLandmarks] = useState<LandmarksData | null>(null);
//   const { hasPermission, requestPermission } = useCameraPermission();
//   const [serverUrl, setServerUrl] = useState('');
//   const [cameraViewDimensions, setCameraViewDimensions] = useState({ width: 0, height: 0 });
//   const [debugInfo, setDebugInfo] = useState<string>('');
//   const [lastLandmarkType, setLastLandmarkType] = useState<string>('none');
//   const [referenceCompleted, setReferenceCompleted] = useState(false);
//   const [frameCaptured, setFrameCaptured] = useState(false);
//   const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
//   const device = useCameraDevice(facing);
//   const [isActive, setIsActive] = useState(true);

  


//   // const audioFiles: Record<string, Sound> = {
//   //   "carrot": new Sound(require('frontend/SpeechBuds/assets/audio/carrot_audio.mp3'), Sound.MAIN_BUNDLE),
//   //   "banana": new Sound(require('frontend/SpeechBuds/assets/audio/carrot_audio.mp3'), Sound.MAIN_BUNDLE),
//   //   "cat": new Sound(require('frontend/SpeechBuds/assets/audio/carrot_audio.mp3'), Sound.MAIN_BUNDLE),
//   // };
//   // const [selectedWord, setSelectedWord] = useState<string>("carrot");  // Default to "apple" or set dynamically

//   // let currentSound: Sound | null = null; // Track current playing sound
  

//   useEffect(() => {
//     // Determine appropriate server URL based on device
//     const getServerUrl = async () => {
//       // For physical devices, we need to use the host machine's IP address
//       const devServerUrl = Platform.select({
//         ios: Device.isDevice ? 'wss://a623-192-159-178-211.ngrok-free.app/ws' : 'ws://localhost:8000/ws',
//         android: Device.isDevice ? 'wss://a623-192-159-178-211.ngrok-free.app/ws' : 'ws://localhost:8000/ws',
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
//             console.log('Received landmarks data:', data.data);
//             setLandmarks(data.data);
//             if (data.data?.landmarks) {
//               setLastLandmarkType(data.data.type);
//               const count = data.data.landmarks.length;
//               console.log(`Got ${count} ${data.data.type} landmarks`);
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
//               setDebugInfo('Reference playback stopped');
//             }
//           } else if (data.type === 'reference_completed') {
//             // New event to handle reference completion
//             setPlayingReference(false);
//             setReferenceCompleted(true);
//             setDebugInfo('Reference playback completed');
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

//   // Function to capture an10a5-192-159-178-211.ngrok-free.appd process a single frame
//   const captureSingleFrame = async () => {
//     if (!camera.current || !isConnected || !ws.current || ws.current.readyState !== WebSocket.OPEN) {
//       console.log('❌ Camera or WebSocket not ready');
//       return false;
//     }

//     try {
//       console.log('📸 Taking photo...');
//       // Take a photo with low quality to minimize flash
//       const photo = await camera.current.takePhoto({
//         flash: 'off',
//         enableShutterSound: false,
//         // quality: 70,
        
//       });

//       if (!photo || !photo.path) {
//         console.warn('⚠️ No valid image captured');
//         setDebugInfo('No valid image captured');
//         return false;
//       }

//       console.log(`📸 Photo captured at path: ${photo.path}`);

//       // Read the file as base64
//       const fileUri = `file://${photo.path}`;
//       console.log(`📸 Reading file from URI: ${fileUri}`);
//       const response = await fetch(fileUri);
//       const blob = await response.blob();
      
//       return new Promise<boolean>((resolve) => {
//         const reader = new FileReader();
//         reader.onload = () => {
//           try {
//             // Get base64 data and remove prefix
//             const base64data = reader.result as string;
//             const base64Image = base64data.split(',')[1];

//             // Send processed image
//             ws.current?.send(
//               JSON.stringify({
//                 type: 'frame',
//                 data: base64Image,
//                 single_frame: true,
//               })
//             );
            
//             console.log('📸 Single frame captured and sent successfully');
//             setDebugInfo('Frame sent to server');
//             resolve(true);
//           } catch (error) {
//             console.error('❌ Error processing image data:', error);
//             setDebugInfo(`Error processing image: ${error instanceof Error ? error.message : String(error)}`);
//             resolve(false);
//           }
//         };
//         reader.onerror = () => {
//           console.error('❌ Error reading file');
//           setDebugInfo('Error reading image file');
//           resolve(false);
//         };
//         reader.readAsDataURL(blob);
//       });
//     } catch (error) {
//       console.error('❌ Error capturing frame:', error);
//       setDebugInfo(`Error capturing frame: ${error instanceof Error ? error.message : String(error)}`);
//       return false;
//     }
//   };

//   const handleToggle = async () => {
//     if (ws.current?.readyState === WebSocket.OPEN) {
//       const newState = !cvRunning;
//       console.log(`🔄 Toggling CV: ${newState ? 'ON' : 'OFF'}`);
      
//       if (newState) {
//         // First capture a single frame
//         setDebugInfo('Capturing frame...');
//         const frameSuccess = await captureSingleFrame();
//         if (frameSuccess) {
//           setFrameCaptured(true);
//           setDebugInfo('Frame captured and sent. Toggling CV...');
          
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
//       }
//     } else {
//       Alert.alert('Connection Error', 'Server not available.');
//       connectWebSocket();
//     }
//   };

//   // Enable audio playback
//   let soundObject = new Audio.Sound(); // Declare a sound object outside the function

//   const handlePlayReference = async () => {
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

//        // **🎧 Play the selected word's audio**
//       if (newPlayingState) {
//       await playAudio(); // Call playAudio to play the sound
//       }

//     } else {
//       Alert.alert('Connection Error', 'Server not available.');
//       connectWebSocket();
//     }
//   };

//   // **Helper function to play the correct audio file**
//   const playAudio = async () => {
//     try {
//       const source = require('../assets/audio/carrot_audio.mp3');  // Update this to your audio file path
  
//       // Load the sound
//       await soundObject.loadAsync(source);
  
//       // Play the sound
//       await soundObject.playAsync();
  
//       console.log('Audio played successfully');
//     } catch (error) {
//       console.log('Error loading or playing sound:', error);
//     }
// };

//   const [layoutUpdated, setLayoutUpdated] = useState(false);

//   const handleCameraLayout = (event: { nativeEvent: { layout: { width: number; height: number } } }) => {
//     // Get the actual layout dimensions from the event
//     const { width, height } = event.nativeEvent.layout;
    
//     // Determine whether the screen is in portrait or landscape mode
//     const isPortrait = screenHeight > screenWidth;
    
//     // Set camera dimensions to fill more of the screen
//     // Use the actual layout dimensions instead of calculating from screen size
//     const newCameraDimensions = {
//       width: width,  // Use the full width available in the layout
//       height: height  // Use the full height available in the layout
//     };
    
//     setCameraViewDimensions(newCameraDimensions);
    
//     console.log(`📏 Camera view dimensions updated: ${newCameraDimensions.width}x${newCameraDimensions.height}`);
    
  
//     // Mark that we've updated the layout at least once
//     if (!layoutUpdated) {
//       setLayoutUpdated(true);
//     }
//   };

//   const renderLandmarks = () => {
//         if (!landmarks?.landmarks || landmarks.landmarks.length === 0) {
//           console.log('No landmarks to render');
//           return null;
//         }
    
//         //   // Make sure we have valid camera dimensions
//         // if (cameraViewDimensions.width <= 0 || cameraViewDimensions.height <= 0) {
//         //   console.log('Camera view dimensions not available yet');
//         //   return null;
//         // }
    
//         // console.log(`🔍 Rendering ${landmarks.landmarks.length} landmarks, type: ${landmarks.type}`);
//         // console.log('Sample landmark:', landmarks.landmarks[0]);
//         // console.log('Landmarks indices:', landmarks.indices);
    
//         // // Calculate scaling factors to better fit the landmarks to the camera view
        
//         // // Get landmark type and log it
//         // const landmarkType = landmarks.type || 'unknown';
//         // console.log(`🔍 Rendering ${landmarks.landmarks.length} landmarks, type: ${landmarkType}`);
        
        
//         // // Use camera dimensions to determine scaling factor
//         const viewWidth = cameraViewDimensions.width;
//         const viewHeight = cameraViewDimensions.height;
        
        
//         // // Calculate the viewport center
//         const viewCenterX = viewWidth / 2;
//         const viewCenterY = viewHeight / 2;
//         //  // Calculate the bounds of landmarks
//         // const landmarkWidth = landmarks.bounds.maxX - landmarks.bounds.minX;
//         // const landmarkHeight = landmarks.bounds.maxY - landmarks.bounds.minY;
        
//         // // Calculate the landmark center
//         const landmarkCenterX = (landmarks.bounds.minX + landmarks.bounds.maxX) / 2;
//         const landmarkCenterY = (landmarks.bounds.minY + landmarks.bounds.maxY) / 2;
    
//         // // Target size should be proportional to view size but not too large
//         // const targetWidthRatio = 0.8; // Use 60% of view width
//         // const targetHeightRatio = 0.8; // Use 60% of view height
//         // // console.log(`🔍 Rendering ${landmarks.landmarks.length} landmarks, type: ${landmarks.type}`);
    
//         // const targetSize = Math.min(cameraViewDimensions.width, cameraViewDimensions.height) * 1;
//         // const landmarkSize = Math.max(landmarkWidth, landmarkHeight);
//         // const scaleFactor = targetSize / landmarkSize;

//         const scaleX = cameraViewDimensions.width / landmarks.frameWidth ;  // 834 / 3392 landmarks.frameWidth
//         const scaleY = cameraViewDimensions.height / (landmarks.bounds.maxY - landmarks.bounds.minY) ; // 1012 / 1908 landmarks.frameHeight

//         // const transformX = (x: number) => {
//         //   return x * scaleX;  // Scale based on backend-to-frontend width ratio
//         // };
        
//         // const transformY = (y: number) => {
//         //   return (y - landmarks.bounds.minY) * scaleY;



//         // };

//         // const transformX = (x: number) => x * cameraViewDimensions.width;
//         // const transformY = (y: number) => y * cameraViewDimensions.height;

        

    
//         // // Transform function for X coordinates
//         const transformX = (x: number) => {
//           return viewCenterX + (x - landmarkCenterX) * scaleX;
//         };
        
//         // Transform function for Y coordinates
//         const transformY = (y: number) => {
//           return viewCenterY + ((y - landmarks.bounds.minY) - landmarkCenterY) * scaleY;
//         };
    
//          // Choose color based on landmark type
//         const strokeColor = landmarks.type === 'reference' ? '#4CAF50' : '#FFFFFF';
//         const strokeWidth = landmarks.type === 'reference' ? "3" : "2";  // Make reference lines slightly thicker
        
//         const renderLines = (indices: number[]) => {
        
//             if (!indices || indices.length < 2) {
//             console.log('No valid indices to render lines');
//             return null;
//             }
    
//             return indices.map((index, i) => {
//                 if (i === 0) return null;
//                 const prevIndex = indices[i - 1];
//                 const currentIndex = index;
            
//             // Safety check for indices
//             if (!landmarks.landmarks || 
//                 prevIndex >= landmarks.landmarks.length || 
//                 currentIndex >= landmarks.landmarks.length) {
//             return null;
//             }
            
//             const start = landmarks.landmarks[prevIndex];
//             const end = landmarks.landmarks[currentIndex];
    
//             if (!start || !end) return null;
    
//             return (
//               <Line
//                 key={`line-${landmarks.type}-${i}`}
//                 x1={transformX(start[0])}
//                 y1={transformY(start[1])}
//                 x2={transformX(end[0])}
//                 y2={transformY(end[1])}
//                 stroke={strokeColor}
//                 strokeWidth={strokeWidth}
//                 />
//             );
//           });
//         };
    
//         return (
//           <Svg style={StyleSheet.absoluteFill} onLayout={handleCameraLayout} width={cameraViewDimensions.width} 
//           height={cameraViewDimensions.height}>
//             {landmarks.indices?.jaw && renderLines(landmarks.indices.jaw)}
//             {landmarks.indices?.mouth && renderLines(landmarks.indices.mouth)}
//           </Svg>
//         );
//       };
//   // Camera permission handling
//   if (!hasPermission) {
//     return (
//       <View style={styles.container}>
//         <Text style={{ textAlign: 'center' }}>We need your permission to show the camera</Text>
//         <TouchableOpacity onPress={requestPermission} style={styles.button}>
//           <Text style={styles.buttonText}>Grant Permission</Text>
//         </TouchableOpacity>
//       </View>
//     );
//   }

//   if (!device) {
//     return (
//       <View style={styles.container}>
//         <Text style={{ textAlign: 'center' }}>Camera not available</Text>
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
//         <Text style={styles.statusText}>
//           Landmarks: {landmarks ? `${landmarks.landmarks?.length || 0} (${landmarks.type})` : 'None'}
//         </Text>
//       </View>

//       <View style={styles.cameraContainer} onLayout={handleCameraLayout}>
//         <Camera
//           ref={camera}
//           style={styles.camera}
//           device={device}
//           isActive={isActive}
//           photo={true}
//           onLayout={handleCameraLayout}
//           enableZoomGesture={false}
//         />
//         {renderLandmarks()}
//       </View>

//       <View style={styles.buttonsContainer}>
//         <TouchableOpacity 
//           onPress={handleToggle} 
//           style={[styles.button, cvRunning && styles.activeButton]}
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
//             !cvRunning && styles.disabledButton
//           ]}
//           disabled={!cvRunning}
//         >
//           <Text style={styles.buttonText}>
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
//     position: 'relative',
//     margin: 0,
//     padding: 0
//   },
//   camera: {
//     flex: 1,
//     margin: 0,
//     padding: 0
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


























