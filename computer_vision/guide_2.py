import cv2
import mediapipe as mp
import numpy as np
import csv
import threading
import os
import pygame
from typing import Tuple, Dict, List, Any
import json
import time

# Initialize MediaPipe Face Mesh
mp_face_mesh = mp.solutions.face_mesh
face_mesh = mp_face_mesh.FaceMesh(static_image_mode=False, max_num_faces=1, refine_landmarks=True, min_detection_confidence=0.5)

# Landmark smoothing
SMOOTHING_WINDOW_SIZE = 2


# Jaw and mouth indices
JAW_INDICES = [389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162]
MOUTH_INDICES = [61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 308, 324, 318, 402, 317, 14, 87, 178, 88, 95, 78, 61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291, 308, 415, 310, 311, 312, 13, 82, 81, 80, 78, 191]

# Global reference landmarks
reference_landmarks_all_frames = []

class AudioPlayer:
    def __init__(self):
        self.playing = False
        pygame.mixer.init()
    
    def play(self, audio_path):
        try:
            if not self.playing and os.path.exists(audio_path):
                self.playing = True
                pygame.mixer.music.load(audio_path)
                pygame.mixer.music.play()
                while pygame.mixer.music.get_busy():
                    pygame.time.Clock().tick(10)
                pygame.mixer.music.unload()
        finally:
            self.playing = False

audio_player = AudioPlayer()

def play_audio():
    if not audio_player.playing:
        # Find audio file relative to this script
        script_dir = os.path.dirname(os.path.abspath(__file__))
        audio_path = os.path.join(script_dir, "carrot_audio.mp3")
        
        if not os.path.exists(audio_path):
            print(f"⚠️ Audio file not found at {audio_path}")
            return
            
        print(f"🔊 Playing audio from {audio_path}")
        audio_player.play(audio_path)  # Directly call play

# Load reference landmarks
def load_reference_video_landmarks(csv_path):
    global reference_landmarks_all_frames
    all_landmarks = []
    current_frame = -1
    frame_landmarks = []
    
    try:
        with open(csv_path, newline='') as csvfile:
            reader = csv.DictReader(csvfile)
            for row in reader:
                try:
                    frame = int(row["Frame"])
                    x = float(row["X"])
                    y = float(row["Y"])
                    
                    if frame != current_frame:
                        if frame_landmarks:
                            all_landmarks.append(frame_landmarks)
                        frame_landmarks = []
                        current_frame = frame
                        
                    frame_landmarks.append((x, y))
                except (ValueError, KeyError) as e:
                    print(f"⚠️ Error processing CSV row: {e}")
                    continue
                    
            # Add the last frame
            if frame_landmarks:
                all_landmarks.append(frame_landmarks)
                
        print(f"✅ Loaded {len(all_landmarks)} frames from {csv_path}")
        reference_landmarks_all_frames = all_landmarks
        return all_landmarks
    except Exception as e:
        print(f"❌ Failed to load landmarks: {e}")
        return []

# Convert between different landmark formats
def convert_landmarks_to_list_format(landmarks):
    """Convert tuple format (x,y) to list format [x,y]"""
    return [[float(x), float(y)] for x, y in landmarks]

def convert_landmarks_to_tuple_format(landmarks):
    """Convert list format [x,y] to tuple format (x,y)"""
    return [(float(x), float(y)) for x, y in landmarks]

# Smooth landmarks for stability
def smooth_landmarks(current_landmarks, landmark_history=None):
    # global landmark_history
    
    # Initialize history if not provided
    if landmark_history is None:
        landmark_history = []

    # Convert to numpy for calculations
    current_np = np.array(current_landmarks)
    
    # Add to history
    landmark_history.append(current_np)
    
    # Keep history within window size
    if len(landmark_history) > SMOOTHING_WINDOW_SIZE:
        landmark_history.pop(0)
    
    # Compute average over history
    if len(landmark_history) > 0:
        smoothed = np.mean(landmark_history, axis=0)
        return smoothed.tolist(), landmark_history
    else:
        return current_landmarks, landmark_history

# Compute transformation matrices
def compute_alignment_matrices(reference_landmarks, user_landmarks):
    # Extract jaw landmarks
    ref_jaw = np.float32([reference_landmarks[i] for i in JAW_INDICES if i < len(reference_landmarks)])
    user_jaw = np.float32([user_landmarks[i] for i in JAW_INDICES if i < len(user_landmarks)])
    
    # Check if we have enough points
    if len(ref_jaw) < 3 or len(user_jaw) < 3:
        print("⚠️ Not enough jaw landmarks for alignment")
        # Return identity matrices if not enough points
        return np.array([[1, 0, 0], [0, 1, 0]]), np.array([[1, 0, 0], [0, 1, 0]])
    
    # Estimate transformation for jaw
    M_jaw, _ = cv2.estimateAffinePartial2D(ref_jaw, user_jaw)
    
    # Extract mouth landmarks
    ref_mouth = np.float32([reference_landmarks[i] for i in MOUTH_INDICES if i < len(reference_landmarks)])
    user_mouth = np.float32([user_landmarks[i] for i in MOUTH_INDICES if i < len(user_landmarks)])
    
    # Check if we have enough points
    if len(ref_mouth) < 3 or len(user_mouth) < 3:
        print("⚠️ Not enough mouth landmarks for alignment")
        # Return identity matrix if not enough points
        return M_jaw, np.array([[1, 0, 0], [0, 1, 0]])
    
    # Estimate transformation for mouth
    M_mouth, _ = cv2.estimateAffinePartial2D(ref_mouth, user_mouth)
    
    return M_jaw, M_mouth

# Apply transformations to reference to align it with user face
def apply_fixed_transformation(reference_landmarks, M_jaw, M_mouth):
    aligned_landmarks = reference_landmarks.copy()
    
    # Skip if transformations aren't valid
    if M_jaw is None or M_mouth is None:
        return aligned_landmarks
    
    # Transform jaw landmarks
    jaw_indices = [i for i in JAW_INDICES if i < len(reference_landmarks)]
    if jaw_indices:
        jaw_points = np.float32([reference_landmarks[i] for i in jaw_indices]).reshape(-1, 1, 2)
        try:
            aligned_jaw = cv2.transform(jaw_points, M_jaw).reshape(-1, 2)
            for i, idx in enumerate(jaw_indices):
                aligned_landmarks[idx] = (float(aligned_jaw[i][0]), float(aligned_jaw[i][1]))
        except Exception as e:
            print(f"⚠️ Jaw transformation error: {e}")
    
    # Transform mouth landmarks
    mouth_indices = [i for i in MOUTH_INDICES if i < len(reference_landmarks)]
    if mouth_indices:
        mouth_points = np.float32([reference_landmarks[i] for i in mouth_indices]).reshape(-1, 1, 2)
        try:
            aligned_mouth = cv2.transform(mouth_points, M_mouth).reshape(-1, 2)
            for i, idx in enumerate(mouth_indices):
                aligned_landmarks[idx] = (float(aligned_mouth[i][0]), float(aligned_mouth[i][1]))
        except Exception as e:
            print(f"⚠️ Mouth transformation error: {e}")
    
    return aligned_landmarks

# Process user landmarks from mobile client
def process_user_landmarks(user_landmarks, frame_width=640, frame_height=480):
    """
    Process landmarks from the mobile client and extract features.
    This function can be expanded to include more advanced processing.
    """
    try:
        # Convert landmarks to the format expected by our processing
        # Mobile client sends landmarks in [x, y] format in normalized coordinates
        user_landmarks_normalized = [(x, y) for x, y in user_landmarks]
        
        # Create metadata with processing results
        metadata = {
            "processedAt": time.time(),
            "faceDetected": True,
            "normalizedCoordinates": True,
            "indices": {
                "jaw": JAW_INDICES,
                "mouth": MOUTH_INDICES
            }
        }
        
        # Return processed landmarks and metadata
        return {
            "landmarks": user_landmarks,
            "metadata": metadata
        }
    except Exception as e:
        print(f"❌ Error processing user landmarks: {e}")
        import traceback
        traceback.print_exc()
        return {
            "landmarks": user_landmarks,
            "metadata": {
                "processedAt": time.time(),
                "faceDetected": False,
                "error": str(e)
            }
        }

# Align reference landmarks to user face
def align_reference_landmarks(user_landmarks, frame_idx=0, landmark_history=None):
    """
    Align reference landmarks to match the user's face.
    Returns aligned reference landmarks in the mobile format.
    """
    global reference_landmarks_all_frames
    
    try:
        # Ensure we have reference landmarks loaded
        if not reference_landmarks_all_frames or frame_idx >= len(reference_landmarks_all_frames):
            print("⚠️ No reference landmarks available or invalid frame index")
            return None, landmark_history
            
        # Get reference landmarks for the current frame
        reference_landmarks = reference_landmarks_all_frames[frame_idx]
        
        # Compute transformation matrices for alignment
        M_jaw, M_mouth = compute_alignment_matrices(reference_landmarks, user_landmarks)
        
        # Apply transformations to align reference with user face
        aligned_landmarks = apply_fixed_transformation(reference_landmarks, M_jaw, M_mouth)
        
        # Smooth landmarks for stability
        smoothed_landmarks, updated_history = smooth_landmarks(aligned_landmarks, landmark_history)
        
        # Convert to list format expected by the frontend
        result_landmarks = convert_landmarks_to_list_format(smoothed_landmarks)
        
        return result_landmarks, updated_history
    except Exception as e:
        print(f"❌ Error aligning reference landmarks: {e}")
        import traceback
        traceback.print_exc()
        return None, landmark_history

# Process a frame from camera
def process_frame(frame, play_reference=False, frame_idx=0, fixed_alignment=False, M_jaw_fixed=None, M_mouth_fixed=None):
    try:
        print("📸 Processing frame...")
        frame_height, frame_width = frame.shape[:2]
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = face_mesh.process(rgb_frame)

        print("🧠 FaceMesh Processing Done")

        # Default response with no landmarks
        landmarks_data = {
            "landmarks": None,
            "type": "none",
            "indices": {
                "jaw": JAW_INDICES,
                "mouth": MOUTH_INDICES
            }
        }
        
        # Check if we detected any face
        if results.multi_face_landmarks:
            print("✅ Detected face landmarks!")
            face_landmarks = results.multi_face_landmarks[0]
            user_landmarks = [(landmark.x, landmark.y) 
                            for landmark in face_landmarks.landmark]
            
            # Playing reference mode
            if play_reference:
                print("🎥 Playing reference mode...")
                # Get global reference landmarks
                global reference_landmarks_all_frames
                
                # First time setup - compute alignment
                if ((not fixed_alignment) or 
                    (M_jaw_fixed is None) or 
                    (M_mouth_fixed is None)) and frame_idx < len(reference_landmarks_all_frames):
                    print("🔄 Computing alignment matrices...")
                    # Compute transformation matrices with more accurate scaling
                    M_jaw_fixed, M_mouth_fixed = compute_alignment_matrices(
                        reference_landmarks_all_frames[0], user_landmarks
                    )
                    fixed_alignment = True
                    
                # Apply transformation to reference landmarks
                if frame_idx < len(reference_landmarks_all_frames):
                    aligned_landmarks = apply_fixed_transformation(
                        reference_landmarks_all_frames[frame_idx], M_jaw_fixed, M_mouth_fixed
                    )
                    
                    # Smooth for stability
                    smoothed_landmarks = smooth_landmarks(aligned_landmarks)
                    
                    # Trigger audio playback if this is the first frame
                    if frame_idx == 0:
                        play_audio()
                    
                    # Return reference landmarks
                    landmarks_data = {
                        "landmarks": smoothed_landmarks,
                        "type": "reference",
                        "indices": {
                            "jaw": JAW_INDICES,
                            "mouth": MOUTH_INDICES
                        }
                    }
                else:
                    # Reset for next time
                    frame_idx = 0
                    fixed_alignment = False
            else:
                # Return user face landmarks
                landmarks_data = {
                    "landmarks": user_landmarks,
                    "type": "user",
                    "indices": {
                        "jaw": JAW_INDICES,
                        "mouth": MOUTH_INDICES
                    }
                }
                
        print(f"📤 Final landmarks data: {landmarks_data['type']}")
        return landmarks_data, frame_idx, fixed_alignment, M_jaw_fixed, M_mouth_fixed
        
    except Exception as e:
        print(f"❌ Error in process_frame: {e}")
        import traceback
        traceback.print_exc()
        return landmarks_data, frame_idx, fixed_alignment, M_jaw_fixed, M_mouth_fixed

# import cv2
# import mediapipe as mp
# import numpy as np
# import csv
# import threading
# import os
# import pygame
# from typing import Tuple, Dict, List, Any
# import json

# # Initialize MediaPipe Face Mesh
# mp_face_mesh = mp.solutions.face_mesh
# face_mesh = mp_face_mesh.FaceMesh(static_image_mode=False, max_num_faces=1, refine_landmarks=True, min_detection_confidence=0.5)

# # Landmark smoothing
# SMOOTHING_WINDOW_SIZE = 2
# landmark_history = []

# # Jaw and mouth indices
# JAW_INDICES = [389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162]
# MOUTH_INDICES = [61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 308, 324, 318, 402, 317, 14, 87, 178, 88, 95, 78, 61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291, 308, 415, 310, 311, 312, 13, 82, 81, 80, 78, 191]

# class AudioPlayer:
#     def __init__(self):
#         self.playing = False
#         pygame.mixer.init()
    
#     def play(self, audio_path):
#         try:
#             if not self.playing and os.path.exists(audio_path):
#                 self.playing = True
#                 pygame.mixer.music.load(audio_path)
#                 pygame.mixer.music.play()
#                 while pygame.mixer.music.get_busy():
#                     pygame.time.Clock().tick(10)
#                 pygame.mixer.music.unload()
#         finally:
#             self.playing = False

# audio_player = AudioPlayer()

# def play_audio():
#     if not audio_player.playing:
#         # Find audio file relative to this script
#         script_dir = os.path.dirname(os.path.abspath(__file__))
#         audio_path = os.path.join(script_dir, "carrot_audio.mp3")
        
#         if not os.path.exists(audio_path):
#             print(f"⚠️ Audio file not found at {audio_path}")
#             return
            
#         print(f"🔊 Playing audio from {audio_path}")
#         audio_player.play(audio_path)  # Directly call play
#         # thread = threading.Thread(target=lambda: audio_player.play(audio_path))
#         # thread.daemon = True
#         # thread.start()

# # Load reference landmarks
# def load_reference_video_landmarks(csv_path):
#     all_landmarks = []
#     current_frame = -1
#     frame_landmarks = []
    
#     try:
#         with open(csv_path, newline='') as csvfile:
#             reader = csv.DictReader(csvfile)
#             for row in reader:
#                 try:
#                     frame = int(row["Frame"])
#                     x = int(row["X"])
#                     y = int(row["Y"])
                    
#                     if frame != current_frame:
#                         if frame_landmarks:
#                             all_landmarks.append(frame_landmarks)
#                         frame_landmarks = []
#                         current_frame = frame
                        
#                     frame_landmarks.append((x, y))
#                 except (ValueError, KeyError) as e:
#                     print(f"⚠️ Error processing CSV row: {e}")
#                     continue
                    
#             # Add the last frame
#             if frame_landmarks:
#                 all_landmarks.append(frame_landmarks)
                
#         print(f"✅ Loaded {len(all_landmarks)} frames from {csv_path}")
#         return all_landmarks
#     except Exception as e:
#         print(f"❌ Failed to load landmarks: {e}")
#         return []

# # Smooth landmarks for stability
# def smooth_landmarks(current_landmarks):
#     global landmark_history
    
#     # Convert to numpy for calculations
#     current_np = np.array(current_landmarks)
    
#     # Add to history
#     landmark_history.append(current_np)
    
#     # Keep history within window size
#     if len(landmark_history) > SMOOTHING_WINDOW_SIZE:
#         landmark_history.pop(0)
    
#     # Compute average over history
#     if len(landmark_history) > 0:
#         smoothed = np.mean(landmark_history, axis=0).astype(int)
#         return smoothed.tolist()
#     else:
#         return current_landmarks

# # Compute transformation matrices
# def compute_alignment_matrices(reference_landmarks, user_landmarks):
#     # Extract jaw landmarks
#     ref_jaw = np.float32([reference_landmarks[i] for i in JAW_INDICES if i < len(reference_landmarks)])
#     user_jaw = np.float32([user_landmarks[i] for i in JAW_INDICES if i < len(user_landmarks)])
    
#     # Check if we have enough points
#     if len(ref_jaw) < 3 or len(user_jaw) < 3:
#         print("⚠️ Not enough jaw landmarks for alignment")
#         # Return identity matrices if not enough points
#         return np.array([[1, 0, 0], [0, 1, 0]]), np.array([[1, 0, 0], [0, 1, 0]])
    
#     # Estimate transformation for jaw
#     M_jaw, _ = cv2.estimateAffinePartial2D(ref_jaw, user_jaw)
    
#     # Extract mouth landmarks
#     ref_mouth = np.float32([reference_landmarks[i] for i in MOUTH_INDICES if i < len(reference_landmarks)])
#     user_mouth = np.float32([user_landmarks[i] for i in MOUTH_INDICES if i < len(user_landmarks)])
    
#     # Check if we have enough points
#     if len(ref_mouth) < 3 or len(user_mouth) < 3:
#         print("⚠️ Not enough mouth landmarks for alignment")
#         # Return identity matrix if not enough points
#         return M_jaw, np.array([[1, 0, 0], [0, 1, 0]])
    
#     # Estimate transformation for mouth
#     M_mouth, _ = cv2.estimateAffinePartial2D(ref_mouth, user_mouth)
    
#     return M_jaw, M_mouth

# # Apply transformations to reference to align it with user face
# def apply_fixed_transformation(reference_landmarks, M_jaw, M_mouth):
#     aligned_landmarks = reference_landmarks.copy()
    
#     # Skip if transformations aren't valid
#     if M_jaw is None or M_mouth is None:
#         return aligned_landmarks
    
#     # Transform jaw landmarks
#     jaw_indices = [i for i in JAW_INDICES if i < len(reference_landmarks)]
#     if jaw_indices:
#         jaw_points = np.float32([reference_landmarks[i] for i in jaw_indices]).reshape(-1, 1, 2)
#         try:
#             aligned_jaw = cv2.transform(jaw_points, M_jaw).reshape(-1, 2)
#             for i, idx in enumerate(jaw_indices):
#                 aligned_landmarks[idx] = (int(aligned_jaw[i][0]), int(aligned_jaw[i][1]))
#         except Exception as e:
#             print(f"⚠️ Jaw transformation error: {e}")
    
#     # Transform mouth landmarks
#     mouth_indices = [i for i in MOUTH_INDICES if i < len(reference_landmarks)]
#     if mouth_indices:
#         mouth_points = np.float32([reference_landmarks[i] for i in mouth_indices]).reshape(-1, 1, 2)
#         try:
#             aligned_mouth = cv2.transform(mouth_points, M_mouth).reshape(-1, 2)
#             for i, idx in enumerate(mouth_indices):
#                 aligned_landmarks[idx] = (int(aligned_mouth[i][0]), int(aligned_mouth[i][1]))
#         except Exception as e:
#             print(f"⚠️ Mouth transformation error: {e}")
    
#     return aligned_landmarks

# # Process a frame (called from FastAPI `server.py`)
# # Process a frame (called from FastAPI `server.py`)
# def process_frame(frame, play_reference=False, frame_idx=0, fixed_alignment=False, M_jaw_fixed=None, M_mouth_fixed=None):
#     try:
#         print("📸 Processing frame...")  # Log frame received
#         frame_height, frame_width = frame.shape[:2]
#         rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
#         results = face_mesh.process(rgb_frame)

#         print("🧠 FaceMesh Processing Done")  # Log after face detection attempt

#         # Default response with no landmarks
#         landmarks_data = {
#             "landmarks": None,
#             "type": "none",
#             "indices": {
#                 "jaw": JAW_INDICES,
#                 "mouth": MOUTH_INDICES
#             }
#         }
        
#         # Check if we detected any face
#         if results.multi_face_landmarks:
#             print("✅ Detected face landmarks!")
#             face_landmarks = results.multi_face_landmarks[0]
#             user_landmarks = [(int(landmark.x * frame_width), int(landmark.y * frame_height)) 
#                             for landmark in face_landmarks.landmark]
            
#             # Playing reference mode
#             if play_reference:
#                 print("🎥 Playing reference mode...")
#                 # Get global reference landmarks
#                 global reference_landmarks_all_frames
                
#                 # First time setup - compute alignment
#                 if ((not fixed_alignment) or 
#                     (M_jaw_fixed is None) or 
#                     (M_mouth_fixed is None)) and frame_idx < len(reference_landmarks_all_frames):
#                     print("🔄 Computing alignment matrices...")
#                     # Extract face bounding box for better alignment
#                     face_points = np.array(user_landmarks)
#                     x_min, y_min = np.min(face_points, axis=0)
#                     x_max, y_max = np.max(face_points, axis=0)
#                     face_width = x_max - x_min
#                     face_height = y_max - y_min
                    
#                     # Compute transformation matrices with more accurate scaling
#                     M_jaw_fixed, M_mouth_fixed = compute_alignment_matrices(
#                         reference_landmarks_all_frames[0], user_landmarks
#                     )
#                     fixed_alignment = True
                    
#                 # Apply transformation to reference landmarks
#                 if frame_idx < len(reference_landmarks_all_frames):
#                     aligned_landmarks = apply_fixed_transformation(
#                         reference_landmarks_all_frames[frame_idx], M_jaw_fixed, M_mouth_fixed
#                     )
                    
#                     # Smooth for stability
#                     smoothed_landmarks = smooth_landmarks(aligned_landmarks)
                    
#                     # Trigger audio playback if this is the first frame
#                     if frame_idx == 0:
#                         play_audio()
                    
#                     # Return reference landmarks
#                     landmarks_data = {
#                         "landmarks": smoothed_landmarks,
#                         "type": "reference",
#                         "indices": {
#                             "jaw": JAW_INDICES,
#                             "mouth": MOUTH_INDICES
#                         }
#                     }
#                 else:
#                     # Reset for next time
#                     frame_idx = 0
#                     fixed_alignment = False
#             else:
#                 # Return user face landmarks
#                 landmarks_data = {
#                     "landmarks": user_landmarks,
#                     "type": "user",
#                     "indices": {
#                         "jaw": JAW_INDICES,
#                         "mouth": MOUTH_INDICES
#                     }
#                 }
                
#         print(f"📤 Final landmarks data: {landmarks_data}")  # Log output before returning
#         return landmarks_data, frame_idx, fixed_alignment, M_jaw_fixed, M_mouth_fixed
        
#     except Exception as e:
#         print(f"❌ Error in process_frame: {e}")
#         import traceback
#         traceback.print_exc()
#         return landmarks_data, frame_idx, fixed_alignment, M_jaw_fixed, M_mouth_fixed
        
        

#OLD WEBSOCKET CODE
# import cv2
# import mediapipe as mp
# import numpy as np
# import csv
# import threading
# import os
# import pygame
# from pydub import AudioSegment
# from typing import Tuple, Dict, List, Any
# import json


# # Initialize MediaPipe Face Mesh
# mp_face_mesh = mp.solutions.face_mesh
# face_mesh = mp_face_mesh.FaceMesh(static_image_mode=False, max_num_faces=1, refine_landmarks=True, min_detection_confidence=0.5)

# # # Drawing utilities
# # mp_drawing = mp.solutions.drawing_utils
# # drawing_spec = mp_drawing.DrawingSpec(thickness=1, circle_radius=1, color=(0, 255, 0))

# # Landmark smoothing
# SMOOTHING_WINDOW_SIZE = 2
# landmark_history = []

# # Jaw and mouth indices
# JAW_INDICES = [389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162]
# MOUTH_INDICES = [61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 308, 324, 318, 402, 317, 14, 87, 178, 88, 95, 78, 61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291, 308, 415, 310, 311, 312, 13, 82, 81, 80, 78, 191]

# # class FaceTracker:
# #     def __init__(self):
# #         self.mp_face_mesh = mp.solutions.face_mesh
# #         self.face_mesh = self.mp_face_mesh.FaceMesh(
# #             static_image_mode=False,
# #             max_num_faces=1,
# #             refine_landmarks=True,
# #             min_detection_confidence=0.5
# #         )
# #         self.landmark_history = []
# #         self.fixed_alignment = False
# #         self.frame_idx = 0
# #         self.M_jaw_fixed = None
# #         self.M_mouth_fixed = None
        
# #         # Load reference landmarks once
# #         self.reference_landmarks_all_frames = self.load_reference_landmarks()

# class AudioPlayer:
#     def __init__(self):
#         self.playing = False
#         pygame.mixer.init()
    
#     def play(self, audio_path):
#         try:
#             if not self.playing and os.path.exists(audio_path):
#                 self.playing = True
#                 pygame.mixer.music.load(audio_path)
#                 pygame.mixer.music.play()
#                 while pygame.mixer.music.get_busy():
#                     pygame.time.Clock().tick(10)
#                 pygame.mixer.music.unload()
#         finally:
#             self.playing = False

# audio_player = AudioPlayer()

# def play_audio():
#     if not audio_player.playing:
#         # Find audio file relative to this script
#         script_dir = os.path.dirname(os.path.abspath(__file__))
#         audio_path = os.path.join(script_dir, "carrot_audio.mp3")
        
#         if not os.path.exists(audio_path):
#             print(f"⚠️ Audio file not found at {audio_path}")
#             return
        
#         thread = threading.Thread(target=lambda: audio_player.play("carrot_audio.mp3"))
#         thread.daemon = True
#         thread.start()

# # Load reference landmarks
# def load_reference_video_landmarks(csv_path):
#     all_landmarks, current_frame, frame_landmarks = [], -1, []
#     with open(csv_path, newline='') as csvfile:
#         reader = csv.DictReader(csvfile)
#         for row in reader:
#             try:
#                 frame, x, y = int(row["Frame"]), int(row["X"]), int(row["Y"])
#                 if frame != current_frame:
#                     if frame_landmarks:
#                         all_landmarks.append(frame_landmarks)
#                     frame_landmarks = []
#                     current_frame = frame
#                 frame_landmarks.append((x, y))
#             except (ValueError, KeyError):
#                 continue
#         if frame_landmarks:
#             all_landmarks.append(frame_landmarks)
#     return all_landmarks

# # Smooth landmarks for stability
# def smooth_landmarks(current_landmarks):
#     global landmark_history
#     landmark_history.append(current_landmarks)
#     if len(landmark_history) > SMOOTHING_WINDOW_SIZE:
#         landmark_history.pop(0)
#     return np.mean(landmark_history, axis=0).astype(int).tolist()

# # Compute transformation matrices
# def compute_alignment_matrices(reference_landmarks, user_landmarks):
#     ref_jaw = np.float32([reference_landmarks[i] for i in JAW_INDICES])
#     user_jaw = np.float32([user_landmarks[i] for i in JAW_INDICES])
#     M_jaw, _ = cv2.estimateAffinePartial2D(ref_jaw, user_jaw)

#     ref_mouth = np.float32([reference_landmarks[i] for i in MOUTH_INDICES])
#     user_mouth = np.float32([user_landmarks[i] for i in MOUTH_INDICES])
#     M_mouth, _ = cv2.estimateAffinePartial2D(ref_mouth, user_mouth)

#     return M_jaw, M_mouth

# # Apply transformations to reference to scale it
# def apply_fixed_transformation(reference_landmarks, M_jaw, M_mouth):
#     aligned_landmarks = reference_landmarks.copy()

#     jaw_points = np.float32([reference_landmarks[i] for i in JAW_INDICES]).reshape(-1, 1, 2)
#     aligned_jaw = cv2.transform(jaw_points, M_jaw).reshape(-1, 2)
#     for i, idx in enumerate(JAW_INDICES):
#         aligned_landmarks[idx] = (int(aligned_jaw[i][0]), int(aligned_jaw[i][1]))

#     mouth_points = np.float32([reference_landmarks[i] for i in MOUTH_INDICES]).reshape(-1, 1, 2)
#     aligned_mouth = cv2.transform(mouth_points, M_mouth).reshape(-1, 2)
#     for i, idx in enumerate(MOUTH_INDICES):
#         aligned_landmarks[idx] = (int(aligned_mouth[i][0]), int(aligned_mouth[i][1]))

#     return aligned_landmarks

# # Process a frame (called from FastAPI `server.py`)
# def process_frame(frame, play_reference=False, frame_idx=0, fixed_alignment=False, M_jaw_fixed=None, M_mouth_fixed=None):
#     print("📸 Processing frame...")  # Debugging log
    
#     frame_height, frame_width = frame.shape[:2]
#     rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
#     results = face_mesh.process(rgb_frame)

#     if results.multi_face_landmarks:
#         print("✅ Detected face landmarks!")
#     else:
#         print("❌ No face detected!")
    
#     landmarks_data = {"landmarks": None, "type": "none"}
    
#     if results.multi_face_landmarks:
#         face_landmarks = results.multi_face_landmarks[0]
#         user_landmarks = [(int(landmark.x * frame_width), int(landmark.y * frame_height)) 
#                          for landmark in face_landmarks.landmark]
        
#         if play_reference:
#             if not fixed_alignment:
#                 print("🔄 Computing alignment matrices...")
#                 M_jaw_fixed, M_mouth_fixed = compute_alignment_matrices(
#                     reference_landmarks_all_frames[0], user_landmarks
#                 )
#                 fixed_alignment = True
                
#             if frame_idx < len(reference_landmarks_all_frames):
#                 aligned_landmarks = apply_fixed_transformation(
#                     reference_landmarks_all_frames[frame_idx], M_jaw_fixed, M_mouth_fixed
#                 )
#                 smoothed_landmarks = smooth_landmarks(aligned_landmarks)
#                 landmarks_data = {
#                     "landmarks": smoothed_landmarks,
#                     "type": "reference",
#                     "indices": {
#                         "jaw": JAW_INDICES,
#                         "mouth": MOUTH_INDICES
#                     }
#                 }
#             else:
#                 frame_idx = 0
#                 fixed_alignment = False
#         else:
#             landmarks_data = {
#                 "landmarks": user_landmarks,
#                 "type": "user",
#                 "indices": {
#                     "jaw": JAW_INDICES,
#                     "mouth": MOUTH_INDICES
#                 }
#             }
    
#     return landmarks_data, frame_idx, fixed_alignment, M_jaw_fixed, M_mouth_fixed

# def cleanup():
#     pygame.mixer.quit()
#     try:
#         wav_path = os.path.splitext("carrot_audio.mp3")[0] + '.wav'
#         if os.path.exists(wav_path):
#             os.remove(wav_path)
#     except:
#         pass

# # Load reference landmarks at module level
# reference_landmarks_all_frames = []


#OLD CODE 
# import cv2
# import mediapipe as mp
# import numpy as np
# import csv
# import os
# import wave
# import pygame
# from pydub import AudioSegment
# import threading
# import subprocess

# # Initialize MediaPipe Face Mesh
# mp_face_mesh = mp.solutions.face_mesh
# face_mesh = mp_face_mesh.FaceMesh(static_image_mode=False, max_num_faces=1, refine_landmarks=True, min_detection_confidence=0.5)

# # Initialize drawing utilities
# mp_drawing = mp.solutions.drawing_utils
# drawing_spec = mp_drawing.DrawingSpec(thickness=1, circle_radius=1, color=(0, 255, 0))

# # Initialize a history buffer for smoothing
# SMOOTHING_WINDOW_SIZE = 2  # Number of frames to average over
# landmark_history = []

# # State to control whether reference video is played
# play_reference_landmarks = False

# # Audio playback class
# class AudioPlayer:
#     def __init__(self):
#         self.playing = False
#         self.audio = None
#         pygame.mixer.init()
    
#     def load_audio(self, audio_path):
#         """Load the audio file if it exists"""
#         if os.path.exists(audio_path):
#             try:
#                 # Convert mp3 to wav in memory
#                 audio = AudioSegment.from_mp3(audio_path)
                
#                 # Save as wav in the same directory as the script
#                 wav_path = os.path.splitext(audio_path)[0] + '.wav'
#                 audio.export(wav_path, format='wav')
                
#                 return wav_path
#             except Exception as e:
#                 print(f"Error loading audio: {e}")
#                 return None
#         else:
#             print(f"Audio file not found: {audio_path}")
#             return None

#     def play(self, audio_path):
#         """Play the audio file"""
#         try:
#             if not self.playing:
#                 self.playing = True
#                 wav_path = self.load_audio(audio_path)
#                 if wav_path:
#                     pygame.mixer.music.load(wav_path)
#                     pygame.mixer.music.play()
                    
#                     # Wait for playback to finish
#                     while pygame.mixer.music.get_busy():
#                         pygame.time.Clock().tick(10)
                    
#                     # Cleanup
#                     pygame.mixer.music.unload()
#                     try:
#                         os.remove(wav_path)
#                     except:
#                         pass
#         except Exception as e:
#             print(f"Error during playback: {e}")
#         finally:
#             self.playing = False

# # Create a global audio player instance
# audio_player = AudioPlayer()

# def play_audio():
#     """Thread-safe audio playback function"""
#     if not audio_player.playing:
#         thread = threading.Thread(target=lambda: audio_player.play("carrot_audio.mp3"))
#         thread.daemon = True
#         thread.start()


# def smooth_landmarks(current_landmarks):
#     global landmark_history

#     # Add current landmarks to history
#     landmark_history.append(current_landmarks)

#     # Keep only the last SMOOTHING_WINDOW_SIZE frames
#     if len(landmark_history) > SMOOTHING_WINDOW_SIZE:
#         landmark_history.pop(0)

#     # Compute the average landmarks
#     smoothed_landmarks = np.mean(landmark_history, axis=0).astype(int)
#     return smoothed_landmarks.tolist()

# def load_reference_video_landmarks(csv_path):
#     all_landmarks = []
#     current_frame = -1
#     frame_landmarks = []

#     with open(csv_path, newline='') as csvfile:
#         reader = csv.DictReader(csvfile)  # Read as a dictionary for column-based access
#         for row in reader:
#             try:
#                 frame = int(row["Frame"])
#                 x = int(row["X"])
#                 y = int(row["Y"])

#                 # If a new frame is encountered, save the current frame's landmarks
#                 if frame != current_frame:
#                     if frame_landmarks:
#                         all_landmarks.append(frame_landmarks)
#                     frame_landmarks = []  # Reset for the new frame
#                     current_frame = frame

#                 frame_landmarks.append((x, y))
#             except (ValueError, KeyError):
#                 continue  # Skip invalid rows

#         # Append the last frame's landmarks
#         if frame_landmarks:
#             all_landmarks.append(frame_landmarks)

#     return all_landmarks

# def extract_audio(video_path, audio_path):
#     try:
#         if not os.path.exists(video_path):
#             raise FileNotFoundError(f"Input video file not found: {video_path}")
            
#         possible_ffmpeg_paths = [
#             "C:\\ffmpeg\\bin\\ffmpeg.exe",
#             "ffmpeg",
#             "C:\\Program Files\\ffmpeg\\bin\\ffmpeg.exe",
#         ]
        
#         ffmpeg_path = None
#         for path in possible_ffmpeg_paths:
#             try:
#                 subprocess.run([path, "-version"], capture_output=True)
#                 ffmpeg_path = path
#                 break
#             except (subprocess.SubprocessError, FileNotFoundError):
#                 continue
                
#         if ffmpeg_path is None:
#             raise RuntimeError("FFmpeg not found. Please install FFmpeg and add it to PATH")
            
#         command = [
#             ffmpeg_path,
#             "-i", video_path,
#             "-q:a", "0",
#             "-map", "a",
#             "-y",
#             audio_path
#         ]
        
#         result = subprocess.run(command, capture_output=True, text=True)
#         if result.returncode != 0:
#             raise RuntimeError(f"FFmpeg error: {result.stderr}")
            
#     except Exception as e:
#         print(f"Error extracting audio: {str(e)}")
#         return False
        
#     return True


# #reference video alignment and play
# def compute_alignment_matrices(reference_landmarks, user_landmarks):
#     JAW_INDICES = [389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162]
#     MOUTH_INDICES = [61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 308, 324, 318, 402, 317, 14, 87, 178, 88, 95, 78, 61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291,
#                      308, 415, 310, 311, 312, 13, 82, 81, 80, 78, 191]

#     ref_jaw_points = np.float32([reference_landmarks[i] for i in JAW_INDICES])
#     user_jaw_points = np.float32([user_landmarks[i] for i in JAW_INDICES])
#     M_jaw, _ = cv2.estimateAffinePartial2D(ref_jaw_points, user_jaw_points)

#     ref_mouth_points = np.float32([reference_landmarks[i] for i in MOUTH_INDICES])
#     user_mouth_points = np.float32([user_landmarks[i] for i in MOUTH_INDICES])
#     M_mouth, _ = cv2.estimateAffinePartial2D(ref_mouth_points, user_mouth_points)

#     return M_jaw, M_mouth

# def apply_fixed_transformation(reference_landmarks, M_jaw, M_mouth):
#     JAW_INDICES = [389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162]
#     MOUTH_INDICES = [61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 308, 324, 318, 402, 317, 14, 87, 178, 88, 95, 78, 61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291,
#                      308, 415, 310, 311, 312, 13, 82, 81, 80, 78, 191]

#     aligned_landmarks = reference_landmarks.copy()

#     # Transform jaw landmarks
#     ref_jaw_landmarks_np = np.float32([reference_landmarks[i] for i in JAW_INDICES]).reshape(-1, 1, 2)
#     aligned_jaw_landmarks_np = cv2.transform(ref_jaw_landmarks_np, M_jaw).reshape(-1, 2)
#     for i, idx in enumerate(JAW_INDICES):
#         aligned_landmarks[idx] = (int(aligned_jaw_landmarks_np[i][0]), int(aligned_jaw_landmarks_np[i][1]))

#     # Transform mouth landmarks
#     ref_mouth_landmarks_np = np.float32([reference_landmarks[i] for i in MOUTH_INDICES]).reshape(-1, 1, 2)
#     aligned_mouth_landmarks_np = cv2.transform(ref_mouth_landmarks_np, M_mouth).reshape(-1, 2)
#     for i, idx in enumerate(MOUTH_INDICES):
#         aligned_landmarks[idx] = (int(aligned_mouth_landmarks_np[i][0]), int(aligned_mouth_landmarks_np[i][1]))

#     return aligned_landmarks

# def draw_landmarks(image, landmarks, indices, color=(255, 255, 255), thickness=2):
#     for i in range(1, len(indices)):
#         pt1 = landmarks[indices[i - 1]]
#         pt2 = landmarks[indices[i]]
#         cv2.line(image, pt1, pt2, color, thickness)

# # Load reference video landmarks
# reference_landmarks_all_frames = load_reference_video_landmarks("reference_landmarks.csv")

# def cleanup():
#     """Cleanup function to be called when the program exits"""
#     pygame.mixer.quit()
#     try:
#         wav_path = os.path.splitext("carrot_audio.mp3")[0] + '.wav'
#         if os.path.exists(wav_path):
#             os.remove(wav_path)
#     except:
#         pass

# # Extract audio from the reference video
#     has_audio = extract_audio("carrot.mp4", "carrot_audio.mp3")
#     if not has_audio:
#         print("Warning: Audio extraction failed")

# # Process the target video
# cap = cv2.VideoCapture(0)  # Use 0 for webcam or replace with video file path
# if not cap.isOpened():
#     print("Error: Could not open video source.")
#     exit()

# frame_width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
# frame_height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
# fps = int(cap.get(cv2.CAP_PROP_FPS))

# print(f"Frame dimensions: {frame_width}x{frame_height}")
# print(f"FPS: {fps}")

# # output_video_path = "mediapipe_output.avi"
# # fourcc = cv2.VideoWriter_fourcc(*'XVID')
# # out = cv2.VideoWriter(output_video_path, fourcc, fps, (frame_width, frame_height))

# # if not out.isOpened():
# #     print(f"Error: Could not open video writer at {output_video_path}.")
# #     print(f"Check if the directory exists and is writable.")
# #     cap.release()
# #     exit()

# JAW_INDICES = [389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162]
# MOUTH_INDICES = [61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 308, 324, 318, 402, 317, 14, 87, 178, 88, 95, 78, 61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291,
#                   308, 415, 310, 311, 312, 13, 82, 81, 80, 78, 191  ]

# # Add these global variables to store the fixed transformation matrices
# fixed_alignment = False
# M_jaw_fixed = None
# M_mouth_fixed = None

# try:
   
#     frame_idx = 0
#     while cap.isOpened():
#         ret, frame = cap.read()
#         if not ret:
#             print("Finished processing video.")
#             break

#         rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
#         results = face_mesh.process(rgb_frame)

#         if results.multi_face_landmarks:
#             for face_landmarks in results.multi_face_landmarks:
#                 user_landmarks = []
#                 for idx, landmark in enumerate(face_landmarks.landmark):
#                     x = int(landmark.x * frame_width)
#                     y = int(landmark.y * frame_height)
#                     user_landmarks.append((x, y))

#                 if play_reference_landmarks:
#                     # If fixed_alignment is False, compute transformation matrices once
#                     if not fixed_alignment:
#                         M_jaw_fixed, M_mouth_fixed = compute_alignment_matrices(
#                             reference_landmarks_all_frames[0], user_landmarks
#                         )
#                         fixed_alignment = True  # Lock the transformation matrices

#                     # Apply the fixed transformation to reference landmarks
#                     if frame_idx < len(reference_landmarks_all_frames):
#                         aligned_landmarks = apply_fixed_transformation(
#                             reference_landmarks_all_frames[frame_idx], M_jaw_fixed, M_mouth_fixed
#                         )
#                     else:
#                         # Reset playback state after the reference video ends
#                         play_reference_landmarks = False
#                         fixed_alignment = False
#                         frame_idx = 0
#                         continue  # Skip drawing and continue to real-time following
                    
#                     smoothed_landmarks = smooth_landmarks(aligned_landmarks)
#                     draw_landmarks(frame, smoothed_landmarks, MOUTH_INDICES, color=(255, 255, 255), thickness=2)
#                     draw_landmarks(frame, smoothed_landmarks, JAW_INDICES, color=(255, 255, 255), thickness=2)


#                 else:
#                     # Real-time alignment with user's face
#                     draw_landmarks(frame, user_landmarks, MOUTH_INDICES, color=(255, 255, 255), thickness=2)
#                     draw_landmarks(frame, user_landmarks, JAW_INDICES, color=(255, 255, 255), thickness=2)

#         #out.write(frame)
#         cv2.imshow("MediaPipe Face Mesh", frame)

#         # Button simulation: Press 'p' to start reference landmarks playback
#         if cv2.waitKey(1) & 0xFF == ord('p'):
#             play_reference_landmarks = True  # Start playback
#             frame_idx = 0  # Reset reference frame counter
#             fixed_alignment = False  # Allow re-alignment only once
#             play_audio()


#         if cv2.waitKey(1) & 0xFF == 27:  # Exit on 'ESC'
#             print("Exiting...")
#             break

#         frame_idx += 1

# except Exception as e:
#     print(f"An error occurred: {e}")

# finally:
#     cleanup()
#     cap.release()
#     #out.release()
#     cv2.destroyAllWindows()
#     print("Released video capture and writer.")