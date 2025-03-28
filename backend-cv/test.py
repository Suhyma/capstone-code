from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import asyncio
import cv2
import json
import os
import sys
import base64
import numpy as np
from contextlib import asynccontextmanager
from typing import Set, Dict, Any, Optional
from asyncio import Queue
import time  # Add this import


# Add the parent directory to Python's module search path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

# Import from computer_vision
from computer_vision.test_guide import process_frame, load_reference_video_landmarks, play_audio, compute_alignment_matrices

# Dynamically find the correct path for landmarks CSV
csv_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "computer_vision", "reference_landmarks.csv"))

# Debugging: Print the computed path
print(f"🔍 Looking for reference_landmarks.csv at: {csv_path}")

# Ensure the file exists before loading
if not os.path.exists(csv_path):
    raise FileNotFoundError(f"🚨 Error: File not found at {csv_path}")

# Load reference landmarks
reference_landmarks_all_frames = load_reference_video_landmarks(csv_path)
print(f"✅ Loaded {len(reference_landmarks_all_frames)} frames of reference landmarks")

# Initialize FastAPI app
app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"]  # Add this line

)

# Global state
clients: Set[WebSocket] = set()
client_frames: Dict[WebSocket, Optional[np.ndarray]] = {}  # Store the latest frame for each client
cv_running = False
play_reference = False
frame_idx = 0
fixed_alignment = False
M_jaw_fixed = None
M_mouth_fixed = None

#find width and height range
if reference_landmarks_all_frames and len(reference_landmarks_all_frames) > 0:
    landmarks = reference_landmarks_all_frames[0]
    if landmarks:
        # Find min/max coordinates
        x_coords = [point[0] for point in landmarks]
        y_coords = [point[1] for point in landmarks]
        
        print(f"Reference landmarks appear to use width range: {min(x_coords)}-{max(x_coords)}")
        print(f"Reference landmarks appear to use height range: {min(y_coords)}-{max(y_coords)}")

async def process_and_send_frame(websocket: WebSocket, frame=None, show_first_reference=False):
    """Process a frame and send landmarks back to the client."""
    global frame_idx, fixed_alignment, M_jaw_fixed, M_mouth_fixed
    
    try:
        print("📡 Processing and sending frame...")

         # Process only the initial frame
        if frame is not None:
            # Process user's face to get landmarks for alignment
            user_landmarks_data, _, _, _, _ = process_frame(
                frame,
                reference_landmarks=None,
                play_reference=False,
                frame_idx=0,
                fixed_alignment=False,
                M_jaw_fixed=None,
                M_mouth_fixed=None,
            )
            
            if not user_landmarks_data or not user_landmarks_data.get("landmarks"):
                print("⚠️ No face detected for alignment")
                return
                
            # Compute alignment matrices if needed
            if not fixed_alignment or M_jaw_fixed is None or M_mouth_fixed is None:
                print("🔍 Computing initial alignment matrices...")
                M_jaw_fixed, M_mouth_fixed = compute_alignment_matrices(
                    reference_landmarks_all_frames[0], 
                    user_landmarks_data["landmarks"]
                )
                fixed_alignment = True
                
          # Determine if we're showing first reference frame or playing animation
            if show_first_reference or not play_reference:
                # Show first reference frame
                landmarks_data, _, _, _, _ = process_frame(
                    frame, 
                    reference_landmarks=reference_landmarks_all_frames,
                    play_reference=True, 
                    frame_idx=0,  # Always use first frame
                    fixed_alignment=fixed_alignment,
                    M_jaw_fixed=M_jaw_fixed, 
                    M_mouth_fixed=M_mouth_fixed
                )
            
                # Ensure landmarks type is set to reference
                if isinstance(landmarks_data, dict) and "landmarks" in landmarks_data:
                    landmarks_data["type"] = "reference"
                    
                # Send first reference frame landmarks
                await websocket.send_json({
                    "type": "landmarks",
                    "data": landmarks_data
                })
            
                print(f"📤 Sent first reference frame landmarks to client")
            
            # If playing reference, we process normally with the sequence
            elif play_reference and frame_idx < len(reference_landmarks_all_frames):
        
                
                landmarks_data, new_frame_idx, fixed_alignment, M_jaw_fixed, M_mouth_fixed = process_frame(
                    frame, 
                    reference_landmarks=reference_landmarks_all_frames,
                    play_reference=True, 
                    frame_idx=frame_idx,
                    fixed_alignment=fixed_alignment,
                    M_jaw_fixed=M_jaw_fixed, 
                    M_mouth_fixed=M_mouth_fixed
                )
            
        #     # Ensure landmarks type is set to reference
                if isinstance(landmarks_data, dict) and "landmarks" in landmarks_data:
                    landmarks_data["type"] = "reference"
            
            # # Send reference landmarks with clear type information
                await websocket.send_json({
                    "type": "landmarks",
                    "data": landmarks_data
                })
            
                print(f"📤 Sent reference landmarks to client (frame {frame_idx})")
                
                # Update frame index for next iteration
                frame_idx = new_frame_idx
            
            
        # We no longer want to send live user landmarks even if CV is running
        # So we've removed that part of the function
        
    except Exception as e:
        print(f"❌ Error processing frame: {e}")
        import traceback
        traceback.print_exc()

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """Handles WebSocket connections and processes user input."""
    global cv_running, play_reference, frame_idx, fixed_alignment, M_jaw_fixed, M_mouth_fixed

    # Flag to track if we're currently processing a frame
    is_processing = False

    print("🟡 Incoming WebSocket Connection Attempt...")
    print(f"🟡 Client headers: {websocket.headers}")


    await websocket.accept()
    clients.add(websocket)
    client_frames[websocket] = None  # Initialize frame storage for this client
    print(f"✅ WebSocket Connected: {websocket.client}")

    # Send initial state to client
    await websocket.send_json({
        "type": "status",
        "cv_running": cv_running,
        "play_reference": play_reference
    })

    try:
        while True:
            data = await websocket.receive_text()
            
            print(f"📩 Received from client: {data[:50]}...")  # Truncated for logs

            command = json.loads(data)
            if command["type"] == "frame":
                try: 
                    

                    print("📩 Received frame from client!")
                    # Ensure proper base64 padding
                    base64_str = command["data"]
                    padding = len(base64_str) % 4
                    if padding:
                        base64_str += "=" * (4 - padding)
                        
                    # Decode the image
                    image_data = base64.b64decode(base64_str)
                    nparr = np.frombuffer(image_data, np.uint8)
                    frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
                    
                    if frame is None:
                        print("❌ Failed to decode frame!")
                    else:
                        print(f"📸 Frame decoded: {frame.shape}")
                        # Store the latest frame for this client
                        client_frames[websocket] = frame
                        
                        # Process frame based on current mode
                        if cv_running and not is_processing and not play_reference:
                            is_processing = True
                            await process_and_send_frame(websocket, frame)
                            is_processing = False
                       
                except Exception as e:
                     print(f"❌ Frame processing error: {e}")
                     import traceback
                     traceback.print_exc()
                     is_processing = False


            elif command["type"] == "toggle":
                cv_running = command["value"]
                print(f"🔄 CV Running: {cv_running}")
                
                # If turning off CV, also stop reference playback
                if cv_running:
                    play_reference = False
                    frame_idx = 0
                    fixed_alignment = False
                    M_jaw_fixed = None
                    M_mouth_fixed = None

                     # Process initial frame to show first reference frame
                    frame = client_frames.get(websocket)
                    if frame is not None:
                        # This call should show the first reference frame, not user landmarks
                        await process_and_send_frame(websocket, frame, show_first_reference=True)
                else:
                    # If turning off CV, also stop reference playback
                    # play_reference = False
                    # frame_idx = 0
                    fixed_alignment = False
                    M_jaw_fixed = None
                    M_mouth_fixed = None
                # Send updated state back
                await websocket.send_json({
                    "type": "status",
                    "cv_running": cv_running,
                    "play_reference": play_reference
                })
            
            elif command["type"] == "play_reference":
                play_reference = command["value"]
                print(f"🎵 Play Reference: {play_reference}")
                
                if play_reference:
                    # Stop live CV when playing reference
                    frame_idx = 0

                    
                    # # Play audio if supported
                    # print("🎵 Playing reference audio")
                    # try:
                    #     play_audio()
                    # except Exception as e:
                    #     print(f"⚠️ Error playing audio: {e}")
                    
                    # Start reference playback as a separate task
                    asyncio.create_task(reference_playback_loop(websocket))
                else:
                    # Reset state when stopping reference playback
                    frame_idx = 0
                    # fixed_alignment = False

                
                # Send updated state back
                await websocket.send_json({
                    "type": "status",
                    "cv_running": cv_running,
                    "play_reference": play_reference
                })

    except WebSocketDisconnect:
        print(f"❌ WebSocket Disconnected: {websocket.client}")
    except Exception as e:
        print(f"❌ WebSocket Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        clients.remove(websocket)
        if websocket in client_frames:
            del client_frames[websocket]

# Add to global variables
frame_queue = Queue()
is_processing = False

async def reference_playback_loop(websocket: WebSocket):
    """Continuously send reference landmarks while play_reference is active."""
    global play_reference, frame_idx, fixed_alignment, M_jaw_fixed, M_mouth_fixed, is_processing

    try:
        
        # Reset state at beginning
        frame_idx = 0
        fixed_alignment = False
        M_jaw_fixed = None
        M_mouth_fixed = None
        
        # Notify client that reference playback has started
        await websocket.send_json({
            "type": "play_reference",
            "value": True
        })

        # First, get initial frame and compute alignment matrices
        initial_frame = client_frames.get(websocket)
        if initial_frame is None:
            print("⚠️ No frame available to compute initial alignment")
            await websocket.send_json({
                "type": "error",
                "message": "No camera frame available for alignment"
            })
            play_reference = False
            return
            
       

        # Main playback loop
        total_frames = len(reference_landmarks_all_frames)
        while play_reference and websocket in clients and frame_idx < total_frames:
            is_processing = True
            start_time = time.time()

            # Get latest frame or use initial frame if none available
            current_frame = client_frames.get(websocket, initial_frame)
                  
            # Process frame with current index
            landmarks_data, new_frame_idx, fixed_alignment, M_jaw_fixed, M_mouth_fixed = process_frame(
                current_frame, 
                reference_landmarks=reference_landmarks_all_frames,
                play_reference=True, 
                frame_idx=frame_idx,
                fixed_alignment=fixed_alignment,
                M_jaw_fixed=M_jaw_fixed, 
                M_mouth_fixed=M_mouth_fixed
            )

            # Ensure landmarks type is set to reference
            if isinstance(landmarks_data, dict) and "landmarks" in landmarks_data:
                landmarks_data["type"] = "reference"
            
            # Send reference landmarks
            await websocket.send_json({
                "type": "landmarks",
                "data": landmarks_data
            })

            print(f"📤 Sent reference landmarks to client (frame {frame_idx}/{total_frames})")
            
            # Update frame index (increment by 1)
            frame_idx += 1
            
            # Control timing for smooth playback (~30fps)
            processing_time = time.time() - start_time
            target_frame_time = 0.033  # ~30fps
            sleep_time = max(0.001, target_frame_time - processing_time)
            
            print(f"Frame {frame_idx}/{total_frames} processed in {processing_time:.3f}s, waiting {sleep_time:.3f}s")
            await asyncio.sleep(sleep_time)
            is_processing = False

         # Notify when playback is complete
        await websocket.send_json({
            "type": "reference_completed",
            "message": "Reference playback completed"
        })
        
        # Reset state after playback completes
        play_reference = False
        frame_idx = 0

    except WebSocketDisconnect:
        print("Client disconnected during reference playback")
    except asyncio.CancelledError:
        print("Reference playback task cancelled")
    except Exception as e:
        print(f"❌ Reference playback error: {e}")
        import traceback
        traceback.print_exc()
        
        # Notify client of error
        try:
            await websocket.send_json({
                "type": "error",
                "message": f"Reference playback error: {str(e)}"
            })
        except:
            pass  # Client might be disconnected
            
    finally:
        # Reset state when playback ends for any reason
        play_reference = False
        is_processing = False
        
        # Notify client that reference playback has stopped
        try:
            await websocket.send_json({
                "type": "play_reference",
                "value": False
            })
        except:
            pass  
   


if __name__ == "__main__":
    import uvicorn
    # Run on 0.0.0.0 to make it accessible from other devices on the network
    uvicorn.run("test:app", host="0.0.0.0", port=8000, reload=True)


# from fastapi import FastAPI, WebSocket, WebSocketDisconnect
# from fastapi.middleware.cors import CORSMiddleware
# import asyncio
# import cv2
# import json
# import os
# import sys
# import base64
# import numpy as np
# from contextlib import asynccontextmanager
# from typing import Set, Dict, Any

# # Add the parent directory to Python's module search path
# sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

# # Import from computer_vision
# from computer_vision.test_guide import process_frame, load_reference_video_landmarks, play_audio

# # Dynamically find the correct path for landmarks CSV
# csv_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "computer_vision", "reference_landmarks.csv"))

# # Debugging: Print the computed path
# print(f"🔍 Looking for reference_landmarks.csv at: {csv_path}")

# # Ensure the file exists before loading
# if not os.path.exists(csv_path):
#     raise FileNotFoundError(f"🚨 Error: File not found at {csv_path}")

# # Load reference landmarks
# reference_landmarks_all_frames = load_reference_video_landmarks(csv_path)
# print(f"✅ Loaded {len(reference_landmarks_all_frames)} frames of reference landmarks")

# # Initialize FastAPI app
# app = FastAPI()

# # Add CORS middleware
# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=["*"],
#     allow_credentials=True,
#     allow_methods=["*"],
#     allow_headers=["*"],
# )

# # Global state
# clients: Set[WebSocket] = set()
# cv_running = False
# play_reference = False
# frame_idx = 0
# fixed_alignment = False
# M_jaw_fixed = None
# M_mouth_fixed = None

# async def process_and_send_frame(websocket: WebSocket, frame=None):
#     """Process a frame and send landmarks back to the client."""
#     global frame_idx, fixed_alignment, M_jaw_fixed, M_mouth_fixed
    
#     try:
#         print("📡 Processing and sending frame...")  # Log function call
#         # If playing reference without a frame, we still need to send data
#         if play_reference and frame_idx < len(reference_landmarks_all_frames):
#             if not frame:
#                 # Dummy frame for reference-only mode
#                 frame = np.zeros((480, 640, 3), dtype=np.uint8)
            
#             landmarks_data, frame_idx, fixed_alignment, M_jaw_fixed, M_mouth_fixed = process_frame(
#                 frame, 
#                 play_reference=True, 
#                 frame_idx=frame_idx,
#                 fixed_alignment=fixed_alignment,
#                 M_jaw_fixed=M_jaw_fixed, 
#                 M_mouth_fixed=M_mouth_fixed
#             )
            
#             # Increment frame index for next time
#             frame_idx += 1
#             if frame_idx >= len(reference_landmarks_all_frames):
#                 frame_idx = 0  # Loop back to start
                
#             # Send landmarks back to client
#             await websocket.send_json({
#                 "type": "landmarks",
#                 "data": landmarks_data
#             })

#             print(f"📤 Sent landmarks to client: {landmarks_data}")

            
#         # If CV is running and we have a frame, process it
#         elif cv_running and frame is not None:
#             print("🔄 Live tracking mode...")

#             landmarks_data, _, _, _, _ = process_frame(
#                 frame, 
#                 play_reference=False,
#                 frame_idx=0,
#                 fixed_alignment=False,
#                 M_jaw_fixed=None, 
#                 M_mouth_fixed=None
#             )

#              # 🔹 Limit data size (send only every 3rd frame)
           
#             print(f"📤 Sending landmarks data: {len(landmarks_data['landmarks'])} points")
#             await websocket.send_json({"type": "landmarks", "data": landmarks_data})

#             # print(f"📤 Sending live tracking landmarks: {landmarks_data}")  # Debug log

#             # # Send landmarks back to client
#             # await websocket.send_json({
#             #     "type": "landmarks",
#             #     "data": landmarks_data
#             # })
#     except Exception as e:
#         print(f"❌ Error processing frame: {e}")

# @app.websocket("/ws")
# async def websocket_endpoint(websocket: WebSocket):
#     """Handles WebSocket connections and processes user input."""
#     global cv_running, play_reference, frame_idx, fixed_alignment, M_jaw_fixed, M_mouth_fixed

#     print("🟡 Incoming WebSocket Connection Attempt...")
#     await websocket.accept()
#     clients.add(websocket)
#     print(f"✅ WebSocket Connected: {websocket.client}")

#     try:
#         while True:
#             data = await websocket.receive_text()
            
#             print(f"📩 Received from client: {data[:50]}...")  # Truncated for logs

#             command = json.loads(data)

#             if command["type"] == "frame":
#                 try: 
#                     print("📩 Received frame from client!")
#                     # Ensure proper base64 padding
#                     base64_str = command["data"]
#                     padding = len(base64_str) % 4
#                     if padding:
#                         base64_str += "=" * (4 - padding)
                        
#                     # Decode the image
#                     image_data = base64.b64decode(base64_str)
#                     nparr = np.frombuffer(image_data, np.uint8)
#                     frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
                    
#                     if frame is None:
#                         print("❌ Failed to decode frame!")
#                     else:
#                         print(f"📸 Frame decoded: {frame.shape}")
#                         # Process frame directly when received
#                         if cv_running:
#                             await process_and_send_frame(websocket, frame)
#                 except Exception as e:
#                      print(f"❌ Frame processing error: {e}")
#                      import traceback
#                      traceback.print_exc()

#             elif command["type"] == "toggle":
#                 cv_running = command["value"]
#                 print(f"🔄 CV Running: {cv_running}")
#                 if not cv_running:
#                     play_reference = False
#                     frame_idx = 0
#                     fixed_alignment = False

                
#                 # Send updated state back
#                 await websocket.send_json({
#                     "cv_running": cv_running,
#                     "play_reference": play_reference
#                 })
            
#             elif command["type"] == "play_reference":
#                 play_reference = command["value"]
#                 if play_reference:
#                     cv_running = False  # Stop live tracking when playing reference
#                     frame_idx = 0
#                     fixed_alignment = False
#                     print("🎵 Playing reference audio")
#                     play_audio()
                    
#                     # Start reference playback
#                     asyncio.create_task(reference_playback_loop(websocket))
                
#                 # Send updated state back
#                 await websocket.send_json({
#                     "cv_running": cv_running,
#                     "play_reference": play_reference
#                 })

#     except WebSocketDisconnect:
#         print(f"❌ WebSocket Disconnected: {websocket.client}")
#     except Exception as e:
#         print(f"❌ WebSocket Error: {e}")
#         import traceback
#         traceback.print_exc()
#     finally:
#         clients.remove(websocket)
        
# async def reference_playback_loop(websocket: WebSocket):
#     """Continuously send reference landmarks while play_reference is active."""
#     global play_reference, frame_idx
    
#     try:
#         frame_idx = 0

#         while play_reference and websocket in clients:

#              # Use a dummy frame for reference playback
#             dummy_frame = np.zeros((480, 640, 3), dtype=np.uint8)

#             # Get landmarks for current frame
#             landmarks_data, new_frame_idx, fixed_alignment, M_jaw_fixed, M_mouth_fixed = process_frame(
#                 dummy_frame, 
#                 play_reference=True, 
#                 frame_idx=frame_idx,
#                 fixed_alignment=fixed_alignment,
#                 M_jaw_fixed=M_jaw_fixed, 
#                 M_mouth_fixed=M_mouth_fixed
#             )

#             # Update global state
#             frame_idx = new_frame_idx + 1
#             if frame_idx >= len(reference_landmarks_all_frames):
#                 frame_idx = 0  # Loop back to start
            
#              # Send landmarks to client with enhanced logging
#             print(f"📤 Sending reference frame {frame_idx}/{len(reference_landmarks_all_frames)}")

#             # Add extra info for debugging
#             if landmarks_data["landmarks"] and len(landmarks_data["landmarks"]) > 0:
#                 print(f"Sample landmark: {landmarks_data['landmarks'][0]}")
            
#             # Send the data
#             await websocket.send_json({
#                 "type": "landmarks",
#                 "data": landmarks_data
#             })
                
#             await process_and_send_frame(websocket)
#             await asyncio.sleep(0.05)  # ~20fps for reference playback
#     except Exception as e:
#         print(f"❌ Reference playback error: {e}")


# if __name__ == "__main__":
#     import uvicorn
#     # Run on 0.0.0.0 to make it accessible from other devices on the network
#     uvicorn.run("test:app", host="0.0.0.0", port=8000, reload=True)


# from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Request
# from fastapi.middleware.cors import CORSMiddleware
# import asyncio
# import json
# import os
# import sys
# import logging
# import numpy as np
# import cv2
# import mediapipe as mp
# import aiortc
# from aiortc import MediaStreamTrack, RTCPeerConnection, RTCSessionDescription
# from aiortc.contrib.media import MediaBlackhole, MediaRecorder
# from av import VideoFrame
# import base64
# from typing import Dict, Set, Optional, Any
# import time
# from contextlib import asynccontextmanager
# import traceback

# # Set up logging
# logging.basicConfig(level=logging.INFO, 
#                    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
# logger = logging.getLogger(__name__)

# # Add parent directory to path for imports
# sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

# # Import CV functions (with error handling)
# try:
#     # Import CV functions from guide_2.py
#     from computer_vision.guide_2 import (
#         load_reference_video_landmarks, 
#         play_audio,
#         process_user_landmarks,
#         align_reference_landmarks,
#         smooth_landmarks,
#         JAW_INDICES,
#         MOUTH_INDICES
#     )
# except ImportError as e:
#     logger.error(f"Failed to import computer vision modules: {e}")
#     # Define fallback values if imports fail
#     JAW_INDICES = []
#     MOUTH_INDICES = []
    
#     # Define fallback functions
#     def load_reference_video_landmarks(path):
#         logger.warning("Using fallback landmarks loader")
#         return []
        
#     def play_audio():
#         logger.warning("Using fallback audio player")
#         pass
        
#     def process_user_landmarks(*args, **kwargs):
#         return None
        
#     def align_reference_landmarks(*args, **kwargs):
#         return None, []
        
#     def smooth_landmarks(*args, **kwargs):
#         return None

# # Initialize MediaPipe Face Mesh
# try:
#     mp_face_mesh = mp.solutions.face_mesh
#     face_mesh = mp_face_mesh.FaceMesh(
#         static_image_mode=False,
#         max_num_faces=1,
#         refine_landmarks=True,
#         min_detection_confidence=0.5,
#         min_tracking_confidence=0.5
#     )
# except Exception as e:
#     logger.error(f"Failed to initialize MediaPipe: {e}")
#     face_mesh = None

# # Load reference landmarks from CSV with proper error handling
# csv_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "computer_vision", "reference_landmarks.csv"))
# logger.info(f"🔍 Looking for reference_landmarks.csv at: {csv_path}")

# reference_landmarks = []
# try:
#     if os.path.exists(csv_path):
#         reference_landmarks = load_reference_video_landmarks(csv_path)
#         logger.info(f"✅ Loaded {len(reference_landmarks)} frames of reference landmarks")
#     else:
#         logger.warning(f"⚠️ Reference landmarks file not found at {csv_path}")
# except Exception as e:
#     logger.error(f"🚨 Error loading reference landmarks: {e}")

# # WebRTC peer connections
# peer_connections = {}
# signaling_clients = set()
# client_states = {}

# # Track last messages to help debug repeated issues
# last_messages = []
# MAX_MESSAGES = 20

# @asynccontextmanager
# async def lifespan(app: FastAPI):
#     # Startup logic
#     app.state.start_time = time.time()
#     logger.info("🚀 Server started")

#     yield  # The app runs while this is active

#     # Shutdown logic
#     for pc in peer_connections.values():
#         await pc.close()
#     logger.info("🛑 Server shutting down")

# # Initialize FastAPI app
# app = FastAPI(title="Facial Landmark Tracking with WebRTC", lifespan=lifespan)

# # Add CORS middleware
# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=["*"],
#     allow_credentials=True,
#     allow_methods=["*"],
#     allow_headers=["*"],
# )

# # Custom video processor that implements MediaStreamTrack
# class FacialLandmarkVideoProcessor(MediaStreamTrack):
#     kind = "video"
    
#     def __init__(self, track, client_id):
#         super().__init__()
#         self.track = track
#         self.client_id = client_id
#         self.frame_count = 0
#         self.client_state = client_states.get(client_id, {
#             "play_reference": False,
#             "frame_idx": 0,
#             "landmark_history": [],
#             "last_activity": time.time()
#         })
        
#         if client_id not in client_states:
#             client_states[client_id] = self.client_state
    
#     async def recv(self):
#         # Get the next frame from the camera
#         try:
#             frame = await self.track.recv()
#             self.frame_count += 1
            
#             # Skip processing every N frames to improve performance (process at 5fps)
#             if self.frame_count % 3 != 0:
#                 return frame
            
#             # Update client activity time
#             self.client_state["last_activity"] = time.time()
            
#             # Convert the frame to a format suitable for OpenCV
#             img = frame.to_ndarray(format="bgr24")
            
#             # Process with MediaPipe Face Mesh if available
#             if face_mesh is not None:
#                 img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
#                 results = face_mesh.process(img_rgb)
                
#                 # Check if we detected a face
#                 if results.multi_face_landmarks:
#                     # Extract landmarks
#                     face_landmarks = results.multi_face_landmarks[0]
#                     landmarks = [(landmark.x, landmark.y) 
#                                 for landmark in face_landmarks.landmark]
                    
#                     # Store user landmarks
#                     self.client_state["last_user_landmarks"] = landmarks
                    
#                     # Send to client via signaling connection
#                     await send_landmarks_to_client(self.client_id, landmarks)
                    
#                     # Handle reference playback if active
#                     if self.client_state["play_reference"]:
#                         await process_reference_frame(self.client_id)
            
#             # Return the original frame without modification
#             return frame
            
#         except Exception as e:
#             logger.error(f"Error in video processor: {e}")
#             # Return the last frame if we have an error, or create a blank one
#             return frame if 'frame' in locals() else VideoFrame(width=640, height=480, format="rgb24")

# # Function to send landmarks to client via signaling WebSocket
# async def send_landmarks_to_client(client_id, landmarks):
#     websocket = next((ws for ws in signaling_clients if getattr(ws, "client_id", None) == client_id), None)
#     if websocket:
#         try:
#             # Convert landmarks to the format expected by the client
#             landmark_list = [[float(pt[0]), float(pt[1])] for pt in landmarks]
            
#             await websocket.send_json({
#                 "type": "landmarks",
#                 "landmarks": landmark_list,
#                 "landmarkType": "user",
#                 "timestamp": time.time()
#             })
#         except Exception as e:
#             logger.error(f"Error sending landmarks to client: {e}")

# # Process reference frame and send to client
# async def process_reference_frame(client_id):
#     try:
#         # Get client state
#         client_state = client_states.get(client_id)
#         if not client_state:
#             return
        
#         # Get current frame index
#         frame_idx = client_state["frame_idx"]
        
#         # Check if we have reference landmarks
#         if not reference_landmarks:
#             logger.warning(f"No reference landmarks available for client {client_id}")
#             return
            
#         # Check if we've reached the end of reference data
#         if frame_idx >= len(reference_landmarks):
#             # Loop back to beginning
#             frame_idx = 0
#             client_state["frame_idx"] = 0
            
#             # Send audio sync message
#             websocket = next((ws for ws in signaling_clients if getattr(ws, "client_id", None) == client_id), None)
#             if websocket:
#                 await websocket.send_json({
#                     "type": "start_audio",
#                     "timestamp": time.time()
#                 })
            
#             # Trigger audio playback on server
#             play_audio()
        
#         # Get user landmarks for alignment
#         user_landmarks = client_state.get("last_user_landmarks")
        
#         if user_landmarks:
#             # Align reference landmarks to user's face
#             aligned_landmarks, updated_history = align_reference_landmarks(
#                 user_landmarks, 
#                 frame_idx,
#                 client_state.get("landmark_history", [])
#             )
            
#             if aligned_landmarks:
#                 # Update the landmark history
#                 client_state["landmark_history"] = updated_history
                
#                 # Find client's websocket connection
#                 websocket = next((ws for ws in signaling_clients if getattr(ws, "client_id", None) == client_id), None)
#                 if websocket:
#                     # Send aligned reference landmarks to client
#                     await websocket.send_json({
#                         "type": "reference_landmarks",
#                         "landmarks": aligned_landmarks,
#                         "frame": frame_idx,
#                         "timestamp": time.time()
#                     })
        
#         # Increment frame index
#         client_state["frame_idx"] = frame_idx + 1
    
#     except Exception as e:
#         logger.error(f"Error processing reference frame: {e}")
#         logger.error(traceback.format_exc())

# # WebRTC offer endpoint
# @app.post("/offer")
# async def offer(request: Request):
#     try:
#         params = await request.json()
#         offer = RTCSessionDescription(sdp=params["sdp"], type=params["type"])
        
#         client_id = params.get("client_id", f"client_{len(peer_connections) + 1}")
#         logger.info(f"Received offer from client {client_id}")
        
#         # Close existing connection if any
#         if client_id in peer_connections:
#             old_pc = peer_connections[client_id]
#             await old_pc.close()
            
#         pc = RTCPeerConnection()
#         peer_connections[client_id] = pc
        
#         @pc.on("connectionstatechange")
#         async def on_connectionstatechange():
#             logger.info(f"Connection state for client {client_id}: {pc.connectionState}")
#             if pc.connectionState == "failed" or pc.connectionState == "closed":
#                 if client_id in peer_connections:
#                     del peer_connections[client_id]
        
#         @pc.on("track")
#         def on_track(track):
#             logger.info(f"Track received from client {client_id}: {track.kind}")
#             if track.kind == "video":
#                 pc.addTrack(FacialLandmarkVideoProcessor(track, client_id))
            
#             @track.on("ended")
#             async def on_ended():
#                 logger.info(f"Track ended for client {client_id}")
        
#         # Handle the offer
#         await pc.setRemoteDescription(offer)
        
#         # Create answer
#         answer = await pc.createAnswer()
#         await pc.setLocalDescription(answer)
        
#         # Return the answer
#         return {"sdp": pc.localDescription.sdp, "type": pc.localDescription.type}
    
#     except Exception as e:
#         logger.error(f"Error handling offer: {e}")
#         logger.error(traceback.format_exc())
#         raise HTTPException(status_code=500, detail=str(e))

# # WebRTC signaling WebSocket
# @app.websocket("/signaling")
# async def signaling(websocket: WebSocket):
#     await websocket.accept()
#     client_id = None
    
#     try:
#         # Add to clients set
#         signaling_clients.add(websocket)
#         client_ip = websocket.client.host
#         logger.info(f"Signaling WebSocket Connected: Address(host='{client_ip}', port={websocket.client.port})")
        
#         # Main WebSocket message loop
#         while True:
#             # Receive message
#             message_text = await websocket.receive_text()
            
#             # Track last messages for debugging
#             last_messages.append(message_text)
#             if len(last_messages) > MAX_MESSAGES:
#                 last_messages.pop(0)
            
#             try:
#                 # Parse JSON
#                 message = json.loads(message_text)
                
#                 # Get client ID
#                 if "client_id" in message:
#                     client_id = message["client_id"]
#                     websocket.client_id = client_id
                    
#                 # Handle different message types
#                 message_type = message.get("type")
                
#                 if message_type == "ice-candidate":
#                     # Fix malformed ICE candidates
#                     candidate = message.get("candidate", {})
                    
#                     # Log the received candidate for debugging
#                     candidate_str = str(candidate.get("candidate", ""))
#                     if candidate_str:
#                         logger.info(f"✅ Received ICE Candidate from {client_id}: {candidate}")
                        
#                         # Fix common issues with malformed ICE candidates
#                         if "candidate" in candidate and isinstance(candidate["candidate"], str):
#                             # Fix 'candi date' issue
#                             if "candi date:" in candidate["candidate"]:
#                                 candidate["candidate"] = candidate["candidate"].replace("candi date:", "candidate:")
                            
#                             # Remove any extra spaces
#                             candidate["candidate"] = " ".join(candidate["candidate"].split())
                        
#                     # Get corresponding peer connection
#                     pc = peer_connections.get(client_id)
#                     if pc:
#                         try:
#                             # Add the fixed ICE candidate
#                             await pc.addIceCandidate(candidate)
#                         except Exception as e:
#                             # If we still can't add the candidate, log it but don't crash
#                             logger.error(f"Error adding ICE candidate: {e}")
                
#                 elif message_type == "toggle_reference":
#                     play_reference = message.get("play", False)
#                     if client_id in client_states:
#                         client_states[client_id]["play_reference"] = play_reference
#                         logger.info(f"Reference playback for {client_id}: {'ON' if play_reference else 'OFF'}")
                
#                 elif message_type == "reset":
#                     if client_id in client_states:
#                         client_states[client_id]["frame_idx"] = 0
#                         client_states[client_id]["landmark_history"] = []
#                         logger.info(f"Reset state for {client_id}")
                
#             except json.JSONDecodeError as e:
#                 logger.error(f"Invalid JSON: {e}")
#             except Exception as e:
#                 logger.error(f"Error processing message: {e}")
#                 logger.error(traceback.format_exc())
    
#     except WebSocketDisconnect:
#         # Handle disconnection
#         client_ip = getattr(websocket, "client", None)
#         logger.info(f"Signaling WebSocket Disconnected: {client_ip}")
    
#     except Exception as e:
#         logger.error(f"Unhandled WebSocket error: {e}")
#         logger.error(traceback.format_exc())
    
#     finally:
#         # Clean up
#         if websocket in signaling_clients:
#             signaling_clients.remove(websocket)
        
#         # Clean up peer connection if client_id is known
#         if client_id and client_id in peer_connections:
#             pc = peer_connections[client_id]
#             await pc.close()
#             del peer_connections[client_id]

# # Health check endpoint
# @app.get("/health")
# async def health_check():
#     return {
#         "status": "healthy",
#         "uptime": time.time() - app.state.start_time,
#         "connections": len(peer_connections),
#         "reference_landmarks": len(reference_landmarks)
#     }

# # Debug endpoint to view current clients
# @app.get("/debug/clients")
# async def debug_clients():
#     return {
#         "peer_connections": list(peer_connections.keys()),
#         "signaling_clients": len(signaling_clients),
#         "client_states": {
#             client_id: {
#                 "play_reference": state.get("play_reference", False),
#                 "frame_idx": state.get("frame_idx", 0),
#                 "last_activity": time.time() - state.get("last_activity", 0)
#             }
#             for client_id, state in client_states.items()
#         }
#     }

# # Run with: uvicorn server:app --host 0.0.0.0 --port 8000 --reload
# if __name__ == "__main__":
#     import uvicorn
#     uvicorn.run(app, host="0.0.0.0", port=8000)