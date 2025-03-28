import React, { useEffect, useRef, useState, useCallback } from 'react';
import { SafeAreaView, StyleSheet, View, TouchableOpacity, Text, Alert, Platform } from 'react-native';
import Svg, { Line } from 'react-native-svg';
import * as Device from 'expo-device';
import { Camera, useCameraDevice, useFrameProcessor } from 'react-native-vision-camera';
import { runOnJS } from 'react-native-reanimated';
// Import the file system module for reading the photo file
import * as FileSystem from 'expo-file-system';

const FRAME_RATE = 30;

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
}

const App = () => {
  const [facing, setFacing] = useState<'front' | 'back'>('front');
  const ws = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [cvRunning, setCvRunning] = useState(false);
  const [playingReference, setPlayingReference] = useState(false);
  const [landmarks, setLandmarks] = useState<LandmarksData | null>(null);
  const [hasPermission, setHasPermission] = useState(false);
  const [serverUrl, setServerUrl] = useState('');
  const [cameraViewDimensions, setCameraViewDimensions] = useState({ width: 0, height: 0 });
  const [debugInfo, setDebugInfo] = useState<string>('');
  const [lastLandmarkType, setLastLandmarkType] = useState<string>('none');
  const [isFrameProcessingActive, setIsFrameProcessingActive] = useState(false);
  
  // Get camera device - this works correctly on iOS
  const device = useCameraDevice(facing);
  
  // Request permissions on mount
  useEffect(() => {
    (async () => {
      const cameraPermission = await Camera.requestCameraPermission();
      setHasPermission(cameraPermission === 'granted');
    })();
  }, []);

  useEffect(() => {
    // Determine appropriate server URL based on device
    const getServerUrl = async () => {
      // For iOS physical devices, use the host machine's IP address
      const devServerUrl = Platform.select({
        ios: Device.isDevice ? 'wss://ff34-192-159-178-211.ngrok-free.app/ws' : 'ws://localhost:8000/ws' ,
        android: Device.isDevice ? 'wss://ff34-192-159-178-211.ngrok-free.app/ws' : 'ws://localhost:8000/ws' ,
        default: 'ws://localhost:8000/ws',
        // ios: Device.isDevice ?  'ws://10.10.89.52:8000/ws' : 'ws://localhost:8000/ws' ,
        // android: Device.isDevice ? 'ws://10.10.89.52:8000/ws' : 'ws://localhost:8000/ws' ,
        // default: 'ws://localhost:8000/ws',
      });

      setServerUrl(devServerUrl);
    };

    getServerUrl();
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

  const connectWebSocket = () => {
    try {
      ws.current = new WebSocket(serverUrl);
      ws.current.binaryType = 'arraybuffer'; // Set WebSocket to handle binary data

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
          console.log('📩 Received message type:', data.type);
          setDebugInfo(`Received ${data.type} data`);

          if (data.type === 'landmarks') {
            setLandmarks(data.data);
            if (data.data?.landmarks) {
              setLastLandmarkType(data.data.type);
              const count = data.data.landmarks.length;
              setDebugInfo(`Got ${count} ${data.data.type} landmarks`);
            }
          } else if (data.type === 'play_reference') {
            console.log(`🎵 Play reference: ${data.value}`);
            setPlayingReference(data.value);
            if (data.value && data.reference_landmarks) {
              setLandmarks(data.reference_landmarks);
            }
          } else if (data.type === 'status') {
            setCvRunning(data.cv_running);
            setPlayingReference(data.play_reference);
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

  const sendFrameToServer = useCallback((frameData: string) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(
        JSON.stringify({
          type: 'frame',
          data: frameData,
        })
      );
    }
  }, []);

  // Reference to camera for taking photos
  const cameraRef = useRef<Camera>(null);

  // Fixed implementation that avoids TypeScript errors
  const captureAndSendPhoto = useCallback(async () => {
    if (cameraRef.current && isFrameProcessingActive) {
      try {
        // Take photo with options compatible with current type definitions
        const photo = await cameraRef.current.takePhoto({});
        
        // Read the photo file as binary data
        const fileUri = photo.path; // Path to the captured photo
        const response = await fetch(fileUri);
        const blob = await response.blob(); // Convert to Blob
        //log blob
        console.log("Blob size:", blob.size);
        console.log("Blob type:", blob.type);

        // Convert Blob to ArrayBuffer using FileReader
        const arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            if (reader.result instanceof ArrayBuffer) {
              resolve(reader.result); // Explicitly type as ArrayBuffer
            } else {
              reject(new Error("Failed to read Blob as ArrayBuffer"));
            }
          };
          reader.onerror = () => reject(new Error("Failed to read Blob as ArrayBuffer"));
          reader.readAsArrayBuffer(blob);
        });
          // Send binary data to the server
        if (ws.current?.readyState === WebSocket.OPEN) {
          console.log("Sending binary data...");
          ws.current.send(arrayBuffer);
        } else {
          console.error("WebSocket is not open.");
        }
      } catch (error) {
        console.error('Error capturing or sending photo:', error);
        setDebugInfo(`Photo capture error: ${error instanceof Error ? error.message : String(error)}`);
      }
    }    
  }, [isFrameProcessingActive]);

  // Frame processor for Vision Camera
  const frameProcessor = useFrameProcessor((frame) => {
    'worklet';
    if (!isFrameProcessingActive) return;
    
    // Process every few frames to reduce load
    if (frame.timestamp % 5 !== 0) return;
    
    try {
      // Trigger photo capture in main thread
      runOnJS(captureAndSendPhoto)();
    } catch (error) {
      runOnJS(setDebugInfo)(`Frame error: ${String(error)}`);
    }
  }, [isFrameProcessingActive, captureAndSendPhoto]);

  // Update frame processing active state based on CV running or reference playing
  useEffect(() => {
    setIsFrameProcessingActive(cvRunning || playingReference);
  }, [cvRunning, playingReference]);

  // Frame capture interval for iOS
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isFrameProcessingActive) {
      // Set up interval to capture photos at a reasonable rate (200ms)
      interval = setInterval(() => {
        captureAndSendPhoto();
      }, 1000 / FRAME_RATE);
    }
    
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isFrameProcessingActive, captureAndSendPhoto]);

  // Function to toggle camera facing
  const toggleCameraFacing = useCallback(() => {
    setFacing(current => current === 'front' ? 'back' : 'front');
  }, []);

  const handleToggle = () => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      const newState = !cvRunning;
      console.log(`🔄 Toggling CV: ${newState ? 'ON' : 'OFF'}`);
      ws.current.send(
        JSON.stringify({
          type: 'toggle',
          value: newState,
        })
      );
      setCvRunning(newState);
      if (!newState) {
        setPlayingReference(false);
      }
    } else {
      Alert.alert('Connection Error', 'Server not available.');
      connectWebSocket();
    }
  };

  const handlePlayReference = () => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      const newPlayingState = !playingReference;
      console.log(`🎵 Toggling Reference Playback: ${newPlayingState ? 'ON' : 'OFF'}`);

      if (newPlayingState) {
        ws.current.send(JSON.stringify({ type: 'toggle', value: false }));
        setCvRunning(false);
      }

      ws.current.send(
        JSON.stringify({
          type: 'play_reference',
          value: newPlayingState,
        })
      );
      setPlayingReference(newPlayingState);
      setDebugInfo(`Reference playback ${newPlayingState ? 'started' : 'stopped'}`);
    } else {
      Alert.alert('Connection Error', 'Server not available.');
      connectWebSocket();
    }
  };

  const handleCameraLayout = (event: { nativeEvent: { layout: { width: number; height: number } } }) => {
    const { width, height } = event.nativeEvent.layout;
    setCameraViewDimensions({ width, height });
    console.log(`📏 Camera view dimensions: ${width}x${height}`);
  };

  const renderLandmarks = () => {
    if (!landmarks?.landmarks || landmarks.landmarks.length === 0) {
      return null;
    }

    const scaleX = (x: number) => {
      const { minX, maxX } = landmarks.bounds || { minX: 499, maxX: 756 };
      return ((x - minX) / (maxX - minX)) * cameraViewDimensions.width;
    };

    const scaleY = (y: number) => {
      const { minY, maxY } = landmarks.bounds || { minY: 299, maxY: 525 };
      return ((y - minY) / (maxY - minY)) * cameraViewDimensions.height;
    };

    // Choose color based on landmark type
    const strokeColor = landmarks.type === 'reference' ? '#4CAF50' : '#FFFFFF';
    const strokeWidth = landmarks.type === 'reference' ? "3" : "2";
    
    const renderLines = (indices: number[]) => {
      if (!indices || indices.length < 2) {
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
            x1={scaleX(start[0])}
            y1={scaleY(start[1])}
            x2={scaleX(end[0])}
            y2={scaleY(end[1])}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
          />
        );
      });
    };

    return (
      <Svg style={StyleSheet.absoluteFill} onLayout={handleCameraLayout}>
        {landmarks.indices?.jaw && renderLines(landmarks.indices.jaw)}
        {landmarks.indices?.mouth && renderLines(landmarks.indices.mouth)}
      </Svg>
    );
  };

  // Camera permission handling
  if (!hasPermission) {
    return (
      <View style={styles.container}>
        <Text style={{ textAlign: 'center', color: 'white' }}>We need your permission to show the camera</Text>
        <TouchableOpacity onPress={() => Camera.requestCameraPermission()} style={styles.button}>
          <Text style={styles.buttonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!device) {
    return <View style={styles.container}><Text style={{color: 'white'}}>No camera device found</Text></View>;
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.statusBar}>
        <Text style={styles.statusText}>
          Server: {isConnected ? '✅ Connected' : '❌ Disconnected'}
        </Text>
        <Text style={styles.statusText}>
          Debug: {debugInfo}
        </Text>
      </View>

      <View style={styles.cameraContainer} onLayout={handleCameraLayout}>
        <Camera
          ref={cameraRef}
          style={styles.camera}
          device={device}
          isActive={true}
          frameProcessor={frameProcessor}
          photo={true}
          video={false}
          audio={false}
        >
          {renderLandmarks()}
        </Camera>
      </View>

      <View style={styles.buttonsContainer}>
        <TouchableOpacity onPress={handleToggle} style={styles.button}>
          <Text style={styles.buttonText}>
            {cvRunning ? 'Stop CV' : 'Start CV'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={handlePlayReference} style={styles.button}>
          <Text style={styles.buttonText}>
            {playingReference ? 'Stop Reference' : 'Play Reference'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={toggleCameraFacing} style={styles.button}>
          <Text style={styles.buttonText}>
            Flip Camera
          </Text>
        </TouchableOpacity>
      </View>
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
  },
  camera: {
    flex: 1,
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
});

export default App;

// import React, { useEffect, useRef, useState, useCallback } from 'react';
// import {
//   SafeAreaView,
//   StyleSheet,
//   View,
//   TouchableOpacity,
//   Text,
//   ActivityIndicator,
//   ScrollView,
// } from 'react-native';
// import { Camera, useCameraDevice } from 'react-native-vision-camera';
// import { useFrameProcessor, Frame } from 'react-native-vision-camera';
// import Svg, { Circle } from 'react-native-svg';
// import { FilesetResolver, FaceLandmarker } from '@mediapipe/tasks-vision';
// import { runOnJS } from 'react-native-reanimated';
// import { Audio } from 'expo-av';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// // Add this after your imports
// import { NativeModules, Platform } from 'react-native';
// import { enableLayoutAnimations } from 'react-native-reanimated';
// enableLayoutAnimations(true);
// import { Worklets } from 'react-native-worklets-core';


// // Add this before your component definition
// // This ensures all native modules are defined even if empty
// Object.keys(NativeModules).forEach(key => {
//   if (NativeModules[key] === undefined) {
//     NativeModules[key] = {};
//   }
// });

// // Add this at the top of your file
// class ImageDataPolyfill {
//   data: Uint8ClampedArray;
//   width: number;
//   height: number;
//   colorSpace: PredefinedColorSpace;

//   constructor(data: Uint8ClampedArray, width: number, height: number) {
//     'worklet';
//     this.data = data;
//     this.width = width;
//     this.height = height;
//     this.colorSpace = "srgb"; // Default colorSpace for browser compatibility
//   }
// }

// // Configuration
// const CONFIG = {
//   SERVER_URL: 'ws://10.10.89.52:8000/ws', // Change this to your server's address
//   LANDMARKS_STORAGE_KEY: 'facial_landmarks_config',
//   RECONNECT_INTERVAL: 3000,
//   FRAME_SAMPLE_RATE: 2, // Process every Nth frame for performance
//   DISPLAY_DEBUG_INFO: __DEV__, // Show debug info in development mode
//   USE_SERVER_LANDMARKS: true, // Use landmarks from server when available
//   LOCAL_DETECTION_QUALITY: 0.5, // Lower value = faster but less accurate
// };

// // Types
// interface Landmark {
//   x: number;
//   y: number;
//   z?: number;
// }

// interface LandmarksData {
//   landmarks: [number, number][] | null;
//   type: string;
//   indices?: {
//     jaw: number[];
//     mouth: number[];
//   };
//   frame?: number;
// }

// interface ServerConfig {
//   indices: {
//     jaw: number[];
//     mouth: number[];
//   };
//   frameCount: number;
// }

// // Initialize Face Landmarker
// const initializeFaceLandmarker = async () => {
//   const vision = await FilesetResolver.forVisionTasks(
//     'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm'
//   );
//   const faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
//     baseOptions: {
//       modelAssetPath: 'https://storage.googleapis.com/mediapipe-assets/face_landmarker.task', // Use local path if needed
//       delegate: 'GPU',
//     },
//     runningMode: 'VIDEO',
//     numFaces: 1,
//   });
//   return faceLandmarker;
// };

// const convertFrameToImageData = (frame: Frame) => {
//   'worklet'; // Mark this function as a worklet

//   // Get the raw pixel data from the frame
//   const pixelData = frame.toArrayBuffer();
//   const clampedArray = new Uint8ClampedArray(pixelData);
//   return new ImageDataPolyfill(clampedArray, frame.width, frame.height);
// };

// // Main App Component
// const App = () => {
//   // Camera and device references
//   // interface CameraDevice {
//   //   back?: CameraDevice;
//   //   front?: CameraDevice;
//   // }

//   const device = useCameraDevice('front')
//   // const device = devices.front;
//   const cameraRef = useRef<Camera>(null);

//   // Add better logging to debug the issue
//   console.log("Available camera devices:", JSON.stringify(device, null, 2));

//   // WebSocket and state
//   const ws = useRef<WebSocket | null>(null);
//   const reconnectTimeout = useRef<NodeJS.Timeout | null>(null);
//   const frameCounter = useRef<number>(0);
//   const isMounted = useRef<boolean>(true); // Track if the component is mounted

//   // App state
//   const [hasPermission, setHasPermission] = useState<boolean | null>(null);
//   const [isConnected, setIsConnected] = useState<boolean>(false);
//   const [cvRunning, setCvRunning] = useState<boolean>(false);
//   const [playingReference, setPlayingReference] = useState<boolean>(false);
//   const [landmarks, setLandmarks] = useState<LandmarksData | null>(null);
//   const [serverConfig, setServerConfig] = useState<ServerConfig | null>(null);
//   const [debugInfo, setDebugInfo] = useState<{ [key: string]: any }>({});
//   const [batteryOptimized, setBatteryOptimized] = useState<boolean>(false);
//   // MediaPipe face detection
//   const faceLandmarkerRef = useRef<FaceLandmarker | null>(null);

//   // Add this state for audio management
//   const [audio, setAudio] = useState<Audio.Sound | null>(null);
//   const [audioFilename, setAudioFilename] = useState('carrot_audio.mp3');

 
    
//   // Add this function for audio playback
 
//   const playAudio = useCallback(async () => {
//     try {
//       const { sound } = await Audio.Sound.createAsync(
//         require('../assets/audio/carrot_audio.mp3') // Update path
//       );
//       setAudio(sound);
//       await sound.playAsync();
//     } catch (error) {
//       console.error('Failed to play sound:', error);
//     }
//   }, []);
//       // Cleanup Effect
//   useEffect(() => {
//     return () => {
//       if (audio) {
//         audio.unloadAsync(); // Free memory when unmounting
//       }
//     };
//   }, [audio]);

//   // At the top of your component
//   useEffect(() => {
//     const checkCameraAvailability = async () => {
//       try {
//         // Check if the library is available at all
//         console.log("Camera module:", Camera ? "Available" : "Not available");
        
//         // Log all available devices
//         const availableDevices = await Camera.getAvailableCameraDevices();
//         console.log("Available camera devices:", JSON.stringify(availableDevices, null, 2));
        
//         // Check permissions explicitly
//         const cameraPermission = await Camera.getCameraPermissionStatus();
//         console.log("Camera permission status:", cameraPermission);
        
//         // Try to request permission and log the result
//         const newPermission = await Camera.requestCameraPermission();
//         console.log("New camera permission after request:", newPermission);
//       } catch (error) {
//         console.error("Error in camera availability check:", error);
//       }
//     };
    
//     checkCameraAvailability();
//   }, []);

//   // Request camera permissions
//   useEffect(() => {
//     (async () => {
//       try {
//         const cameraPermission = await Camera.requestCameraPermission();
//         console.log("Camera Permission Status:", cameraPermission);
        
//         if (cameraPermission !== 'granted') {
//           console.error("Camera permission was not granted");
//           // Handle this case more explicitly
//         }
        
//         // Also check for microphone permission since you're using it
//         const micPermission = await Camera.requestMicrophonePermission();
//         console.log("Microphone Permission Status:", micPermission);
        
//         if (isMounted.current) {
//           setHasPermission(cameraPermission === 'granted');
//         }
//       } catch (error) {
//         console.error("Error requesting permissions:", error);
//       }
      
//     })();

//     return () => {
//       isMounted.current = false; // Cleanup on unmount
//     };
//   }, []);


//   // Initialize Face Landmarker
//   useEffect(() => {
//     const initialize = async () => {
//       faceLandmarkerRef.current = await initializeFaceLandmarker();
//     };
//     initialize();
//   }, []);

//   // WebSocket Connection
//   useEffect(() => {
//     const connectWebSocket = () => {
//       try {
//         const socketUrl = CONFIG.SERVER_URL;
//         console.log('🔗 Connecting to WebSocket:', socketUrl);
//         if (isMounted.current) {
//           setDebugInfo(prev => ({ ...prev, connection: 'Connecting...' }));
//         }

//         ws.current = new WebSocket(socketUrl);

//         ws.current.onopen = () => {
//           console.log('✅ WebSocket Connected');
//           if (isMounted.current) {
//             setIsConnected(true);
//             setDebugInfo(prev => ({ ...prev, connection: 'Connected' }));
            
//           }
//         };

//         ws.current.onclose = () => {
//           console.log('❌ WebSocket Disconnected');
//           if (isMounted.current) {
//             setIsConnected(false);
//             setDebugInfo(prev => ({ ...prev, connection: 'Disconnected' }));
//           }

//           // Attempt to reconnect after interval
//           if (!reconnectTimeout.current) {
//             reconnectTimeout.current = setTimeout(() => {
//               reconnectTimeout.current = null;
//               connectWebSocket();
//             }, CONFIG.RECONNECT_INTERVAL);
//           }
//         };

//         ws.current.onerror = (error) => {
//           console.error('WebSocket Error:', error);
//           if (isMounted.current) {
//             setDebugInfo(prev => ({ ...prev, connection: `Error: ${error}` }));
//           }
//         };

//         ws.current.onmessage = (event) => {
//           const data = JSON.parse(event.data);
//           if (isMounted.current) {
//             switch (data.type) {
//               case 'config':
//                 setServerConfig(data);
//                 break;
//               case 'reference_landmarks':
//                 setLandmarks({
//                   landmarks: data.landmarks,
//                   type: 'reference',
//                   indices: data.indices || serverConfig?.indices,
//                   frame: data.frame,
//                 });
//                 setDebugInfo(prev => ({ ...prev, refFrame: data.frame }));
//                 break;
//               case 'processed_landmarks':
//                 if (CONFIG.USE_SERVER_LANDMARKS) {
//                   setLandmarks({
//                     landmarks: data.landmarks,
//                     type: 'user',
//                     indices: data.indices || serverConfig?.indices,
//                   });
//                 }
//                 break;
//               case 'play_reference_ack':
//                 console.log(`🎵 Server ${data.value ? 'started' : 'stopped'} reference playback`);
//                 break;
//               case 'pong':
//                 setDebugInfo(prev => ({
//                   ...prev,
//                   ping: `${Date.now() - data.timestamp}ms`,
//                 }));
//                 break;
//               case 'start_audio':
//                 console.log('🔊 Received audio sync signal from server');  
//                 if (playingReference) {
//                   // You might use react-native-sound or similar library
//                   playAudio();
//                   setDebugInfo(prev => ({ ...prev, lastAudioSync: new Date().toISOString() }));
//                 }
//                 break;
//               default:
//                 console.log('📬 Received unknown message type:', data.type);
//             }
//           }
//         };
//       } catch (error) {
//         console.error('Failed to connect WebSocket:', error);
//         if (isMounted.current) {
//           setDebugInfo(prev => ({ ...prev, connection: `Error: ${error}` }));
//         }

//         // Attempt to reconnect after interval
//         if (!reconnectTimeout.current) {
//           reconnectTimeout.current = setTimeout(() => {
//             reconnectTimeout.current = null;
//             connectWebSocket();
//           }, CONFIG.RECONNECT_INTERVAL);
//         }
//       }
//     };

//     connectWebSocket();

//     // Clean up on unmount
//     return () => {
//       if (reconnectTimeout.current) {
//         clearTimeout(reconnectTimeout.current);
//       }
//       if (ws.current) {
//         ws.current.close();
//       }
//     };
//   }, []);

//     // React to changes in playingReference state
//   useEffect(() => {
//     if (ws.current?.readyState === WebSocket.OPEN) {
//       ws.current.send(
//         JSON.stringify({
//           type: 'play_reference',
//           value: playingReference,
//         })
//       );
//       console.log(`🎵 Sent play_reference ${playingReference ? 'start' : 'stop'} command to server`);
//     }
//   }, [playingReference]);
  
   

//   // Send landmarks to server
//   const sendLandmarksToServer = useCallback((landmarks: [number, number][]) => {
//     if (ws.current?.readyState === WebSocket.OPEN) {
//       ws.current.send(
//         JSON.stringify({
//           type: 'user_landmarks',
//           landmarks: landmarks,
//         })
//       );
//     }
//   }, []);

//   // Worklet-compatible functions
//   const setCvRunningJS = Worklets.createRunOnJS(setCvRunning);
//   const setLandmarksJS = Worklets.createRunOnJS(setLandmarks);
//   const sendLandmarksToServerJS = Worklets.createRunOnJS(sendLandmarksToServer);
//   const setDebugInfoJS = Worklets.createRunOnJS(setDebugInfo);

//   // Frame processor for camera
//   const frameProcessor = useFrameProcessor((frame) => {
//     'worklet';
//     console.log('Frame processor called');


//     try {
//       // Skip frames for performance
//       frameCounter.current = (frameCounter.current + 1) % CONFIG.FRAME_SAMPLE_RATE;
//       if (frameCounter.current !== 0) return;

//       // Skip if CV is already running
//       if (cvRunning) return;

//       // Signal that we're processing a frame
//       setCvRunningJS(true);

//       // Process the frame with MediaPipe Face Detection
//       if (faceLandmarkerRef.current) {
//         const imageData = convertFrameToImageData(frame);
//         console.log('Image data:', imageData); // Debugging

//          // Use a timestamp instead of performance.now() which may not be available in React Native
//         const timestamp = Date.now();
//         const results = faceLandmarkerRef.current.detectForVideo(imageData, timestamp);
//         console.log('Face detection results:', results); // Debugging


//         if (results.faceLandmarks && results.faceLandmarks.length > 0) {
//           const detectedLandmarks = results.faceLandmarks[0].map((landmark: Landmark) => [landmark.x, landmark.y] as [number, number]);
//           console.log('Detected landmarks:', detectedLandmarks); // Debugging

//           // Update landmarks state
//           setLandmarksJS({
//             landmarks: detectedLandmarks,
//             type: 'user',
//           });

//           // Send landmarks to server
//           sendLandmarksToServerJS(detectedLandmarks);
//         }
//       }
//     } catch (error) {
//       console.error('Frame processor error:', error);
//     } finally {
//       setCvRunningJS(false);
//     }
//   }, [cvRunning]);

//   // Render facial landmarks
//   const renderLandmarks = useCallback(() => {
//     if (!landmarks || !landmarks.landmarks) return null;

//     const width = 1;
//     const height = 1;
//     const color = landmarks.type === 'reference' ? '#FF2D55' : '#00E676';

//     return (
//       <Svg style={StyleSheet.absoluteFill}>
//         {landmarks.landmarks.map((point, index) => (
//           <Circle
//             key={`point-${index}`}
//             cx={point[0] * width}
//             cy={point[1] * height}
//             r={2}
//             fill={color}
//             opacity={0.7}
//           />
//         ))}
//       </Svg>
//     );
//   }, [landmarks]);

//   // Render debug info
//   const renderDebugInfo = useCallback(() => {
//     if (!CONFIG.DISPLAY_DEBUG_INFO) return null;

//     return (
//       <View style={styles.debugContainer}>
//         <ScrollView style={styles.debugScroll}>
//           <Text style={styles.debugTitle}>Debug Information</Text>
//           <Text style={styles.debugText}>Connection: {debugInfo.connection || 'Unknown'}</Text>
//           <Text style={styles.debugText}>Face Detection: Ready</Text>
//           <Text style={styles.debugText}>Ping: {debugInfo.ping || 'N/A'}</Text>
//           <Text style={styles.debugText}>Battery Optimized: {batteryOptimized ? 'Yes' : 'No'}</Text>
//           {playingReference && (
//             <Text style={styles.debugText}>Reference Frame: {debugInfo.refFrame || 0}</Text>
//           )}
//           <Text style={styles.debugText}>Landmarks Type: {landmarks?.type || 'None'}</Text>
//           <Text style={styles.debugText}>Landmarks Count: {landmarks?.landmarks?.length || 0}</Text>
//         </ScrollView>
//       </View>
//     );
//   }, [debugInfo, landmarks, batteryOptimized, playingReference]);

//   // Render loading or permission UI
//   if (hasPermission === null) {
//     return (
//       <SafeAreaView style={styles.container}>
//         <ActivityIndicator size="large" color="#4285F4" />
//         <Text style={styles.loadingText}>Requesting camera permission...</Text>
//       </SafeAreaView>
//     );
//   }

//   if (hasPermission === false) {
//     return (
//       <SafeAreaView style={styles.container}>
//         <Text style={styles.errorText}>Camera permission is required for this app.</Text>
//         <TouchableOpacity
//           style={styles.button}
//           onPress={() => Camera.requestCameraPermission()}
//         >
//           <Text style={styles.buttonText}>Request Permission</Text>
//         </TouchableOpacity>
//       </SafeAreaView>
//     );
//   }

//   if (!device) {
//     console.error("No camera device found in devices:", device);
//     return (
//       <SafeAreaView style={styles.container}>
//         <Text style={styles.errorText}>No camera device found.</Text>
//       </SafeAreaView>
//     );
//   }

//   return (
//     <SafeAreaView style={styles.container}>
//       {/* Camera */}
//       <View style={styles.cameraContainer}>
//         <Camera
//           ref={cameraRef}
//           style={StyleSheet.absoluteFill}
//           device={device}
//           isActive={true}
//           frameProcessor={frameProcessor}
//           // frameProcessorFps={batteryOptimized ? 10 : 20} // Adjust based on optimization state
//           />

//         {/* Overlay landmarks */}
//         {renderLandmarks()}

//         {/* Status indicator */}
//         <View
//           style={[
//             styles.statusIndicator,
//             { backgroundColor: isConnected ? '#4CAF50' : '#F44336' },
//           ]}
//         />

//         {/* Playing reference indicator */}
//         {playingReference && (
//           <View style={styles.playingIndicator}>
//             <Text style={styles.playingText}>Playing Reference</Text>
//           </View>
//         )}
//       </View>

//       {/* Controls */}
//       <View style={styles.controlsContainer}>
//         {/* Play/Stop Reference Button */}
//         <TouchableOpacity
//           style={[styles.button, playingReference ? styles.stopButton : styles.playButton]}
//           onPress={() => setPlayingReference(!playingReference)}
//           disabled={!isConnected}
//         >
//           <Text style={styles.buttonText}>
//             {playingReference ? 'Stop Reference' : 'Play Reference'}
//           </Text>
//         </TouchableOpacity>

//         {/* Battery Optimization Button */}
//         <TouchableOpacity
//           style={[styles.button, batteryOptimized ? styles.optimizedButton : styles.normalButton]}
//           onPress={() => setBatteryOptimized(!batteryOptimized)}
//         >
//           <Text style={styles.buttonText}>
//             {batteryOptimized ? 'Battery Saving: ON' : 'Battery Saving: OFF'}
//           </Text>
//         </TouchableOpacity>

//         {/* Reconnect Button (only show when disconnected) */}
//         {!isConnected && (
//           <TouchableOpacity
//             style={[styles.button, styles.reconnectButton]}
//             onPress={() => ws.current?.close()}
//           >
//             <Text style={styles.buttonText}>Reconnect to Server</Text>
//           </TouchableOpacity>
//         )}
//       </View>

//       {/* Debug Info */}
//       {renderDebugInfo()}
//     </SafeAreaView>
//   );
// };

// // Styles
// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: '#121212',
//   },
//   cameraContainer: {
//     flex: 1,
//     position: 'relative',
//   },
//   controlsContainer: {
//     padding: 16,
//     backgroundColor: 'rgba(0, 0, 0, 0.8)',
//     borderTopWidth: 1,
//     borderTopColor: '#333',
//   },
//   button: {
//     padding: 12,
//     borderRadius: 8,
//     marginVertical: 8,
//     alignItems: 'center',
//   },
//   playButton: {
//     backgroundColor: '#4285F4',
//   },
//   stopButton: {
//     backgroundColor: '#DB4437',
//   },
//   optimizedButton: {
//     backgroundColor: '#0F9D58',
//   },
//   normalButton: {
//     backgroundColor: '#4285F4',
//   },
//   reconnectButton: {
//     backgroundColor: '#F4B400',
//   },
//   buttonText: {
//     color: 'white',
//     fontWeight: 'bold',
//     fontSize: 16,
//   },
//   statusIndicator: {
//     position: 'absolute',
//     top: 12,
//     right: 12,
//     width: 12,
//     height: 12,
//     borderRadius: 6,
//   },
//   playingIndicator: {
//     position: 'absolute',
//     top: 12,
//     left: 12,
//     backgroundColor: 'rgba(0, 0, 0, 0.7)',
//     paddingHorizontal: 8,
//     paddingVertical: 4,
//     borderRadius: 4,
//   },
//   playingText: {
//     color: '#FF2D55',
//     fontWeight: 'bold',
//   },
//   debugContainer: {
//     maxHeight: 200,
//     backgroundColor: 'rgba(0, 0, 0, 0.8)',
//     borderTopWidth: 1,
//     borderTopColor: '#333',
//   },
//   debugScroll: {
//     padding: 8,
//   },
//   debugTitle: {
//     color: 'white',
//     fontWeight: 'bold',
//     marginBottom: 4,
//   },
//   debugText: {
//     color: '#AAAAAA',
//     fontSize: 12,
//     marginBottom: 2,
//   },
//   loadingText: {
//     color: 'white',
//     margin: 20,
//     textAlign: 'center',
//   },
//   subText: {
//     color: '#AAAAAA',
//     textAlign: 'center',
//   },
//   errorText: {
//     color: '#DB4437',
//     margin: 20,
//     textAlign: 'center',
//   },
// });

// export default App;




// import React, { useEffect, useRef, useState, useCallback } from 'react';
// import { 
//   SafeAreaView, 
//   StyleSheet, 
//   View, 
//   TouchableOpacity, 
//   Text, 
//   Alert,
//   ActivityIndicator,
//   ScrollView
// } from 'react-native';
// import { Camera, useCameraDevice, useFrameProcessor } from 'react-native-vision-camera';
// import Svg, { Line, Circle } from 'react-native-svg';
// import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
// import { runOnJS } from 'react-native-reanimated';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import type { Frame } from 'react-native-vision-camera';

// // Configuration
// const CONFIG = {
//   SERVER_URL: 'ws://10.10.89.52:8000/ws',  // Change this to your server's address
//   LANDMARKS_STORAGE_KEY: 'facial_landmarks_config',
//   RECONNECT_INTERVAL: 3000,
//   FRAME_SAMPLE_RATE: 2,  // Process every Nth frame for performance
//   DISPLAY_DEBUG_INFO: __DEV__,  // Show debug info in development mode
//   USE_SERVER_LANDMARKS: true,   // Use landmarks from server when available
//   LOCAL_DETECTION_QUALITY: 0.5  // Lower value = faster but less accurate
// };

// // Types
// interface LandmarksData {
//   landmarks: [number, number][] | null;
//   type: string;
//   indices?: {
//     jaw: number[];
//     mouth: number[];
//   };
//   frame?: number;
// }

// interface ServerConfig {
//   indices: {
//     jaw: number[];
//     mouth: number[];
//   };
//   frameCount: number;
// }

// // Main App Component
// const App = () => {
//   // Camera and device references
//   const device = useCameraDevice('front');
//   const cameraRef = useRef<Camera>(null);
  
//   // WebSocket and state
//   const ws = useRef<WebSocket | null>(null);
//   const reconnectTimeout = useRef<NodeJS.Timeout | null>(null);
//   const frameCounter = useRef<number>(0);
//   const isMounted = useRef<boolean>(true); // Track if the component is mounted
  
//   // App state
//   const [hasPermission, setHasPermission] = useState<boolean | null>(null);
//   const [isConnected, setIsConnected] = useState<boolean>(false);
//   const [cvRunning, setCvRunning] = useState<boolean>(false);
//   const [playingReference, setPlayingReference] = useState<boolean>(false);
//   const [landmarks, setLandmarks] = useState<LandmarksData | null>(null);
//   const [serverConfig, setServerConfig] = useState<ServerConfig | null>(null);
//   const [debugInfo, setDebugInfo] = useState<{ [key: string]: any }>({});
//   const [batteryOptimized, setBatteryOptimized] = useState<boolean>(false);
  
//   // MediaPipe face detection
//   const faceLandmarkerRef = useRef<FaceLandmarker | null>(null);
//   const [faceDetectionReady, setFaceDetectionReady] = useState<boolean>(false);

//   // Request camera permissions
//   useEffect(() => {
//     (async () => {
//       const cameraPermission = await Camera.requestCameraPermission();
//       if (isMounted.current) {
//         setHasPermission(cameraPermission === 'granted');
//       }
//     })();

//     return () => {
//       isMounted.current = false; // Cleanup on unmount
//     };
//   }, []);

//   // Initialize MediaPipe Face Landmarker
//   useEffect(() => {
//     const initializeFaceLandmarker = async () => {
//       try {
//         console.log('Initializing Face Landmarker...');
//         if (isMounted.current) {
//           setDebugInfo(prev => ({ ...prev, faceDetection: 'Initializing...' }));
//         }

//         const filesetResolver = await FilesetResolver.forVisionTasks(
//           'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm'
//         );
        
//         const faceLandmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
//           baseOptions: {
//             modelAssetPath: 'https://storage.googleapis.com/mediapipe-assets/face_landmarker.task',
//             delegate: 'GPU'
//           },
//           runningMode: 'VIDEO',
//           numFaces: 1,
//           minFaceDetectionConfidence: CONFIG.LOCAL_DETECTION_QUALITY,
//           minFacePresenceConfidence: CONFIG.LOCAL_DETECTION_QUALITY,
//           minTrackingConfidence: CONFIG.LOCAL_DETECTION_QUALITY
//         });

//         if (isMounted.current) {
//           faceLandmarkerRef.current = faceLandmarker;
//           setFaceDetectionReady(true);
//           setDebugInfo(prev => ({ ...prev, faceDetection: 'Ready' }));
//           console.log('Face Landmarker initialized successfully');
//         }
//       } catch (error) {
//         if (isMounted.current) {
//           console.error('Failed to initialize Face Landmarker:', error);
//           setDebugInfo(prev => ({ ...prev, faceDetection: `Error: ${error}` }));
//           Alert.alert('Initialization Error', 'Failed to initialize face detection.');
//         }
//       }
//     };

//     initializeFaceLandmarker();
    
//     // Clean up on unmount
//     return () => {
//       if (faceLandmarkerRef.current) {
//         faceLandmarkerRef.current.close();
//       }
//     };
//   }, []);

//   // WebSocket Connection
//   useEffect(() => {
//     const connectWebSocket = () => {
//       try {
//         const socketUrl = CONFIG.SERVER_URL;
//         console.log('🔗 Connecting to WebSocket:', socketUrl);
//         if (isMounted.current) {
//           setDebugInfo(prev => ({ ...prev, connection: 'Connecting...' }));
//         }

//         ws.current = new WebSocket(socketUrl);

//         ws.current.onopen = () => {
//           console.log('✅ WebSocket Connected');
//           if (isMounted.current) {
//             setIsConnected(true);
//             setDebugInfo(prev => ({ ...prev, connection: 'Connected' }));
//           }
//         };

//         ws.current.onclose = () => {
//           console.log('❌ WebSocket Disconnected');
//           if (isMounted.current) {
//             setIsConnected(false);
//             setDebugInfo(prev => ({ ...prev, connection: 'Disconnected' }));
//           }

//           // Attempt to reconnect after interval
//           if (!reconnectTimeout.current) {
//             reconnectTimeout.current = setTimeout(() => {
//               reconnectTimeout.current = null;
//               connectWebSocket();
//             }, CONFIG.RECONNECT_INTERVAL);
//           }
//         };

//         ws.current.onerror = (error) => {
//           console.error('WebSocket Error:', error);
//           if (isMounted.current) {
//             setDebugInfo(prev => ({ ...prev, connection: `Error: ${error}` }));
//           }
//         };

//         ws.current.onmessage = (event) => {
//           const data = JSON.parse(event.data);
//           if (isMounted.current) {
//             switch (data.type) {
//               case 'config':
//                 setServerConfig(data);
//                 break;
//               case 'reference_landmarks':
//                 setLandmarks({
//                   landmarks: data.landmarks,
//                   type: 'reference',
//                   indices: data.indices || serverConfig?.indices,
//                   frame: data.frame
//                 });
//                 setDebugInfo(prev => ({ ...prev, refFrame: data.frame }));
//                 break;
//               case 'processed_landmarks':
//                 if (CONFIG.USE_SERVER_LANDMARKS) {
//                   setLandmarks({
//                     landmarks: data.landmarks,
//                     type: 'user',
//                     indices: data.indices || serverConfig?.indices
//                   });
//                 }
//                 break;
//               case 'play_reference_ack':
//                 console.log(`🎵 Server ${data.value ? 'started' : 'stopped'} reference playback`);
//                 break;
//               case 'pong':
//                 setDebugInfo(prev => ({ 
//                   ...prev, 
//                   ping: `${Date.now() - data.timestamp}ms` 
//                 }));
//                 break;
//               default:
//                 console.log('📬 Received unknown message type:', data.type);
//             }
//           }
//         };
//       } catch (error) {
//         console.error('Failed to connect WebSocket:', error);
//         if (isMounted.current) {
//           setDebugInfo(prev => ({ ...prev, connection: `Error: ${error}` }));
//         }

//         // Attempt to reconnect after interval
//         if (!reconnectTimeout.current) {
//           reconnectTimeout.current = setTimeout(() => {
//             reconnectTimeout.current = null;
//             connectWebSocket();
//           }, CONFIG.RECONNECT_INTERVAL);
//         }
//       }
//     };

//     connectWebSocket();
    
//     // Clean up on unmount
//     return () => {
//       if (reconnectTimeout.current) {
//         clearTimeout(reconnectTimeout.current);
//       }
//       if (ws.current) {
//         ws.current.close();
//       }
//     };
//   }, []);

//   // Function to convert Frame to ImageBitmap
//   const processFrameForMediaPipe = async (frame: Frame) => {
//     try {
//       // Extract pixel data from the frame
//       const pixelData = frame.toArrayBuffer();

//       // Create an ImageBitmap from the pixel data
//       const imageBitmap = await createImageBitmap(
//         new ImageData(
//           new Uint8ClampedArray(pixelData),
//           frame.width,
//           frame.height
//         )
//       );

//       return imageBitmap;
//     } catch (error) {
//       console.error('Error processing frame:', error);
//       return null;
//     }
//   };

//   // Frame processor for camera
//   const frameProcessor = useFrameProcessor((frame) => {
//     'worklet';

//     try {
//       // Skip frames for performance
//       frameCounter.current = (frameCounter.current + 1) % CONFIG.FRAME_SAMPLE_RATE;
//       if (frameCounter.current !== 0) return;

//       // Skip if face detection is not ready
//       if (!faceLandmarkerRef.current) return;

//       // Skip if CV is already running
//       if (cvRunning) return;

//       // Signal that we're processing a frame
//       runOnJS(setCvRunning)(true);

//      // Convert frame to a format MediaPipe can process
//     runOnJS(async () => {
//       const imageBitmap = await processFrameForMediaPipe(frame);
//       if (imageBitmap && faceLandmarkerRef.current) {
//         // Process the frame with MediaPipe
//         const faceLandmarkerResult = faceLandmarkerRef.current.detectForVideo(
//           imageBitmap,
//           frame.timestamp
//         );

//         // Handle the result
//         runOnJS(processAndSendLandmarks)(faceLandmarkerResult);
//         }
//       })();
//     } catch (error) {
//       console.error('Frame processor error:', error);
//       runOnJS(setCvRunning)(false);
//     }
//   }, [faceDetectionReady, cvRunning]);

//   // Process and send landmarks
//   const processAndSendLandmarks = useCallback((faceLandmarkerResult: any) => {
//     try {
//       // Check if we have results
//       if (faceLandmarkerResult && faceLandmarkerResult.faceLandmarks && faceLandmarkerResult.faceLandmarks.length > 0) {
//         const detectedLandmarks = faceLandmarkerResult.faceLandmarks[0].map((landmark: any) => [landmark.x, landmark.y] as [number, number]);

//         // Update landmarks state
//         setLandmarks({
//           landmarks: detectedLandmarks,
//           type: 'user'
//         });

//         // Send landmarks to server
//         sendLandmarksToServer(detectedLandmarks);
//       }
//     } catch (error) {
//       console.error('Processing landmarks error:', error);
//     } finally {
//       setCvRunning(false);
//     }
//   }, []);

//   // Send landmarks to server
//   const sendLandmarksToServer = useCallback((landmarks: [number, number][]) => {
//     if (ws.current?.readyState === WebSocket.OPEN) {
//       ws.current.send(JSON.stringify({
//         type: 'user_landmarks',
//         landmarks: landmarks
//       }));
//     }
//   }, []);

//   // Render facial landmarks
//   const renderLandmarks = useCallback(() => {
//     if (!landmarks || !landmarks.landmarks) return null;
    
//     const width = 1;
//     const height = 1;
//     const color = landmarks.type === 'reference' ? '#FF2D55' : '#00E676';
    
//     return (
//       <Svg style={StyleSheet.absoluteFill}>
//         {landmarks.landmarks.map((point, index) => (
//           <Circle
//             key={`point-${index}`}
//             cx={point[0] * width}
//             cy={point[1] * height}
//             r={2}
//             fill={color}
//             opacity={0.7}
//           />
//         ))}
//       </Svg>
//     );
//   }, [landmarks]);

//   // Render debug info
//   const renderDebugInfo = useCallback(() => {
//     if (!CONFIG.DISPLAY_DEBUG_INFO) return null;
    
//     return (
//       <View style={styles.debugContainer}>
//         <ScrollView style={styles.debugScroll}>
//           <Text style={styles.debugTitle}>Debug Information</Text>
//           <Text style={styles.debugText}>Connection: {debugInfo.connection || 'Unknown'}</Text>
//           <Text style={styles.debugText}>Face Detection: {debugInfo.faceDetection || 'Not initialized'}</Text>
//           <Text style={styles.debugText}>Ping: {debugInfo.ping || 'N/A'}</Text>
//           <Text style={styles.debugText}>Battery Optimized: {batteryOptimized ? 'Yes' : 'No'}</Text>
//           {playingReference && (
//             <Text style={styles.debugText}>Reference Frame: {debugInfo.refFrame || 0}</Text>
//           )}
//           <Text style={styles.debugText}>Landmarks Type: {landmarks?.type || 'None'}</Text>
//           <Text style={styles.debugText}>Landmarks Count: {landmarks?.landmarks?.length || 0}</Text>
//         </ScrollView>
//       </View>
//     );
//   }, [debugInfo, landmarks, batteryOptimized, playingReference]);

//   // Render loading or permission UI
//   if (hasPermission === null) {
//     return (
//       <SafeAreaView style={styles.container}>
//         <ActivityIndicator size="large" color="#4285F4" />
//         <Text style={styles.loadingText}>Requesting camera permission...</Text>
//       </SafeAreaView>
//     );
//   }

//   if (hasPermission === false) {
//     return (
//       <SafeAreaView style={styles.container}>
//         <Text style={styles.errorText}>Camera permission is required for this app.</Text>
//         <TouchableOpacity 
//           style={styles.button}
//           onPress={() => Camera.requestCameraPermission()}
//         >
//           <Text style={styles.buttonText}>Request Permission</Text>
//         </TouchableOpacity>
//       </SafeAreaView>
//     );
//   }

//   if (!device) {
//     return (
//       <SafeAreaView style={styles.container}>
//         <Text style={styles.errorText}>No camera device found.</Text>
//       </SafeAreaView>
//     );
//   }

//   if (!faceDetectionReady) {
//     return (
//       <SafeAreaView style={styles.container}>
//         <ActivityIndicator size="large" color="#4285F4" />
//         <Text style={styles.loadingText}>Initializing facial recognition...</Text>
//         <Text style={styles.subText}>This may take a moment on first launch.</Text>
//       </SafeAreaView>
//     );
//   }

//   return (
//     <SafeAreaView style={styles.container}>
//       {/* Camera */}
//       <View style={styles.cameraContainer}>
//         <Camera
//           ref={cameraRef}
//           style={StyleSheet.absoluteFill}
//           device={device}
//           isActive={true}
//           frameProcessor={frameProcessor}
//           photo={false}
//           video={false}
//           audio={false}
//         />
        
//         {/* Overlay landmarks */}
//         {renderLandmarks()}
        
//         {/* Status indicator */}
//         <View style={[
//           styles.statusIndicator, 
//           { backgroundColor: isConnected ? '#4CAF50' : '#F44336' }
//         ]} />
        
//         {/* Playing reference indicator */}
//         {playingReference && (
//           <View style={styles.playingIndicator}>
//             <Text style={styles.playingText}>Playing Reference</Text>
//           </View>
//         )}
//       </View>
      
//       {/* Controls */}
//       <View style={styles.controlsContainer}>
//         {/* Play/Stop Reference Button */}
//         <TouchableOpacity 
//           style={[styles.button, playingReference ? styles.stopButton : styles.playButton]}
//           onPress={() => setPlayingReference(!playingReference)}
//           disabled={!isConnected}
//         >
//           <Text style={styles.buttonText}>
//             {playingReference ? 'Stop Reference' : 'Play Reference'}
//           </Text>
//         </TouchableOpacity>
        
//         {/* Battery Optimization Button */}
//         <TouchableOpacity 
//           style={[styles.button, batteryOptimized ? styles.optimizedButton : styles.normalButton]}
//           onPress={() => setBatteryOptimized(!batteryOptimized)}
//         >
//           <Text style={styles.buttonText}>
//             {batteryOptimized ? 'Battery Saving: ON' : 'Battery Saving: OFF'}
//           </Text>
//         </TouchableOpacity>
        
//         {/* Reconnect Button (only show when disconnected) */}
//         {!isConnected && (
//           <TouchableOpacity 
//             style={[styles.button, styles.reconnectButton]}
//             onPress={() => ws.current?.close()}
//           >
//             <Text style={styles.buttonText}>Reconnect to Server</Text>
//           </TouchableOpacity>
//         )}
//       </View>
      
//       {/* Debug Info */}
//       {renderDebugInfo()}
//     </SafeAreaView>
//   );
// };

// // Styles
// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: '#121212',
//   },
//   cameraContainer: {
//     flex: 1,
//     position: 'relative',
//   },
//   controlsContainer: {
//     padding: 16,
//     backgroundColor: 'rgba(0, 0, 0, 0.8)',
//     borderTopWidth: 1,
//     borderTopColor: '#333',
//   },
//   button: {
//     padding: 12,
//     borderRadius: 8,
//     marginVertical: 8,
//     alignItems: 'center',
//   },
//   playButton: {
//     backgroundColor: '#4285F4',
//   },
//   stopButton: {
//     backgroundColor: '#DB4437',
//   },
//   optimizedButton: {
//     backgroundColor: '#0F9D58',
//   },
//   normalButton: {
//     backgroundColor: '#4285F4',
//   },
//   reconnectButton: {
//     backgroundColor: '#F4B400',
//   },
//   buttonText: {
//     color: 'white',
//     fontWeight: 'bold',
//     fontSize: 16,
//   },
//   statusIndicator: {
//     position: 'absolute',
//     top: 12,
//     right: 12,
//     width: 12,
//     height: 12,
//     borderRadius: 6,
//   },
//   playingIndicator: {
//     position: 'absolute',
//     top: 12,
//     left: 12,
//     backgroundColor: 'rgba(0, 0, 0, 0.7)',
//     paddingHorizontal: 8,
//     paddingVertical: 4,
//     borderRadius: 4,
//   },
//   playingText: {
//     color: '#FF2D55',
//     fontWeight: 'bold',
//   },
//   debugContainer: {
//     maxHeight: 200,
//     backgroundColor: 'rgba(0, 0, 0, 0.8)',
//     borderTopWidth: 1,
//     borderTopColor: '#333',
//   },
//   debugScroll: {
//     padding: 8,
//   },
//   debugTitle: {
//     color: 'white',
//     fontWeight: 'bold',
//     marginBottom: 4,
//   },
//   debugText: {
//     color: '#AAAAAA',
//     fontSize: 12,
//     marginBottom: 2,
//   },
//   loadingText: {
//     color: 'white',
//     margin: 20,
//     textAlign: 'center',
//   },
//   subText: {
//     color: '#AAAAAA',
//     textAlign: 'center',
//   },
//   errorText: {
//     color: '#DB4437',
//     margin: 20,
//     textAlign: 'center',
//   },
// });

// export default App;


// import React, { useEffect, useRef, useState } from 'react';
// import { SafeAreaView, StyleSheet, View, TouchableOpacity, Text, Alert } from 'react-native';
// import { Camera, useCameraDevice, useFrameProcessor } from 'react-native-vision-camera';
// import Svg, { Line } from 'react-native-svg';
// import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
// // Try alternative imports for runOnJS based on your version
// // For newer versions, import from the frame processor plugin
// import { runOnJS } from 'react-native-reanimated';

// interface LandmarksData {
//   landmarks: [number, number][] | null;
//   type: string;
//   indices: {
//     jaw: number[];
//     mouth: number[];
//   };
// }

// const App = () => {
//   const device = useCameraDevice('front');
//   const cameraRef = useRef<Camera>(null);
//   const ws = useRef<WebSocket | null>(null);
//   const [isConnected, setIsConnected] = useState(false);
//   const [cvRunning, setCvRunning] = useState(false);
//   const [playingReference, setPlayingReference] = useState(false);
//   const [landmarks, setLandmarks] = useState<LandmarksData | null>(null);
//   const faceLandmarkerRef = useRef<FaceLandmarker | null>(null);

//   // Initialize MediaPipe Face Landmarker
//   useEffect(() => {
//     const initializeFaceLandmarker = async () => {
//       // Fixed: Changed from object to string
//       const filesetResolver = await FilesetResolver.forVisionTasks(
//         'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm'
//       );
//       faceLandmarkerRef.current = await FaceLandmarker.createFromOptions(filesetResolver, {
//         baseOptions: {
//           modelAssetPath: 'https://storage.googleapis.com/mediapipe-assets/face_landmarker.task',
//         },
//         runningMode: 'VIDEO',
//         numFaces: 1,
//       });
//     };

//     initializeFaceLandmarker();
//   }, []);

//   // WebSocket Connection
//   useEffect(() => {
//     connectWebSocket();
//     return () => {
//       if (ws.current) {
//         ws.current.close();
//       }
//     };
//   }, []);

//   const connectWebSocket = () => {
//     try {
//       const socketUrl = 'ws://localhost:8000/ws'; // Change to your server URL
//       console.log('🔗 Connecting to WebSocket:', socketUrl);

//       ws.current = new WebSocket(socketUrl);

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
//         try {
//           const data = JSON.parse(event.data);
//           console.log('📩 Received from server:', data);

//           if (data.type === 'reference_landmarks') {
//             setLandmarks({
//               landmarks: data.landmarks,
//               type: 'reference',
//               indices: {
//                 jaw: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10], // Example jaw indices
//                 mouth: [11, 12, 13, 14, 15, 16, 17, 18, 19, 20], // Example mouth indices
//               },
//             });
//           }
//         } catch (error) {
//           console.error('❌ Error parsing WebSocket message:', error);
//         }
//       };

//       ws.current.onerror = (error) => {
//         console.error('⚠️ WebSocket Error:', error);
//         Alert.alert('Connection Error', 'Failed to connect to the server.');
//       };
//     } catch (error) {
//       console.error('❌ WebSocket Connection Failed:', error);
//       Alert.alert('Connection Error', 'Failed to connect to the server.');
//     }
//   };

//   // Process frame and send landmarks
//   const processFrameAndSendLandmarks = (imageData: any) => {
//     if (!faceLandmarkerRef.current || !ws.current || ws.current.readyState !== WebSocket.OPEN) {
//       return;
//     }
    
//     try {
//       // Fixed: We need to convert the frame to an image for MediaPipe
//       const results = faceLandmarkerRef.current.detectForVideo(imageData, performance.now());
      
//       if (results.faceLandmarks && results.faceLandmarks.length > 0) {
//         const userLandmarks = results.faceLandmarks[0].map((landmark: any) => [landmark.x, landmark.y]);
  
//         // Send user landmarks to backend
//         ws.current.send(JSON.stringify({
//           type: 'user_landmarks',
//           landmarks: userLandmarks,
//         }));
//       }
//     } catch (error) {
//       console.error('Error processing frame:', error);
//     }
//   };

//   // Alternative implementation without using runOnJS directly
//   // This approach extracts frame data and uses a state variable to pass data to the main thread
//   const [currentFrame, setCurrentFrame] = useState<any>(null);
  
//   useEffect(() => {
//     if (currentFrame) {
//       processFrameAndSendLandmarks(currentFrame);
//       setCurrentFrame(null);
//     }
//   }, [currentFrame]);

//   // Frame Processor
//   const frameProcessor = useFrameProcessor((frame) => {
//     'worklet';
    
//     const imageData = {
//       image: frame,
//       width: frame.width,
//       height: frame.height,
//       timestamp: performance.now()
//     };
    
//     try {
//       // Try to use runOnJS if available
//       runOnJS(processFrameAndSendLandmarks)(imageData);
//     } catch (error) {
//       // Fallback to using state
//       runOnJS(setCurrentFrame)(imageData);
//     }
//   }, []);

//   // Start/Stop CV
//   const handleToggle = () => {
//     setCvRunning((prev) => !prev);
//   };

//   // Play/Stop Reference Landmarks
//   const handlePlayReference = () => {
//     if (ws.current?.readyState === WebSocket.OPEN) {
//       const newPlayingState = !playingReference;
//       ws.current.send(JSON.stringify({
//         type: 'play_reference',
//         value: newPlayingState,
//       }));
//       setPlayingReference(newPlayingState);
//     }
//   };

//   // Render Landmarks
//   const renderLandmarks = () => {
//     if (!landmarks?.landmarks) return null;

//     const renderLines = (indices: number[]) => {
//       return indices.map((_, i) => {
//         if (i === 0) return null;
//         const start = landmarks.landmarks?.[indices[i - 1]];
//         const end = landmarks.landmarks?.[indices[i]];

//         if (!start || !end) return null;

//         return (
//           <Line
//             key={`line-${i}`}
//             x1={start[0] * 100 + '%'}
//             y1={start[1] * 100 + '%'}
//             x2={end[0] * 100 + '%'}
//             y2={end[1] * 100 + '%'}
//             stroke={landmarks.type === 'reference' ? '#4CAF50' : '#FFFFFF'}
//             strokeWidth="2"
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

//   if (!device) {
//     return <View style={styles.container}><Text>Camera not available</Text></View>;
//   }

//   return (
//     <SafeAreaView style={styles.container}>
//       <View style={styles.statusBar}>
//         <Text style={styles.statusText}>
//           Server: {isConnected ? '✅ Connected' : '❌ Disconnected'}
//         </Text>
//       </View>

//       <View style={styles.cameraContainer}>
//         <Camera
//           ref={cameraRef}
//           style={styles.camera}
//           device={device}
//           isActive={cvRunning}
//           frameProcessor={frameProcessor}
//           pixelFormat="yuv"
//         />
//         {renderLandmarks()}
//       </View>

//       <View style={styles.controlsContainer}>
//         <TouchableOpacity style={[styles.button, cvRunning && styles.buttonActive]} onPress={handleToggle}>
//           <Text style={styles.buttonText}>{cvRunning ? 'Stop Tracking' : 'Start Tracking'}</Text>
//         </TouchableOpacity>

//         <TouchableOpacity style={[styles.button, playingReference && styles.buttonActive]} onPress={handlePlayReference}>
//           <Text style={styles.buttonText}>{playingReference ? 'Stop Reference' : 'Play Reference'}</Text>
//         </TouchableOpacity>
//       </View>
//     </SafeAreaView>
//   );
// };

// const styles = StyleSheet.create({
//   container: { flex: 1, backgroundColor: '#000' },
//   statusBar: { padding: 10, backgroundColor: '#1a1a1a' },
//   statusText: { color: '#fff', textAlign: 'center' },
//   cameraContainer: { flex: 1, position: 'relative' },
//   camera: { flex: 1 },
//   controlsContainer: { padding: 20, flexDirection: 'row', justifyContent: 'space-around', backgroundColor: '#1a1a1a' },
//   button: { backgroundColor: '#333', padding: 12, borderRadius: 8, minWidth: 150, alignItems: 'center' },
//   buttonActive: { backgroundColor: '#4CAF50' },
//   buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' }
// });

// export default App;

//react native code
// import React, { useEffect, useRef, useState } from 'react';
// import { SafeAreaView, StyleSheet, View, TouchableOpacity, Text, Alert } from 'react-native';
// import { Camera, useCameraDevice, useFrameProcessor } from 'react-native-vision-camera';
// import Svg, { Line } from 'react-native-svg';
// import { runOnJS } from 'react-native-reanimated';
// import { encode } from "base-64"; // Import base-64 encoder

// // Function to convert frames to Base64
// const convertFrameToBase64 = (frame: any): string => {
//   return encode(frame.buffer); // Encode frame buffer
// };

// interface LandmarksData {
//   landmarks: [number, number][] | null;
//   type: string;
//   indices: { jaw: number[]; mouth: number[] };
// }

// const App = () => {
//   const device = useCameraDevice('front');
//   const ws = useRef<WebSocket | null>(null);
//   const [isConnected, setIsConnected] = useState(false);
//   const [cvRunning, setCvRunning] = useState(false);
//   const [playingReference, setPlayingReference] = useState(false);
//   const [landmarks, setLandmarks] = useState<LandmarksData | null>(null);
//   const [permission, setPermission] = useState(false);

//   // Request Camera Permission
//   useEffect(() => {
//     (async () => {
//       const status = await Camera.requestCameraPermission();
//       setPermission(status === "granted"); // ✅ Correct check

//     })();
//     connectWebSocket();
//   }, []);

//   const connectWebSocket = () => {
//     try {
//       const socketUrl = 'wws://10.36.79.138:8000/ws'; // Update for emulator/physical device
//       ws.current = new WebSocket(socketUrl);

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
//         try {
//           const data = JSON.parse(event.data);
//           if (data.type === 'landmarks') {
//             setLandmarks(data.data);
//           } else {
//             setCvRunning(data.cv_running);
//             setPlayingReference(data.play_reference);
//           }
//         } catch (error) {
//           console.error('⚠️ WebSocket Parsing Error:', error);
//         }
//       };

//       ws.current.onerror = (error) => {
//         console.error('⚠️ WebSocket Error:', error);
//         Alert.alert('Connection Error', 'Server unavailable.');
//       };
//     } catch (error) {
//       console.error('⚠️ WebSocket Connection Error:', error);
//     }
//   };

//   // Process Frames and Send to Server
//   const frameProcessor = useFrameProcessor((frame) => {
//     if (cvRunning && ws.current?.readyState === WebSocket.OPEN) {
//       const base64Frame = convertFrameToBase64(frame);
//       runOnJS(() => {
//         ws.current?.send(JSON.stringify({ type: "frame", data: base64Frame }));
//       })();
//     }
//   }, []);

//   const handleToggle = () => {
//     if (ws.current?.readyState === WebSocket.OPEN) {
//       ws.current.send(JSON.stringify({ type: 'toggle', value: !cvRunning }));
//       setCvRunning(!cvRunning);
//     }
//   };

//   const handlePlayReference = () => {
//     if (ws.current?.readyState === WebSocket.OPEN) {
//       ws.current.send(JSON.stringify({ type: 'play_reference', value: !playingReference }));
//       setPlayingReference(!playingReference);
//     }
//   };

//   if (!permission) {
//     return <View style={styles.container}><Text>Camera permission required</Text></View>;
//   }

//   return (
//     <SafeAreaView style={styles.container}>
//       <View style={styles.statusBar}>
//         <Text style={styles.statusText}>Server: {isConnected ? '✅ Connected' : '❌ Disconnected'}</Text>
//       </View>

//       <View style={styles.cameraContainer}>
//         {device ? (
//           <Camera style={styles.camera} device={device} isActive={true} frameProcessor={frameProcessor} />
//         ) : (
//           <Text>No Camera Device Found</Text>
//         )}
//       </View>

//       <View style={styles.controlsContainer}>
//         <TouchableOpacity style={[styles.button, cvRunning && styles.buttonActive]} onPress={handleToggle}>
//           <Text style={styles.buttonText}>{cvRunning ? 'Stop Tracking' : 'Start Tracking'}</Text>
//         </TouchableOpacity>

//         <TouchableOpacity style={[styles.button, playingReference && styles.buttonActive]} onPress={handlePlayReference}>
//           <Text style={styles.buttonText}>{playingReference ? 'Stop Reference' : 'Play Reference'}</Text>
//         </TouchableOpacity>
//       </View>
//     </SafeAreaView>
//   );
// };

// const styles = StyleSheet.create({
//   container: { flex: 1, backgroundColor: '#000' },
//   statusBar: { padding: 10, backgroundColor: '#1a1a1a' },
//   statusText: { color: '#fff', textAlign: 'center' },
//   cameraContainer: { flex: 1, position: 'relative' },
//   camera: { flex: 1 },
//   controlsContainer: { padding: 20, flexDirection: 'row', justifyContent: 'space-around', backgroundColor: '#1a1a1a' },
//   button: { backgroundColor: '#333', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8, minWidth: 150, alignItems: 'center' },
//   buttonActive: { backgroundColor: '#4CAF50' },
//   buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' }
// });

// export default App;
