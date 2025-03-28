import cv2
import mediapipe as mp
import numpy as np
import csv
import threading
import os
import pygame
from typing import Tuple, Dict, List, Any
import json

# Initialize MediaPipe Face Mesh
mp_face_mesh = mp.solutions.face_mesh
face_mesh = mp_face_mesh.FaceMesh(static_image_mode=False, max_num_faces=1, refine_landmarks=True, min_detection_confidence=0.5)

# Landmark smoothing
SMOOTHING_WINDOW_SIZE = 2
landmark_history = []

# Jaw and mouth indices
JAW_INDICES = [389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162]
MOUTH_INDICES = [61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 308, 324, 318, 402, 317, 14, 87, 178, 88, 95, 78, 61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291, 308, 415, 310, 311, 312, 13, 82, 81, 80, 78, 191]
reference_landmarks_all_frames = []
fixed_alignment = False
M_jaw_fixed = None
M_mouth_fixed = None

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
    global reference_landmarks_all_frames  # Declare the global variable
    all_landmarks = []
    current_frame = -1
    frame_landmarks = []
    
    try:
        with open(csv_path, newline='') as csvfile:
            reader = csv.DictReader(csvfile)
            for row in reader:
                try:
                    frame = int(row["Frame"])
                    x = int(row["X"])
                    y = int(row["Y"])
                    
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
        reference_landmarks_all_frames = all_landmarks  # Update the global variable
        return all_landmarks
    except Exception as e:
        print(f"❌ Failed to load landmarks: {e}")
        return []

# Smooth landmarks for stability
def smooth_landmarks(current_landmarks):
    global landmark_history
    
    # Convert to numpy for calculations
    current_np = np.array(current_landmarks)
    
    # Add to history
    landmark_history.append(current_np)
    
    # Keep history within window size
    if len(landmark_history) > SMOOTHING_WINDOW_SIZE:
        landmark_history.pop(0)
    
    # Compute average over history
    if len(landmark_history) > 0:
        smoothed = np.mean(landmark_history, axis=0).astype(int)
        return smoothed.tolist()
    else:
        return current_landmarks

# Modify in process_frame.py

def compute_alignment_matrices(reference_landmarks, user_landmarks):
   
    JAW_INDICES = [389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162]
    MOUTH_INDICES = [61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 308, 324, 318, 402, 317, 14, 87, 178, 88, 95, 78, 61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291, 308, 415, 310, 311, 312, 13, 82, 81, 80, 78, 191]

    # Validate input landmarks
    if len(reference_landmarks) < max(max(JAW_INDICES), max(MOUTH_INDICES)):
        print("⚠️ Insufficient reference landmarks")
        return np.eye(2, 3), np.eye(2, 3)

    # Check sufficient points for computation
    ref_jaw = np.float32([reference_landmarks[i] for i in JAW_INDICES if i < len(reference_landmarks)])
    user_jaw = np.float32([user_landmarks[i] for i in JAW_INDICES if i < len(user_landmarks)])
    
    ref_mouth = np.float32([reference_landmarks[i] for i in MOUTH_INDICES if i < len(reference_landmarks)])
    user_mouth = np.float32([user_landmarks[i] for i in MOUTH_INDICES if i < len(user_landmarks)])

    if len(ref_jaw) < 3 or len(user_jaw) < 3 or len(ref_mouth) < 3 or len(user_mouth) < 3:
        print("⚠️ Not enough landmarks for alignment")
        return np.eye(2, 3), np.eye(2, 3)

    # Compute rigid transformations with LMEDS method for robustness
    M_jaw, _ = cv2.estimateAffinePartial2D(ref_jaw, user_jaw, method=cv2.LMEDS)
    M_mouth, _ = cv2.estimateAffinePartial2D(ref_mouth, user_mouth, method=cv2.LMEDS)

    # Fallback if transformation fails
    if M_jaw is None:
        M_jaw = np.eye(2, 3)
    if M_mouth is None:
        M_mouth = np.eye(2, 3)

    return M_jaw, M_mouth

# Modify the apply_fixed_transformation function to use a simpler approach
def apply_fixed_transformation(reference_landmarks, M_jaw, M_mouth):
    
    JAW_INDICES = [389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162]
    MOUTH_INDICES = [61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 308, 324, 318, 402, 317, 14, 87, 178, 88, 95, 78, 61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291, 308, 415, 310, 311, 312, 13, 82, 81, 80, 78, 191]

    # Create a copy of reference landmarks to avoid modifying original
    aligned_landmarks = reference_landmarks.copy()

    # Prepare landmark sets for transformation
    jaw_ref = np.float32([reference_landmarks[i] for i in JAW_INDICES]).reshape(-1, 1, 2)
    mouth_ref = np.float32([reference_landmarks[i] for i in MOUTH_INDICES]).reshape(-1, 1, 2)

    # Apply transformations
    jaw_transformed = cv2.transform(jaw_ref, M_jaw).reshape(-1, 2)
    mouth_transformed = cv2.transform(mouth_ref, M_mouth).reshape(-1, 2)

    # Update landmarks with transformed coordinates
    for i, idx in enumerate(JAW_INDICES):
        aligned_landmarks[idx] = (int(jaw_transformed[i][0]), int(jaw_transformed[i][1]))
    
    for i, idx in enumerate(MOUTH_INDICES):
        aligned_landmarks[idx] = (int(mouth_transformed[i][0]), int(mouth_transformed[i][1]))

    return aligned_landmarks

# Align landmarks to the center of the screen
def center_landmarks(aligned_landmarks, frame_width, frame_height):
    ref_np = np.array(aligned_landmarks, dtype=np.float32)
    ref_center = np.mean(ref_np, axis=0)

    translation = np.array([frame_width / 2, frame_height / 2]) - ref_center
    centered_landmarks = (ref_np + translation).astype(int).tolist()

    return centered_landmarks

# Process a frame (called from FastAPI `server.py`)
def process_frame(frame, reference_landmarks=None, play_reference=False, frame_idx=0, fixed_alignment=False, M_jaw_fixed=None, M_mouth_fixed=None, single_frame=False):
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
            },
            "bounds": {
                "minX": 0,
                "maxX": frame_width,
                "minY": 0,
                "maxY": frame_height
            }
        }
        
        # Check if we detected any face
        if results.multi_face_landmarks:
            print("✅ Detected face landmarks!")
            user_landmarks = []
            for face_landmarks in results.multi_face_landmarks[0].landmark:
                x = int(face_landmarks.x * frame_width)
                y = int(face_landmarks.y * frame_height)
                user_landmarks.append((x, y))
            
            # Determine which reference landmarks to use
            if reference_landmarks is None:
                # Use global reference landmarks if not provided
                global reference_landmarks_all_frames
                if len(reference_landmarks_all_frames) == 0:
                    print("⚠️ No reference landmarks available")
                    return landmarks_data, frame_idx, fixed_alignment, M_jaw_fixed, M_mouth_fixed
                
                ref_landmarks = reference_landmarks_all_frames
            else:
                ref_landmarks = reference_landmarks
            
            # Always use reference landmarks, never user landmarks
            # For CV on but play_reference off, use the first frame
            current_frame_idx = frame_idx if play_reference else 0
            
            if current_frame_idx >= len(ref_landmarks):
                print(f"⚠️ Frame index {current_frame_idx} out of bounds for reference landmarks")
                current_frame_idx = 0
            
            current_reference = ref_landmarks[current_frame_idx]
            
            # If we don't have fixed alignment yet, compute it now
            if not fixed_alignment or M_jaw_fixed is None or M_mouth_fixed is None:
                print("🔍 Computing initial alignment matrices...")
                M_jaw_fixed, M_mouth_fixed = compute_alignment_matrices(current_reference, user_landmarks)
                fixed_alignment = True

            # Apply transformation to reference landmarks
            aligned_landmarks = apply_fixed_transformation(
                current_reference, M_jaw_fixed, M_mouth_fixed
            )

            # aligned_landmarks = center_landmarks(aligned_landmarks, frame_width, frame_height)
            
            # Calculate bounds for better centering
            landmark_points = np.array(aligned_landmarks)
            min_x, min_y = np.min(landmark_points, axis=0)
            max_x, max_y = np.max(landmark_points, axis=0)
            
            # Smooth for stability
            smoothed_landmarks = smooth_landmarks(aligned_landmarks)
            
            # Return reference landmarks
            landmarks_data = {
                "landmarks": smoothed_landmarks,
                "type": "reference",  # Always mark as reference
                "indices": {
                    "jaw": JAW_INDICES,
                    "mouth": MOUTH_INDICES
                },
                "bounds": {
                    "minX": int(min_x),
                    "maxX": int(max_x),
                    "minY": int(min_y),
                    "maxY": int(max_y)
                }
            }
            
            # Trigger audio playback if this is the first frame of playback
            # if play_reference and frame_idx == 0:
                # play_audio()
        
        print(f"📤 Final landmarks data: {landmarks_data}")
        return landmarks_data, frame_idx, fixed_alignment, M_jaw_fixed, M_mouth_fixed
        
    except Exception as e:
        print(f"❌ Error in process_frame: {e}")
        import traceback
        traceback.print_exc()
        return landmarks_data, frame_idx, fixed_alignment, M_jaw_fixed, M_mouth_fixed