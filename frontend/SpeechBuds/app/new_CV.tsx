
import React, { useEffect, useRef, useState } from 'react';
import { SafeAreaView, StyleSheet, View, TouchableOpacity, Text, Alert, Platform, Dimensions } from 'react-native';
import { Camera, useCameraDevice, useCameraPermission } from 'react-native-vision-camera';
import { runOnJS } from 'react-native-reanimated';
import Svg, { Line } from 'react-native-svg';
import * as Device from 'expo-device';
import { LandmarksData } from './LandmarksData';




export const useCVIntegration = () => {
  const [facing, setFacing] = useState<'front' | 'back'>('front');
  const camera = useRef<Camera | null>(null);
  const ws = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [cvRunning, setCvRunning] = useState(false);
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

//   useEffect(() => {
//     // Determine appropriate server URL based on device
//     const getServerUrl = async () => {
//       // For physical devices, we need to use the host machine's IP address
//       const devServerUrl = Platform.select({
//         ios: Device.isDevice ? 'wss://fe44-192-159-178-211.ngrok-free.app/ws' : 'ws://localhost:8000/ws',
//         android: Device.isDevice ? 'wss://fe44-192-159-178-211.ngrok-free.app/ws' : 'ws://localhost:8000/ws',
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

  // const connectWebSocket = () => {
  //   const serverUrl = Platform.select({
  //       ios: Device.isDevice 
  //         ? 'wss://8e64-192-159-178-211.ngrok-free.app/ws' 
  //         : 'ws://localhost:8000/ws',
  //       android: Device.isDevice 
  //         ? 'wss://8e64-192-159-178-211.ngrok-free.app/ws' 
  //         : 'ws://localhost:8000/ws',
  //       default: 'ws://localhost:8000/ws',
  //     });

  useEffect(() => {
      // Determine appropriate server URL based on device
      const getServerUrl = async () => {
        // For physical devices, we need to use the host machine's IP address
        const devServerUrl = Platform.select({
          ios: Device.isDevice ? 'wss://8e64-192-159-178-211.ngrok-free.app/ws' : 'ws://localhost:8000/ws',
          android: Device.isDevice ? 'wss://8e64-192-159-178-211.ngrok-free.app/ws' : 'ws://localhost:8000/ws',
          default: 'ws://localhost:8000/ws',
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

  // Function to capture an10a5-192-159-178-211.ngrok-free.appd process a single frame
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
                single_frame: true,
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

  const handleToggle = async () => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      const newState = !cvRunning;
      console.log(`🔄 Toggling CV: ${newState ? 'ON' : 'OFF'}`);
      
      if (newState) {
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
              value: newState,
            })
          );

          setCvRunning(true);
          setPlayingReference(false); // Ensure playback is stopped
          setReferenceCompleted(false); // Reset completed state
        } else {
          Alert.alert('Camera Error', 'Failed to capture image.');
          return;
        }
      } else {
        // Turn off CV
        ws.current.send(
          JSON.stringify({
            type: 'toggle',
            value: false,
          })
        );
        setCvRunning(false);
        setPlayingReference(false);
        setFrameCaptured(false);
        setLandmarks(null);
      }
    } else {
      Alert.alert('Connection Error', 'Server not available.');
      connectWebSocket();
    }
  };

  const handlePlayReference = () => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      // If reference was completed before, reset the state
      if (referenceCompleted) {
        setReferenceCompleted(false);
      }

      const newPlayingState = !playingReference;
      console.log(`🎵 Toggling Reference Playback: ${newPlayingState ? 'ON' : 'OFF'}`);

      ws.current.send(
        JSON.stringify({
          type: 'play_reference',
          value: newPlayingState,
          play_once: true  // Add flag to indicate one-time playback
        })
      );
      setPlayingReference(newPlayingState);
      setDebugInfo(`Reference playback ${newPlayingState ? 'started' : 'stopped'}`);
    } else {
      Alert.alert('Connection Error', 'Server not available.');
      connectWebSocket();
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
    
          // Make sure we have valid camera dimensions
        if (cameraViewDimensions.width <= 0 || cameraViewDimensions.height <= 0) {
          console.log('Camera view dimensions not available yet');
          return null;
        }
    
        console.log(`🔍 Rendering ${landmarks.landmarks.length} landmarks, type: ${landmarks.type}`);
        console.log('Sample landmark:', landmarks.landmarks[0]);
        console.log('Landmarks indices:', landmarks.indices);
    
        // Calculate scaling factors to better fit the landmarks to the camera view
        
        // Get landmark type and log it
        const landmarkType = landmarks.type || 'unknown';
        console.log(`🔍 Rendering ${landmarks.landmarks.length} landmarks, type: ${landmarkType}`);
        
        
        // Use camera dimensions to determine scaling factor
        const viewWidth = cameraViewDimensions.width;
        const viewHeight = cameraViewDimensions.height;
        
        
        // Calculate the viewport center
        const viewCenterX = viewWidth / 2;
        const viewCenterY = viewHeight / 2;
         // Calculate the bounds of landmarks
        const landmarkWidth = landmarks.bounds.maxX - landmarks.bounds.minX;
        const landmarkHeight = landmarks.bounds.maxY - landmarks.bounds.minY;
        
        // Calculate the landmark center
        const landmarkCenterX = (landmarks.bounds.minX + landmarks.bounds.maxX) / 2;
        const landmarkCenterY = (landmarks.bounds.minY + landmarks.bounds.maxY) / 2;
    
        // Target size should be proportional to view size but not too large
        const targetWidthRatio = 0.8; // Use 60% of view width
        const targetHeightRatio = 0.8; // Use 60% of view height
        // console.log(`🔍 Rendering ${landmarks.landmarks.length} landmarks, type: ${landmarks.type}`);
    
        const targetSize = Math.min(cameraViewDimensions.width, cameraViewDimensions.height) * 1;
        const landmarkSize = Math.max(landmarkWidth, landmarkHeight);
        const scaleFactor = targetSize / landmarkSize;
    
        // Transform function for X coordinates
        const transformX = (x: number) => {
          return viewCenterX + (x - landmarkCenterX) * scaleFactor;
        };
        
        // Transform function for Y coordinates
        const transformY = (y: number) => {
          return viewCenterY + (y - landmarkCenterY) * scaleFactor;
        };
    
         // Choose color based on landmark type
        const strokeColor = landmarks.type === 'reference' ? '#4CAF50' : '#FFFFFF';
        const strokeWidth = landmarks.type === 'reference' ? "3" : "2";  // Make reference lines slightly thicker
        
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

      // useEffect(() => {
      //   connectWebSocket();
      //   return () => {
      //     ws.current?.close();
      //   };
      // }, []);
      
      
      return {
        // States and Refs
        camera,
        device,
        facing,
        isConnected,
        cvRunning,
        playingReference,
        landmarks,
        hasPermission,
        debugInfo,
        cameraViewDimensions,
        referenceCompleted,
        frameCaptured,
    
        // Methods
        handleToggle,
        handlePlayReference,
        requestPermission,
        handleCameraLayout,
        renderLandmarks,
        captureSingleFrame,
      };
    };
    
  













