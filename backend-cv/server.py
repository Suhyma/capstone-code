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

async def process_and_send_frame(websocket: WebSocket, frame=None):
    """Process a frame and send landmarks back to the client."""
    global frame_idx, fixed_alignment, M_jaw_fixed, M_mouth_fixed
    
    try:
        print("📡 Processing and sending frame...")
        
        if play_reference and not fixed_alignment:
             # Get the last user frame
            user_frame = client_frames.get(websocket)

            if user_frame is None:
                print("⚠️ No user frame available for alignment")
                return
            
            # Process user's face to get their landmarks
            user_landmarks_data, _, _, _, _ = process_frame(
                user_frame, 
                reference_landmarks=None,
                play_reference=False,  # Process as user frame
                frame_idx=0,
                fixed_alignment=False,
                M_jaw_fixed=None, 
                M_mouth_fixed=None
            )
            
            if user_landmarks_data and user_landmarks_data.get("landmarks"):
                print("✅ Computing alignment matrices from user face")
                # Calculate transformation matrices based on user's face
                M_jaw_fixed, M_mouth_fixed = compute_alignment_matrices(
                    reference_landmarks_all_frames[0], 
                    user_landmarks_data["landmarks"]
                )
                fixed_alignment = True
                print("✅ Alignment matrices computed successfully")
            else:
                print("⚠️ No face detected for alignment")
                return

        # If playing reference
        if play_reference and frame_idx < len(reference_landmarks_all_frames):
            # Use provided frame or latest client frame or create dummy if none available
            if frame is None:
                frame = client_frames.get(websocket, np.zeros((480, 640, 3), dtype=np.uint8))
            
            landmarks_data, frame_idx, fixed_alignment, M_jaw_fixed, M_mouth_fixed = process_frame(
                frame, 
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
            
            # Send reference landmarks with clear type information
            await websocket.send_json({
                "type": "landmarks",
                "data": landmarks_data
            })
            
            print(f"📤 Sent reference landmarks to client (frame {frame_idx})")


            # Increment frame index for next time
            frame_idx = (frame_idx + 1) % len(reference_landmarks_all_frames)
            
            # # Send reference landmarks with clear type information
            # await websocket.send_json({
            #     "type": "landmarks",
            #     "data": landmarks_data
            # })
            
            # print(f"📤 Sent reference landmarks to client (frame {frame_idx})")
            
        # If CV is running and we have a frame, process it
        elif cv_running and frame is not None:
            print("🔄 Live tracking mode...")

            landmarks_data, _, _, _, _ = process_frame(
                frame, 
                reference_landmarks=None,
                play_reference=False,
                frame_idx=0,
                fixed_alignment=False,
                M_jaw_fixed=None, 
                M_mouth_fixed=None
            )
            
            # Ensure landmarks type is set to live
            if isinstance(landmarks_data, dict) and "landmarks" in landmarks_data:
                landmarks_data["type"] = "live"

            print(f"📤 Sending live landmarks data: {len(landmarks_data.get('landmarks', [])) if landmarks_data else 0} points")
            await websocket.send_json({
                "type": "landmarks", 
                "data": landmarks_data
            })
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

    # # Send initial state to client
    # await websocket.send_json({
    #     "type": "status",
    #     "cv_running": cv_running,
    #     "play_reference": play_reference
    # })

    try:
        while True:
            data = await websocket.receive_text()
            print(f"Received data of type: {type(data)}")
            print(f"Received data size: {len(data)} bytes")
            
            print(f"📩 Received from client: {data[:50]}...")  # Truncated for logs

            # Convert binary data to a numpy array (image)
            nparr = np.frombuffer(data, np.uint8)
            frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
           
            if frame is None:
                    print("❌ Failed to decode frame!")
                    
            else:
                print(f"📸 Frame decoded: {frame.shape}")
                # Store the latest frame for this client
                client_frames[websocket] = frame
                

                # Process frame based on current mode
                if cv_running:
                    await process_and_send_frame(websocket, frame)
                elif play_reference:
                    # For reference playback, we still want to use the latest frame
                    pass

# TESTCV VERSION
            # command = json.loads(data)
            # if command["type"] == "frame":
            #     try: 
                    

            #         print("📩 Received frame from client!")
            #         # Ensure proper base64 padding
            #         base64_str = command["data"]
            #         padding = len(base64_str) % 4
            #         if padding:
            #             base64_str += "=" * (4 - padding)
                        
            #         # Decode the image
            #         image_data = base64.b64decode(base64_str)
            #         nparr = np.frombuffer(image_data, np.uint8)
            #         frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
                    
            #         if frame is None:
            #             print("❌ Failed to decode frame!")
            #         else:
            #             print(f"📸 Frame decoded: {frame.shape}")
            #             # Store the latest frame for this client
            #             client_frames[websocket] = frame
                        
            #             # Process frame based on current mode
            #             if cv_running and not is_processing:
            #                 is_processing = True
            #                 await process_and_send_frame(websocket, frame)
            #                 is_processing = False
            #             # elif play_reference:
            #             #     # For reference playback, we still want to use the latest frame
            #             #     # but the reference landmarks will be shown on it
            #             #     # (The processing happens in the reference_playback_loop)
            #             #     pass
            #     except Exception as e:
            #          print(f"❌ Frame processing error: {e}")
            #          import traceback
            #          traceback.print_exc()
            #          is_processing = False


            # elif command["type"] == "toggle":
            #     cv_running = command["value"]
            #     print(f"🔄 CV Running: {cv_running}")
                
            #     # If turning off CV, also stop reference playback
            #     if not cv_running:
            #         play_reference = False
            #         frame_idx = 0
            #         fixed_alignment = False
            #         M_jaw_fixed = None
            #         M_mouth_fixed = None
                
            #     # Send updated state back
            #     await websocket.send_json({
            #         "type": "status",
            #         "cv_running": cv_running,
            #         "play_reference": play_reference
            #     })
            
            # elif command["type"] == "play_reference":
            #     play_reference = command["value"]
            #     print(f"🎵 Play Reference: {play_reference}")
                
            #     if play_reference:
            #         # Stop live CV when playing reference
            #         cv_running = False
            #         frame_idx = 0
            #         fixed_alignment = False
            #         M_jaw_fixed = None
            #         M_mouth_fixed = None
                    
            #         # Play audio if supported
            #         print("🎵 Playing reference audio")
            #         try:
            #             play_audio()
            #         except Exception as e:
            #             print(f"⚠️ Error playing audio: {e}")
                    
            #         # Start reference playback as a separate task
            #         asyncio.create_task(reference_playback_loop(websocket))
            #     else:
            #         # Reset state when stopping reference playback
            #         frame_idx = 0
            #         fixed_alignment = False

                
            #     # Send updated state back
            #     await websocket.send_json({
            #         "type": "status",
            #         "cv_running": cv_running,
            #         "play_reference": play_reference
            #     })

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
        frame_idx = 0
        fixed_alignment = False
        M_jaw_fixed = None
        M_mouth_fixed = None

        await websocket.send_json({
            "type": "play_reference",
            "value": True
        })

        # First, compute alignment matrices from first frame
        if not fixed_alignment:
            is_processing = True
            frame = client_frames.get(websocket)
            
            if frame is not None:
                # Process user's face to get their landmarks
                user_landmarks_data, _, _, _, _ = process_frame(
                    frame, 
                    reference_landmarks=None,
                    play_reference=False,  # Process as user frame
                    frame_idx=0,
                    fixed_alignment=False,
                    M_jaw_fixed=None, 
                    M_mouth_fixed=None
                )

                if user_landmarks_data and user_landmarks_data.get("landmarks"):
                    print("✅ Computing alignment matrices from user face")
                    # Calculate transformation matrices based on user's face
                    M_jaw_fixed, M_mouth_fixed = compute_alignment_matrices(
                        reference_landmarks_all_frames[0], 
                        user_landmarks_data["landmarks"]
                    )
                    fixed_alignment = True
                    print("✅ Alignment matrices computed successfully")
                else:
                    print("⚠️ No face detected for alignment")
            
            is_processing = False
                

        while play_reference and websocket in clients:
            is_processing = True
            start_time = time.time()

            # Get the latest frame (with timeout)
            
            # Wait for next frame or use latest available
            frame = client_frames.get(websocket)

            if frame is not None:
                 # Process frame with FIXED alignment matrices
                landmarks_data, _, _, _, _ = process_frame(
                    frame, 
                    reference_landmarks=reference_landmarks_all_frames,
                    play_reference=True, 
                    frame_idx=frame_idx,
                    fixed_alignment=True,  # Force fixed alignment
                    M_jaw_fixed=M_jaw_fixed,  # Use the initial matrices
                    M_mouth_fixed=M_mouth_fixed
                )
            # # Process and send landmarks synchronously
            # landmarks_data, new_frame_idx, new_fixed_alignment, new_M_jaw_fixed, new_M_mouth_fixed = process_frame(
            #     frame, 
            #     play_reference=True, 
            #     frame_idx=frame_idx,
            #     fixed_alignment=fixed_alignment,
            #     M_jaw_fixed=M_jaw_fixed, 
            #     M_mouth_fixed=M_mouth_fixed
            # )
            
            # # Update state only after processing completes
            # frame_idx = new_frame_idx + 1
            # fixed_alignment = new_fixed_alignment
            # M_jaw_fixed = new_M_jaw_fixed
            # M_mouth_fixed = new_M_mouth_fixed
            
            # if frame_idx >= len(reference_landmarks_all_frames):
            #     frame_idx = 0
            
            
            if isinstance(landmarks_data, dict) and "landmarks" in landmarks_data:
                landmarks_data["type"] = "reference"
                await websocket.send_json({
                    "type": "landmarks",
                    "data": landmarks_data
                })
            
            # Increment frame index
            frame_idx = (frame_idx + 1) % len(reference_landmarks_all_frames)

            # Timing control
            processing_time = time.time() - start_time
            print(f"Frame {frame_idx} processed in {processing_time:.3f}s")
            sleep_time = max(0.001, 0.033 - processing_time)
            await asyncio.sleep(sleep_time)
            is_processing = False

        
        # # Notify client of reference playback error
        # await websocket.send_json({
        #     "type": "error",
        #     "message": f"Reference playback error: {str(e)}"
        # })
    except Exception as e:
        print(f"❌ Reference playback error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        # Ensure reference playback state is reset if this loop exits for any reason
        play_reference = False
        is_processing = False
        
        # Notify client that reference playback has stopped
        try:
            await websocket.send_json({
                "type": "play_reference",
                "value": False
            })
        except:
            pass  # Client might be disconnected already


if __name__ == "__main__":
    import uvicorn
    # Run on 0.0.0.0 to make it accessible from other devices on the network
    uvicorn.run("test:app", host="0.0.0.0", port=8000, reload=True)

# from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request, HTTPException
# from fastapi.middleware.cors import CORSMiddleware
# import asyncio
# import json
# import os
# import sys
# import ssl
# import time
# import logging
# from contextlib import asynccontextmanager
# from typing import Set, Dict, Any
# import uvicorn

# # Set up logging
# logging.basicConfig(level=logging.INFO, 
#                    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
# logger = logging.getLogger(__name__)

# # Add parent directory to path for imports
# sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

# # Import CV functions from guide_2.py
# try:
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
#     raise

# # SSL Configuration
# SSL_CERT_PATH = os.environ.get("SSL_CERT_PATH", "certs/server.crt")
# SSL_KEY_PATH = os.environ.get("SSL_KEY_PATH", "certs/server.key")
# USE_SSL = os.environ.get("USE_SSL", "true").lower() == "true"

# # Load reference landmarks from CSV
# csv_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "computer_vision", "reference_landmarks.csv"))
# logger.info(f"🔍 Looking for reference_landmarks.csv at: {csv_path}")

# if not os.path.exists(csv_path):
#     raise FileNotFoundError(f"🚨 Error: File not found at {csv_path}")

# try:
#     reference_landmarks = load_reference_video_landmarks(csv_path)
#     logger.info(f"✅ Loaded {len(reference_landmarks)} frames of reference landmarks")
# except Exception as e:
#     logger.error(f"Failed to load reference landmarks: {e}")
#     raise

# # Connected clients
# clients: Set[WebSocket] = set()

# # Client state tracking
# client_states: Dict[WebSocket, Dict[str, Any]] = {}

# @asynccontextmanager
# async def lifespan(app: FastAPI):
#     # Startup logic
#     app.state.start_time = time.time()
#     logger.info("🚀 Server started")

#     yield  # The app runs while this is active

#     # Shutdown logic
#     for websocket in clients.copy():
#         try:
#             await websocket.close()
#         except Exception as e:
#             logger.error(f"Error closing websocket: {e}")
#     logger.info("🛑 Server shutting down")

# # Initialize FastAPI app
# app = FastAPI(title="Facial Landmark Tracking API", lifespan=lifespan)

# # Add CORS middleware with more secure settings
# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=["*"],  # For production, specify your domains
#     allow_credentials=True,
#     allow_methods=["GET", "POST"],
#     allow_headers=["*"],
#     expose_headers=["X-Server-Time"],
# )

# # Add security headers middleware
# @app.middleware("http")
# async def add_security_headers(request: Request, call_next):
#     response = await call_next(request)
#     response.headers["X-Content-Type-Options"] = "nosniff"
#     response.headers["X-Frame-Options"] = "DENY"
#     response.headers["X-Server-Time"] = str(time.time())
#     return response

# @app.get("/")
# async def root():
#     return {
#         "message": "Server is running!",
#         "secure": USE_SSL,
#         "version": "1.1.0"
#     }

# @app.get("/health")
# async def health_check():
#     return {
#         "status": "healthy",
#         "uptime": time.time() - app.state.start_time if hasattr(app.state, "start_time") else 0,
#         "clients": len(clients),
#         "referenceFrames": len(reference_landmarks),
#         "secure": USE_SSL
#     }

# # Middleware to log requests
# @app.middleware("http")
# async def log_requests(request: Request, call_next):
#     start_time = time.time()
#     logger.info(f"Request: {request.method} {request.url.path} from {request.client}")
#     response = await call_next(request)
#     process_time = time.time() - start_time
#     logger.info(f"Request: {request.method} {request.url.path} - Completed in {process_time:.4f}s")
#     return response

# # Test websocket endpoint for connection validation
# @app.websocket("/test")
# async def test_websocket(websocket: WebSocket):
#     client_ip = websocket.client.host if websocket.client else "unknown"
#     logger.info(f"🟡 Test WebSocket Connection Attempt from: {client_ip}")
    
#     try:
#         await websocket.accept()
#         logger.info(f"✅ Test WebSocket Connected: {client_ip}")
        
#         # Send connection confirmation
#         await websocket.send_json({
#             "type": "connection_status",
#             "status": "connected",
#             "secure": USE_SSL,
#             "timestamp": time.time()
#         })
        
#         # Keep connection alive for a moment to test stability
#         await asyncio.sleep(1)
#         await websocket.send_text("Connection test successful!")
        
#     except Exception as e:
#         logger.error(f"❌ Test WebSocket Error: {e}")
#     finally:
#         try:
#             await websocket.close()
#         except:
#             pass
#         logger.info(f"❌ Test WebSocket Disconnected: {client_ip}")

# # Main WebSocket endpoint
# @app.websocket("/ws")
# async def websocket_endpoint(websocket: WebSocket):
#     client_ip = websocket.client.host if websocket.client else "unknown"
#     logger.info(f"🟡 Incoming WebSocket Connection Attempt from: {client_ip}")
    
#     # Connection validation
#     origin = websocket.headers.get("origin", "unknown")
#     user_agent = websocket.headers.get("user-agent", "unknown")
#     logger.info(f"Origin: {origin}, User-Agent: {user_agent}")
    
#     # Setup connection with error handling
#     try:
#         await websocket.accept()
#         clients.add(websocket)
        
#         # Initialize client state with default values
#         client_states[websocket] = {
#             "play_reference": False,
#             "frame_idx": 0,
#             "last_user_landmarks": None,
#             "connected_at": time.time(),
#             "last_activity": time.time(),
#             "playback_task": None,
#             "landmark_history": [],
#             "connection_errors": 0
#         }
        
#         logger.info(f"✅ WebSocket Connected: {client_ip}")
        
#         # Send initial configuration to client
#         try:
#             await websocket.send_json({
#                 "type": "config",
#                 "indices": {
#                     "jaw": JAW_INDICES,
#                     "mouth": MOUTH_INDICES
#                 },
#                 "frameCount": len(reference_landmarks),
#                 "secure": USE_SSL,
#                 "serverTime": time.time()
#             })
#         except Exception as e:
#             logger.error(f"Failed to send initial config: {e}")
#             client_states[websocket]["connection_errors"] += 1
    
#     except Exception as e:
#         logger.error(f"❌ Failed to establish WebSocket connection: {e}")
#         return
    
#     # Ping task to keep connection alive
#     ping_task = None
    
#     try:
#         # Start a keepalive ping task
#         ping_task = asyncio.create_task(periodic_ping(websocket))
        
#         # Main message processing loop
#         while True:
#             # Update last activity time
#             client_states[websocket]["last_activity"] = time.time()
            
#             # Receive message from client with timeout
#             try:
#                 data = await asyncio.wait_for(websocket.receive_text(), timeout=30.0)
#                 logger.info(f"📩 Received message from client ({len(data)} bytes)")
#             except asyncio.TimeoutError:
#                 # Connection may be stale, send a ping to check
#                 try:
#                     await websocket.send_json({"type": "ping", "timestamp": time.time()})
#                     logger.info("Sent ping due to inactivity")
#                     continue
#                 except:
#                     logger.info("Connection appears to be dead after timeout")
#                     break
            
#             # Process the received message
#             try:
#                 command = json.loads(data)
#                 command_type = command.get("type", "unknown")
                
#                 # Handle different command types
#                 if command_type == "ping":
#                     # Simple ping-pong for connection keepalive
#                     await websocket.send_json({
#                         "type": "pong", 
#                         "timestamp": time.time(),
#                         "serverTime": time.time()
#                     })
                
#                 elif command_type == "play_reference":
#                     # Start or stop reference playback
#                     play_reference = command.get("value", False)
#                     client_states[websocket]["play_reference"] = play_reference
                    
#                     if play_reference:
#                         # Reset frame index and start playback
#                         client_states[websocket]["frame_idx"] = 0
#                         logger.info("🎵 Starting reference playback")
                        
#                         # Send explicit audio sync message to client
#                         await websocket.send_json({
#                             "type": "start_audio",
#                             "timestamp": time.time()
#                         })
                        
#                         # Trigger audio playback
#                         play_audio()
                        
#                         # Start reference playback in a separate task
#                         if client_states[websocket]["playback_task"] is None:
#                             playback_task = asyncio.create_task(
#                                 reference_playback_loop(websocket)
#                             )
#                             client_states[websocket]["playback_task"] = playback_task
#                     else:
#                         # Stop playback
#                         logger.info("⏹️ Stopping reference playback")
#                         if client_states[websocket]["playback_task"]:
#                             client_states[websocket]["playback_task"].cancel()
#                             client_states[websocket]["playback_task"] = None
                    
#                     # Acknowledge command
#                     await websocket.send_json({
#                         "type": "play_reference_ack",
#                         "value": play_reference
#                     })
                
#                 elif command_type == "user_landmarks":
#                     # Process user landmarks from client
#                     user_landmarks = command.get("landmarks", [])
                    
#                     # Store landmarks for potential reference alignment
#                     client_states[websocket]["last_user_landmarks"] = user_landmarks
                    
#                     # Process landmarks using CV backend
#                     processed_data = process_user_landmarks(user_landmarks)
                    
#                     # Send processed data back to client if needed
#                     if processed_data.get("metadata", {}).get("enhancedFeatures", False):
#                         await websocket.send_json({
#                             "type": "processed_landmarks",
#                             "landmarks": processed_data["landmarks"],
#                             "metadata": processed_data["metadata"]
#                         })
                
#                 elif command_type == "connection_check":
#                     # Client is checking connection status
#                     await websocket.send_json({
#                         "type": "connection_status",
#                         "status": "connected",
#                         "secure": USE_SSL,
#                         "timestamp": time.time()
#                     })
                    
#                 else:
#                     logger.warning(f"⚠️ Unknown command type: {command_type}")
#                     await websocket.send_json({
#                         "type": "error", 
#                         "message": f"Unknown command type: {command_type}"
#                     })
            
#             except json.JSONDecodeError as e:
#                 logger.error(f"❌ Invalid JSON received: {str(e)[:100]}")
#                 await websocket.send_json({"type": "error", "message": "Invalid JSON format"})
#                 client_states[websocket]["connection_errors"] += 1
#             except Exception as e:
#                 logger.error(f"❌ Error processing command: {str(e)}")
#                 await websocket.send_json({"type": "error", "message": "Internal server error"})
#                 client_states[websocket]["connection_errors"] += 1
                
#                 # If too many errors, consider the connection unstable
#                 if client_states[websocket]["connection_errors"] > 5:
#                     logger.warning(f"Too many errors for client {client_ip}, closing connection")
#                     break
    
#     except WebSocketDisconnect:
#         logger.info(f"❌ WebSocket Disconnected: {client_ip}")
#     except asyncio.CancelledError:
#         logger.info(f"❌ WebSocket Connection Cancelled: {client_ip}")
#     except Exception as e:
#         logger.error(f"❌ WebSocket Error: {e}")
#     finally:
#         # Clean up resources
#         if ping_task:
#             ping_task.cancel()
            
#         if websocket in client_states:
#             if client_states[websocket].get("playback_task"):
#                 client_states[websocket]["playback_task"].cancel()
#             del client_states[websocket]
            
#         if websocket in clients:
#             clients.remove(websocket)

# # Periodic ping to keep connections alive
# async def periodic_ping(websocket: WebSocket):
#     """Send periodic pings to prevent connection timeouts"""
#     try:
#         while websocket in clients:
#             await asyncio.sleep(15)  # Send a ping every 15 seconds
#             try:
#                 await websocket.send_json({
#                     "type": "ping", 
#                     "timestamp": time.time()
#                 })
#             except Exception as e:
#                 logger.error(f"Failed to send ping: {e}")
#                 break
#     except asyncio.CancelledError:
#         pass  # Task was cancelled, exit silently
#     except Exception as e:
#         logger.error(f"Error in ping task: {e}")

# # Reference playback loop
# async def reference_playback_loop(websocket: WebSocket):
#     """Asynchronous loop to stream reference landmarks to client"""
#     try:
#         # Continue while client is connected and playback is active
#         while (websocket in clients and 
#                websocket in client_states and 
#                client_states[websocket]["play_reference"]):
            
#             # Get current frame index
#             frame_idx = client_states[websocket]["frame_idx"]
            
#             # Check if we've reached the end of reference data
#             if frame_idx >= len(reference_landmarks):
#                 # Loop back to beginning
#                 frame_idx = 0
#                 client_states[websocket]["frame_idx"] = 0
                
#                 # Replay audio at loop point
#                 try:
#                     await websocket.send_json({
#                         "type": "start_audio",
#                         "timestamp": time.time()
#                     })
#                 except Exception as e:
#                     logger.error(f"Failed to send audio sync: {e}")
#                     break

#             # Get user landmarks for alignment
#             user_landmarks = client_states[websocket]["last_user_landmarks"]
            
#             if user_landmarks:
#                 try:
#                     # Align reference landmarks to user's face
#                     aligned_landmarks = align_reference_landmarks(user_landmarks, frame_idx)
                    
#                     if aligned_landmarks:
#                         # Apply client-specific smoothing
#                         landmark_history = client_states[websocket].get("landmark_history", [])
#                         smoothed_landmarks, updated_history = smooth_landmarks(
#                             aligned_landmarks, 
#                             landmark_history
#                         )
#                         # Store updated history
#                         client_states[websocket]["landmark_history"] = updated_history
                        
#                         # Send aligned reference landmarks to client
#                         await websocket.send_json({
#                             "type": "reference_landmarks",
#                             "landmarks": smoothed_landmarks,
#                             "frame": frame_idx
#                         })
#                 except Exception as e:
#                     logger.error(f"Error processing landmarks: {e}")
#                     client_states[websocket]["connection_errors"] += 1
            
#             # Increment frame index
#             client_states[websocket]["frame_idx"] = frame_idx + 1
            
#             # Control playback speed (adjust for ~20fps)
#             await asyncio.sleep(0.05)
    
#     except asyncio.CancelledError:
#         logger.info("Reference playback loop cancelled")
#     except Exception as e:
#         logger.error(f"❌ Reference playback error: {e}")

# # SSL Configuration helper
# def configure_ssl():
#     """Configure SSL context for secure WebSockets"""
#     if not USE_SSL:
#         return None
        
#     # Check if certificate files exist
#     if not os.path.exists(SSL_CERT_PATH) or not os.path.exists(SSL_KEY_PATH):
#         logger.warning(f"SSL certificates not found at {SSL_CERT_PATH} and {SSL_KEY_PATH}")
#         logger.warning("Generating self-signed certificate for development...")
        
#         # Directory for certificates
#         cert_dir = os.path.dirname(SSL_CERT_PATH)
#         if not os.path.exists(cert_dir):
#             os.makedirs(cert_dir)
            
#         # Generate self-signed certificate (for development only)
#         from cryptography import x509
#         from cryptography.x509.oid import NameOID
#         from cryptography.hazmat.primitives import hashes, serialization
#         from cryptography.hazmat.primitives.asymmetric import rsa
#         from datetime import datetime, timedelta
#         import ipaddress
        
#         # Generate private key
#         key = rsa.generate_private_key(
#             public_exponent=65537,
#             key_size=2048
#         )
        
#         # Generate certificate
#         subject = issuer = x509.Name([
#             x509.NameAttribute(NameOID.COUNTRY_NAME, "US"),
#             x509.NameAttribute(NameOID.STATE_OR_PROVINCE_NAME, "California"),
#             x509.NameAttribute(NameOID.LOCALITY_NAME, "San Francisco"),
#             x509.NameAttribute(NameOID.ORGANIZATION_NAME, "Development"),
#             x509.NameAttribute(NameOID.COMMON_NAME, "localhost"),
#         ])
        
#         cert = x509.CertificateBuilder().subject_name(
#             subject
#         ).issuer_name(
#             issuer
#         ).public_key(
#             key.public_key()
#         ).serial_number(
#             x509.random_serial_number()
#         ).not_valid_before(
#             datetime.utcnow()
#         ).not_valid_after(
#             datetime.utcnow() + timedelta(days=365)
#         ).add_extension(
#             x509.SubjectAlternativeName([
#                 x509.DNSName("localhost"),
#                 x509.IPAddress(ipaddress.IPv4Address("127.0.0.1"))
#             ]),
#             critical=False
#         ).sign(key, hashes.SHA256())
        
#         # Write certificates to files
#         with open(SSL_KEY_PATH, "wb") as f:
#             f.write(key.private_bytes(
#                 encoding=serialization.Encoding.PEM,
#                 format=serialization.PrivateFormat.PKCS8,
#                 encryption_algorithm=serialization.NoEncryption()
#             ))
            
#         with open(SSL_CERT_PATH, "wb") as f:
#             f.write(cert.public_bytes(serialization.Encoding.PEM))
            
#         logger.info(f"Created self-signed certificates at {SSL_CERT_PATH} and {SSL_KEY_PATH}")
    
#     # Set up SSL context
#     ssl_context = ssl.create_default_context(ssl.Purpose.CLIENT_AUTH)
#     ssl_context.load_cert_chain(SSL_CERT_PATH, SSL_KEY_PATH)
#     ssl_context.check_hostname = False
#     return ssl_context

# # Run server with uvicorn
# if __name__ == "__main__":
#     # Configure SSL
#     ssl_context = configure_ssl()
    
#     # Get port from environment or use default
#     port = int(os.environ.get("PORT", 8000))
    
#     # Log startup information
#     logger.info(f"Starting server on port {port} with SSL: {USE_SSL}")
    
#     if USE_SSL:
#         uvicorn.run(
#             "server:app", 
#             host="0.0.0.0", 
#             port=port,
#             reload=False,
#             ssl_keyfile=SSL_KEY_PATH,
#             ssl_certfile=SSL_CERT_PATH
#         )
#     else:
#         uvicorn.run(
#             "server:app", 
#             host="0.0.0.0", 
#             port=port,
#             reload=False
#         )
#NoN secure server - most recent
# from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request
# from fastapi.middleware.cors import CORSMiddleware
# import asyncio
# import json
# import os
# import sys
# from typing import Set, Dict, Any
# import time
# import logging
# from contextlib import asynccontextmanager

# # clients = set()  # Ensure clients set exists


# # Set up logging
# logging.basicConfig(level=logging.INFO, 
#                    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
# logger = logging.getLogger(__name__)

# # Add parent directory to path for imports
# sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

# # Import CV functions from guide_2.py
# from computer_vision.guide_2 import (
#     load_reference_video_landmarks, 
#     play_audio,
#     process_user_landmarks,
#     align_reference_landmarks,
#     smooth_landmarks,
#     JAW_INDICES,
#     MOUTH_INDICES
# )

# # Load reference landmarks from CSV
# csv_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "computer_vision", "reference_landmarks.csv"))
# logger.info(f"🔍 Looking for reference_landmarks.csv at: {csv_path}")

# if not os.path.exists(csv_path):
#     raise FileNotFoundError(f"🚨 Error: File not found at {csv_path}")

# reference_landmarks = load_reference_video_landmarks(csv_path)
# logger.info(f"✅ Loaded {len(reference_landmarks)} frames of reference landmarks")

# @asynccontextmanager
# async def lifespan(app: FastAPI):
#     # Startup logic
#     app.state.start_time = time.time()
#     logger.info("🚀 Server started")

#     yield  # The app runs while this is active

#     # Shutdown logic
#     for websocket in clients.copy():
#         try:
#             await websocket.close()
#         except:
#             pass
#     logger.info("🛑 Server shutting down")

# # Initialize FastAPI app
# app = FastAPI(title="Facial Landmark Tracking API", lifespan=lifespan)

# @app.get("/")
# async def root():
#     return {"message": "Server is running!"}

# # Add CORS middleware
# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=["*"],
#     allow_credentials=True,
#     allow_methods=["*"],
#     allow_headers=["*"],
# )

# # Connected clients
# clients: Set[WebSocket] = set()

# # Client state tracking
# client_states: Dict[WebSocket, Dict[str, Any]] = {}

# #test
# @app.websocket("/test")
# async def test_websocket(websocket: WebSocket):
#     logger.info(f"🟡 Incoming WebSocket Connection Attempt from: {websocket.client}")
#     await websocket.accept()
#     logger.info(f"✅ WebSocket Connected: {websocket.client}")
#     try:
#         await websocket.send_text("Connected successfully!")
#         logger.info("✅ Sent 'Connected successfully!' message to client.")
#     except Exception as e:
#         logger.error(f"❌ WebSocket Error: {e}")
#     finally:
#         await websocket.close()
#         logger.info(f"❌ WebSocket Disconnected: {websocket.client}")

# # Middleware to log requests
# @app.middleware("http")
# async def log_requests(request: Request, call_next):
#     start_time = time.time()
#     logger.info(f"Request: {request.method} {request.url.path} from {request.client}")
#     logger.info(f"Headers: {request.headers}")
#     response = await call_next(request)
#     process_time = time.time() - start_time
#     logger.info(f"Request: {request.method} {request.url.path} - Completed in {process_time:.4f}s")
#     logger.info(f"Response status: {response.status_code}")
#     return response

# # WebSocket endpoint
# @app.websocket("/ws")
# async def websocket_endpoint(websocket: WebSocket):
#     logger.info(f"🟡 Incoming WebSocket Connection Attempt from: {websocket.client}")
#     logger.info(f"Headers: {websocket.headers}")

#     await websocket.accept()
#     clients.add(websocket)
    
#     # Initialize client state
#     client_states[websocket] = {
#         "play_reference": False,
#         "frame_idx": 0,
#         "last_user_landmarks": None,
#         "connected_at": time.time(),
#         "last_activity": time.time(),
#         "playback_task": None
#     }
    
#     logger.info(f"✅ WebSocket Connected: {websocket.client}")
    
#     # Send initial configuration to client
#     await websocket.send_json({
#         "type": "config",
#         "indices": {
#             "jaw": JAW_INDICES,
#             "mouth": MOUTH_INDICES
#         },
#         "frameCount": len(reference_landmarks)
#     })

#     try:
#         while True:
#             # Update last activity time
#             client_states[websocket]["last_activity"] = time.time()
            
#             # Receive message from client
#             data = await websocket.receive_text()
#             logger.info(f"📩 Received message from client ({len(data)} bytes)")
            
#             # Parse command
#             try:
#                 command = json.loads(data)
#                 command_type = command.get("type", "unknown")
                
#                 # Handle different command types
#                 if command_type == "ping":
#                     # Simple ping-pong for connection keepalive
#                     await websocket.send_json({"type": "pong", "timestamp": time.time()})
                
#                 elif command_type == "play_reference":
#                     # Start or stop reference playback
#                     play_reference = command.get("value", False)
#                     client_states[websocket]["play_reference"] = play_reference
                    
#                     if play_reference:
#                         # Reset frame index and start playback
#                         client_states[websocket]["frame_idx"] = 0
#                         logger.info("🎵 Starting reference playback")
                        
#                         # Send explicit audio sync message to client
#                         await websocket.send_json({
#                             "type": "start_audio",
#                             "timestamp": time.time()
#                         })
                        
#                         # Trigger audio playback
#                         play_audio()
                        
#                         # Start reference playback in a separate task
#                         if client_states[websocket]["playback_task"] is None:
#                             playback_task = asyncio.create_task(
#                                 reference_playback_loop(websocket)
#                             )
#                             client_states[websocket]["playback_task"] = playback_task
#                     else:
#                         # Stop playback
#                         logger.info("⏹️ Stopping reference playback")
#                         if client_states[websocket]["playback_task"]:
#                             client_states[websocket]["playback_task"].cancel()
#                             client_states[websocket]["playback_task"] = None
                    
#                     # Acknowledge command
#                     await websocket.send_json({
#                         "type": "play_reference_ack",
#                         "value": play_reference
#                     })
                
#                 elif command_type == "user_landmarks":
#                     # Process user landmarks from client
#                     user_landmarks = command.get("landmarks", [])
                    
#                     # Store landmarks for potential reference alignment
#                     client_states[websocket]["last_user_landmarks"] = user_landmarks
                    
#                     # Process landmarks using CV backend
#                     processed_data = process_user_landmarks(user_landmarks)
                    
#                     # Send processed data back to client if needed
#                     # Only send if we've added value through processing
#                     if processed_data.get("metadata", {}).get("enhancedFeatures", False):
#                         await websocket.send_json({
#                             "type": "processed_landmarks",
#                             "landmarks": processed_data["landmarks"],
#                             "metadata": processed_data["metadata"]
#                         })
                
#                 else:
#                     logger.warning(f"⚠️ Unknown command type: {command_type}")
            
#             except json.JSONDecodeError as e:
#                 logger.error(f"❌ Invalid JSON received: {str(e)[:100]}")
#                 await websocket.send_json({"type": "error", "message": "Invalid JSON format"})
#             except Exception as e:
#                 logger.error(f"❌ Error processing command: {str(e)}")
#                 await websocket.send_json({"type": "error", "message": "Internal server error"})
    
#     except WebSocketDisconnect:
#         logger.info(f"❌ WebSocket Disconnected: {websocket.client}")
#     except asyncio.CancelledError:
#         logger.info(f"❌ WebSocket Connection Cancelled: {websocket.client}")
#     except Exception as e:
#         logger.error(f"❌ WebSocket Error: {e}")
#     finally:
#         # Clean up resources
#         if websocket in client_states:
#             if client_states[websocket].get("playback_task"):
#                 client_states[websocket]["playback_task"].cancel()
#             del client_states[websocket]
#         clients.remove(websocket)

# # Reference playback loop
# async def reference_playback_loop(websocket: WebSocket):
#     """Asynchronous loop to stream reference landmarks to client"""
#     try:
#          # Initialize client-specific landmark history if it doesn't exist
#         if "landmark_history" not in client_states[websocket]:
#             client_states[websocket]["landmark_history"] = []

#         # Continue while client is connected and playback is active
#         while (websocket in clients and 
#                websocket in client_states and 
#                client_states[websocket]["play_reference"]):
            
#             # Get current frame index
#             frame_idx = client_states[websocket]["frame_idx"]
            
#             # Check if we've reached the end of reference data
#             if frame_idx >= len(reference_landmarks):
#                 # Loop back to beginning
#                 frame_idx = 0
#                 client_states[websocket]["frame_idx"] = 0
                
#                 # Optionally replay audio at loop point
#                 # Send audio sync message
#                 await websocket.send_json({
#                     "type": "start_audio",
#                     "timestamp": time.time()
#                 })

#             # Get user landmarks for alignment
#             user_landmarks = client_states[websocket]["last_user_landmarks"]
            
#             if user_landmarks:
#                 # Align reference landmarks to user's face
#                 aligned_landmarks = align_reference_landmarks(user_landmarks, frame_idx)
                
#                 if aligned_landmarks:
#                     # # Send aligned reference landmarks to client
#                     # await websocket.send_json({
#                     #     "type": "reference_landmarks",
#                     #     "landmarks": aligned_landmarks,
#                     #     "frame": frame_idx
#                     # })
#                      # Apply client-specific smoothing
#                     landmark_history = client_states[websocket].get("landmark_history", [])
#                     smoothed_landmarks, updated_history = smooth_landmarks(
#                         aligned_landmarks, 
#                         landmark_history
#                     )
#                     # Store updated history
#                     client_states[websocket]["landmark_history"] = updated_history
                    
#                     # Send aligned reference landmarks to client
#                     await websocket.send_json({
#                         "type": "reference_landmarks",
#                         "landmarks": smoothed_landmarks,
#                         "frame": frame_idx
#                     })
            
#             # Increment frame index
#             client_states[websocket]["frame_idx"] = frame_idx + 1
            
#             # Control playback speed (adjust for ~20fps)
#             await asyncio.sleep(0.05)
    
#     except asyncio.CancelledError:
#         logger.info("Reference playback loop cancelled")
#     except Exception as e:
#         logger.error(f"❌ Reference playback error: {e}")

# # Health check endpoint
# @app.get("/health")
# async def health_check():
#     return {
#         "status": "healthy",
#         "uptime": time.time() - app.state.start_time if hasattr(app.state, "start_time") else 0,
#         "clients": len(clients),
#         "referenceFrames": len(reference_landmarks)
#     }




# # Run server with uvicorn
# if __name__ == "__main__":
#     import uvicorn
#     uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=False)

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
# from computer_vision.guide_2 import process_frame, load_reference_video_landmarks, play_audio

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
#     global play_reference
    
#     try:
#         while play_reference and websocket in clients:
#             await process_and_send_frame(websocket)
#             await asyncio.sleep(0.05)  # ~20fps for reference playback
#     except Exception as e:
#         print(f"❌ Reference playback error: {e}")


# if __name__ == "__main__":
#     import uvicorn
#     # Run on 0.0.0.0 to make it accessible from other devices on the network
#     uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=True)

#OLD SERVER CODE
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
# from computer_vision.guide_2 import process_frame, load_reference_video_landmarks, play_audio

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
#             print(f"📩 Received from client: {data}")

#             command = json.loads(data)

#             if command["type"] == "frame":
#                 try: 
#                     print("📩 Received frame from client!")  # Debugging log
#                     image_data = base64.b64decode(command["data"] + "===")  # ✅ Ensure padding correction
#                     nparr = np.frombuffer(image_data, np.uint8)
#                     frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
                    
#                     if frame is None:
#                         print("❌ Failed to decode frame!")
#                     else:
#                         print("📸 Frame received and decoded successfully!")
#                 except Exception as e:
#                      print(f"❌ Base64 decoding error: {e}")


#             elif command["type"] == "toggle":
#                 cv_running = command["value"]
#                 print(f"🔄 CV Running: {cv_running}")
#                 if not cv_running:
#                     play_reference = False
#                     frame_idx = 0
#                     fixed_alignment = False
            
#             elif command["type"] == "play_reference":
#                 if command["value"]:
#                     play_reference = True
#                     cv_running = False  # Stop live tracking when playing reference
#                     frame_idx = 0
#                     fixed_alignment = False
#                     print("🎵 Playing reference audio")
#                     play_audio()
#                 else:
#                     play_reference = False
#                     cv_running = False

#             # Send updated state back
#             await websocket.send_json({
#                 "cv_running": cv_running,
#                 "play_reference": play_reference
#             })

#             # Start processing frames when CV is running
#             if cv_running or play_reference:
#                 asyncio.create_task(process_and_send_frame(websocket))  # Run asynchronously

#     except WebSocketDisconnect:
#         print(f"❌ WebSocket Disconnected: {websocket.client}")
#     except Exception as e:
#         print(f"❌ WebSocket Error: {e}")
#     finally:
#         clients.remove(websocket)

# async def process_and_send_frame(websocket: WebSocket):
#     """Captures frames, processes them, and sends landmark data."""
#     global frame_idx, fixed_alignment, M_jaw_fixed, M_mouth_fixed

#     cap = cv2.VideoCapture(0)  # Open webcam
#     if not cap.isOpened():
#         print("❌ Error: Could not access webcam")
#         return
    
#     try:
#         while cv_running or play_reference:
#             ret, frame = cap.read()
#             if not ret:
#                 print("❌ Error: Failed to capture frame")
#                 break
            
#             print("📸 Processing frame...")  # Debugging log

#             # Process frame with guide_2.py
#             processed_landmarks, frame_idx, fixed_alignment, M_jaw_fixed, M_mouth_fixed = process_frame(
#                 frame, play_reference, frame_idx, fixed_alignment, M_jaw_fixed, M_mouth_fixed
#             )

#             # Send processed landmarks to client
#             await websocket.send_json({
#                 "type": "landmarks",
#                 "data": processed_landmarks
#             })

#             await asyncio.sleep(0.033)  # ~30 FPS

#     except Exception as e:
#         print(f"❌ Error in process_and_send_frame: {e}")
#     finally:
#         cap.release()

# async def process_and_send_frame(base64_data, websocket):
#     try:
#         if not base64_data or len(base64_data) % 4 != 0:
#             print("❌ Invalid Base64 received. Skipping frame.")
#             return
        
#         image_data = base64.b64decode(base64_data)
#         np_arr = np.frombuffer(image_data, np.uint8)
#         frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

#         if frame is None:
#             print("❌ Decoded frame is empty. Skipping.")
#             return

#         print("📸 Processing frame...")
#         landmarks_data, _, _, _, _ = process_frame(frame)
        
#         await websocket.send_json({
#             "type": "landmarks",
#             "data": landmarks_data
#         })

#     except Exception as e:
#         print(f"❌ Error in process_and_send_frame: {e}")


# @asynccontextmanager
# async def lifespan(app: FastAPI):
#     """Lifecycle event to clean up resources on shutdown."""
#     yield
#     print("🛑 Server shutting down...")

# if __name__ == "__main__":
#     import uvicorn
#     print("🚀 Starting FastAPI Server...")
#     uvicorn.run(app, host="10.36.79.138", port=8000)
