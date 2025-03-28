import cv2
import mediapipe as mp
import numpy as np
import json
import base64
import asyncio
import websockets
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from typing import Dict, List
import logging


app = FastAPI()

# Initialize MediaPipe Face Mesh
mp_face_mesh = mp.solutions.face_mesh
face_mesh = mp_face_mesh.FaceMesh(static_image_mode=False, max_num_faces=1, refine_landmarks=True, min_detection_confidence=0.5)

# Set up logging
logging.basicConfig(level=logging.INFO, 
                   format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# # Add parent directory to path for imports
# sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

# # Load reference landmarks from CSV
# csv_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "computer_vision", "reference_landmarks.csv"))
# logger.info(f"🔍 Looking for reference_landmarks.csv at: {csv_path}")

# if not os.path.exists(csv_path):
#     raise FileNotFoundError(f"🚨 Error: File not found at {csv_path}")

# try:
#     reference_landmarks_all_frames = load_reference_video_landmarks(csv_path)
#     logger.info(f"✅ Loaded {len(reference_landmarks)} frames of reference landmarks")
# except Exception as e:
#     logger.error(f"Failed to load reference landmarks: {e}")
#     raise

# Active WebSocket connections
connected_clients: Dict[str, WebSocket] = {}

# Load Reference Landmarks
def load_reference_video_landmarks(csv_path):
    all_landmarks = []
    current_frame = -1
    frame_landmarks = []

    with open(csv_path, newline='') as csvfile:
        for row in csvfile:
            try:
                values = row.strip().split(",")
                frame = int(values[0])
                x, y = int(values[1]), int(values[2])

                if frame != current_frame:
                    if frame_landmarks:
                        all_landmarks.append(frame_landmarks)
                    frame_landmarks = []
                    current_frame = frame

                frame_landmarks.append((x, y))
            except:
                continue

        if frame_landmarks:
            all_landmarks.append(frame_landmarks)

    return all_landmarks

# Load reference animation
reference_landmarks_all_frames = load_reference_video_landmarks("../computer_vision/reference_landmarks.csv")

# Compute transformation matrices
def compute_alignment_matrix(user_landmarks, reference_landmarks):
    JAW_INDICES = [389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162]

    ref_jaw_points = np.float32([reference_landmarks[i] for i in JAW_INDICES])
    user_jaw_points = np.float32([user_landmarks[i] for i in JAW_INDICES])

    M_jaw, _ = cv2.estimateAffinePartial2D(user_jaw_points, ref_jaw_points)
    return M_jaw

# Apply transformation
def apply_transformation(reference_landmarks, M):
    transformed_landmarks = np.array(reference_landmarks, dtype=np.float32).reshape(-1, 1, 2)
    transformed_landmarks = cv2.transform(transformed_landmarks, M).reshape(-1, 2)
    return transformed_landmarks.astype(int).tolist()

@app.websocket("/signaling")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    client_id = str(websocket.client)
    connected_clients[client_id] = websocket

    print(f"✅ WebSocket Connected: {client_id}")

    try:
        while True:
            message = await websocket.receive_text()
            data = json.loads(message)

            if data["type"] == "capture_snapshot":
                # Decode and process the image
                image_bytes = base64.b64decode(data["image"])
                nparr = np.frombuffer(image_bytes, np.uint8)
                image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

                # Convert to RGB
                rgb_frame = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
                results = face_mesh.process(rgb_frame)

                if results.multi_face_landmarks:
                    face_landmarks = results.multi_face_landmarks[0]

                    user_landmarks = []
                    for idx, landmark in enumerate(face_landmarks.landmark):
                        x = int(landmark.x * image.shape[1])
                        y = int(landmark.y * image.shape[0])
                        user_landmarks.append((x, y))

                    # Compute alignment matrix
                    M_jaw = compute_alignment_matrix(user_landmarks, reference_landmarks_all_frames[0])

                    # Apply transformation to all frames of reference animation
                    transformed_frames = []
                    for frame_landmarks in reference_landmarks_all_frames:
                        aligned_landmarks = apply_transformation(frame_landmarks, M_jaw)
                        transformed_frames.append(aligned_landmarks)

                    # Send user landmarks & reference animation to frontend
                    await websocket.send_text(json.dumps({
                        "type": "user_landmarks",
                        "landmarks": user_landmarks
                    }))

                    await websocket.send_text(json.dumps({
                        "type": "reference_landmarks",
                        "frames": transformed_frames
                    }))

                    print("✅ Sent aligned reference landmarks")

    except WebSocketDisconnect:
        print(f"❌ WebSocket Disconnected: {client_id}")
        del connected_clients[client_id]

# Run FastAPI with WebSockets
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("static:app", host="0.0.0.0", port=8000, reload=False)
