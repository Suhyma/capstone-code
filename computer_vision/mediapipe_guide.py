import cv2
import mediapipe as mp
import numpy as np
import csv
import os
import wave
import pygame
from pydub import AudioSegment
import threading
import subprocess

# Initialize MediaPipe Face Mesh
mp_face_mesh = mp.solutions.face_mesh
face_mesh = mp_face_mesh.FaceMesh(static_image_mode=False, max_num_faces=1, refine_landmarks=True, min_detection_confidence=0.5)

# Initialize drawing utilities
mp_drawing = mp.solutions.drawing_utils
drawing_spec = mp_drawing.DrawingSpec(thickness=1, circle_radius=1, color=(0, 255, 0))

# Initialize a history buffer for smoothing
SMOOTHING_WINDOW_SIZE = 2  # Number of frames to average over
landmark_history = []

# State to control whether reference video is played
play_reference_landmarks = False

# Audio playback class
class AudioPlayer:
    def __init__(self):
        self.playing = False
        self.audio = None
        pygame.mixer.init()
    
    def load_audio(self, audio_path):
        """Load the audio file if it exists"""
        if os.path.exists(audio_path):
            try:
                # Convert mp3 to wav in memory
                audio = AudioSegment.from_mp3(audio_path)
                
                # Save as wav in the same directory as the script
                wav_path = os.path.splitext(audio_path)[0] + '.wav'
                audio.export(wav_path, format='wav')
                
                return wav_path
            except Exception as e:
                print(f"Error loading audio: {e}")
                return None
        else:
            print(f"Audio file not found: {audio_path}")
            return None

    def play(self, audio_path):
        """Play the audio file"""
        try:
            if not self.playing:
                self.playing = True
                wav_path = self.load_audio(audio_path)
                if wav_path:
                    pygame.mixer.music.load(wav_path)
                    pygame.mixer.music.play()
                    
                    # Wait for playback to finish
                    while pygame.mixer.music.get_busy():
                        pygame.time.Clock().tick(10)
                    
                    # Cleanup
                    pygame.mixer.music.unload()
                    try:
                        os.remove(wav_path)
                    except:
                        pass
        except Exception as e:
            print(f"Error during playback: {e}")
        finally:
            self.playing = False

# Create a global audio player instance
audio_player = AudioPlayer()

def play_audio():
    """Thread-safe audio playback function"""
    if not audio_player.playing:
        thread = threading.Thread(target=lambda: audio_player.play("carrot_audio.mp3"))
        thread.daemon = True
        thread.start()


def smooth_landmarks(current_landmarks):
    global landmark_history

    # Add current landmarks to history
    landmark_history.append(current_landmarks)

    # Keep only the last SMOOTHING_WINDOW_SIZE frames
    if len(landmark_history) > SMOOTHING_WINDOW_SIZE:
        landmark_history.pop(0)

    # Compute the average landmarks
    smoothed_landmarks = np.mean(landmark_history, axis=0).astype(int)
    return smoothed_landmarks.tolist()

def load_reference_video_landmarks(csv_path):
    all_landmarks = []
    current_frame = -1
    frame_landmarks = []

    with open(csv_path, newline='') as csvfile:
        reader = csv.DictReader(csvfile)  # Read as a dictionary for column-based access
        for row in reader:
            try:
                frame = int(row["Frame"])
                x = int(row["X"])
                y = int(row["Y"])

                # If a new frame is encountered, save the current frame's landmarks
                if frame != current_frame:
                    if frame_landmarks:
                        all_landmarks.append(frame_landmarks)
                    frame_landmarks = []  # Reset for the new frame
                    current_frame = frame

                frame_landmarks.append((x, y))
            except (ValueError, KeyError):
                continue  # Skip invalid rows

        # Append the last frame's landmarks
        if frame_landmarks:
            all_landmarks.append(frame_landmarks)

    return all_landmarks

def extract_audio(video_path, audio_path):
    try:
        if not os.path.exists(video_path):
            raise FileNotFoundError(f"Input video file not found: {video_path}")
            
        possible_ffmpeg_paths = [
            "C:\\ffmpeg\\bin\\ffmpeg.exe",
            "ffmpeg",
            "C:\\Program Files\\ffmpeg\\bin\\ffmpeg.exe",
        ]
        
        ffmpeg_path = None
        for path in possible_ffmpeg_paths:
            try:
                subprocess.run([path, "-version"], capture_output=True)
                ffmpeg_path = path
                break
            except (subprocess.SubprocessError, FileNotFoundError):
                continue
                
        if ffmpeg_path is None:
            raise RuntimeError("FFmpeg not found. Please install FFmpeg and add it to PATH")
            
        command = [
            ffmpeg_path,
            "-i", video_path,
            "-q:a", "0",
            "-map", "a",
            "-y",
            audio_path
        ]
        
        result = subprocess.run(command, capture_output=True, text=True)
        if result.returncode != 0:
            raise RuntimeError(f"FFmpeg error: {result.stderr}")
            
    except Exception as e:
        print(f"Error extracting audio: {str(e)}")
        return False
        
    return True

#real time alignment
def align_reference_landmarks(reference_landmarks, user_landmarks):
    JAW_INDICES = [389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162]
    MOUTH_INDICES = [61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 308, 324, 318, 402, 317, 14, 87, 178, 88, 95, 78, 61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291,
                  308, 415, 310, 311, 312, 13, 82, 81, 80, 78, 191]

    # Step 1: Scale jaw landmarks
    ref_jaw_points = np.float32([reference_landmarks[i] for i in JAW_INDICES])
    user_jaw_points = np.float32([user_landmarks[i] for i in JAW_INDICES])

    M_jaw, _ = cv2.estimateAffinePartial2D(ref_jaw_points, user_jaw_points)

    ref_jaw_landmarks_np = np.float32([reference_landmarks[i] for i in JAW_INDICES]).reshape(-1, 1, 2)
    aligned_jaw_landmarks_np = cv2.transform(ref_jaw_landmarks_np, M_jaw).reshape(-1, 2)
    aligned_jaw_landmarks = [(int(x), int(y)) for x, y in aligned_jaw_landmarks_np]

    # Step 2: Scale mouth landmarks
    ref_mouth_points = np.float32([reference_landmarks[i] for i in MOUTH_INDICES])
    user_mouth_points = np.float32([user_landmarks[i] for i in MOUTH_INDICES])

    M_mouth, _ = cv2.estimateAffinePartial2D(ref_mouth_points, user_mouth_points)

    ref_mouth_landmarks_np = np.float32([reference_landmarks[i] for i in MOUTH_INDICES]).reshape(-1, 1, 2)
    aligned_mouth_landmarks_np = cv2.transform(ref_mouth_landmarks_np, M_mouth).reshape(-1, 2)
    aligned_mouth_landmarks = [(int(x), int(y)) for x, y in aligned_mouth_landmarks_np]

    # Step 3: Combine jaw and mouth landmarks
    aligned_landmarks = reference_landmarks.copy()
    for i, idx in enumerate(JAW_INDICES):
        aligned_landmarks[idx] = aligned_jaw_landmarks[i]
    for i, idx in enumerate(MOUTH_INDICES):
        aligned_landmarks[idx] = aligned_mouth_landmarks[i]

    return aligned_landmarks

#reference video alignment and play
def compute_alignment_matrices(reference_landmarks, user_landmarks):
    JAW_INDICES = [389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162]
    MOUTH_INDICES = [61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 308, 324, 318, 402, 317, 14, 87, 178, 88, 95, 78, 61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291,
                     308, 415, 310, 311, 312, 13, 82, 81, 80, 78, 191]

    ref_jaw_points = np.float32([reference_landmarks[i] for i in JAW_INDICES])
    user_jaw_points = np.float32([user_landmarks[i] for i in JAW_INDICES])
    M_jaw, _ = cv2.estimateAffinePartial2D(ref_jaw_points, user_jaw_points)

    ref_mouth_points = np.float32([reference_landmarks[i] for i in MOUTH_INDICES])
    user_mouth_points = np.float32([user_landmarks[i] for i in MOUTH_INDICES])
    M_mouth, _ = cv2.estimateAffinePartial2D(ref_mouth_points, user_mouth_points)

    return M_jaw, M_mouth

def apply_fixed_transformation(reference_landmarks, M_jaw, M_mouth):
    JAW_INDICES = [389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162]
    MOUTH_INDICES = [61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 308, 324, 318, 402, 317, 14, 87, 178, 88, 95, 78, 61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291,
                     308, 415, 310, 311, 312, 13, 82, 81, 80, 78, 191]

    aligned_landmarks = reference_landmarks.copy()

    # Transform jaw landmarks
    ref_jaw_landmarks_np = np.float32([reference_landmarks[i] for i in JAW_INDICES]).reshape(-1, 1, 2)
    aligned_jaw_landmarks_np = cv2.transform(ref_jaw_landmarks_np, M_jaw).reshape(-1, 2)
    for i, idx in enumerate(JAW_INDICES):
        aligned_landmarks[idx] = (int(aligned_jaw_landmarks_np[i][0]), int(aligned_jaw_landmarks_np[i][1]))

    # Transform mouth landmarks
    ref_mouth_landmarks_np = np.float32([reference_landmarks[i] for i in MOUTH_INDICES]).reshape(-1, 1, 2)
    aligned_mouth_landmarks_np = cv2.transform(ref_mouth_landmarks_np, M_mouth).reshape(-1, 2)
    for i, idx in enumerate(MOUTH_INDICES):
        aligned_landmarks[idx] = (int(aligned_mouth_landmarks_np[i][0]), int(aligned_mouth_landmarks_np[i][1]))

    return aligned_landmarks

def draw_landmarks(image, landmarks, indices, color=(255, 255, 255), thickness=2):
    for i in range(1, len(indices)):
        pt1 = landmarks[indices[i - 1]]
        pt2 = landmarks[indices[i]]
        cv2.line(image, pt1, pt2, color, thickness)

# Load reference video landmarks
reference_landmarks_all_frames = load_reference_video_landmarks("reference_landmarks.csv")

def cleanup():
    """Cleanup function to be called when the program exits"""
    pygame.mixer.quit()
    try:
        wav_path = os.path.splitext("carrot_audio.mp3")[0] + '.wav'
        if os.path.exists(wav_path):
            os.remove(wav_path)
    except:
        pass

# Extract audio from the reference video
    has_audio = extract_audio("carrot.mp4", "carrot_audio.mp3")
    if not has_audio:
        print("Warning: Audio extraction failed")

# Process the target video
cap = cv2.VideoCapture(0)  # Use 0 for webcam or replace with video file path
if not cap.isOpened():
    print("Error: Could not open video source.")
    exit()

frame_width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
frame_height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
fps = int(cap.get(cv2.CAP_PROP_FPS))

print(f"Frame dimensions: {frame_width}x{frame_height}")
print(f"FPS: {fps}")

output_video_path = "mediapipe_output.avi"
fourcc = cv2.VideoWriter_fourcc(*'XVID')
out = cv2.VideoWriter(output_video_path, fourcc, fps, (frame_width, frame_height))

if not out.isOpened():
    print(f"Error: Could not open video writer at {output_video_path}.")
    print(f"Check if the directory exists and is writable.")
    cap.release()
    exit()

JAW_INDICES = [389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162]
MOUTH_INDICES = [61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 308, 324, 318, 402, 317, 14, 87, 178, 88, 95, 78, 61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291,
                  308, 415, 310, 311, 312, 13, 82, 81, 80, 78, 191  ]

# Add these global variables to store the fixed transformation matrices
fixed_alignment = False
M_jaw_fixed = None
M_mouth_fixed = None

try:
   
    frame_idx = 0
    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            print("Finished processing video.")
            break

        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = face_mesh.process(rgb_frame)

        if results.multi_face_landmarks:
            for face_landmarks in results.multi_face_landmarks:
                user_landmarks = []
                for idx, landmark in enumerate(face_landmarks.landmark):
                    x = int(landmark.x * frame_width)
                    y = int(landmark.y * frame_height)
                    user_landmarks.append((x, y))

                if play_reference_landmarks:
                    # If fixed_alignment is False, compute transformation matrices once
                    if not fixed_alignment:
                        M_jaw_fixed, M_mouth_fixed = compute_alignment_matrices(
                            reference_landmarks_all_frames[0], user_landmarks
                        )
                        fixed_alignment = True  # Lock the transformation matrices

                    # Apply the fixed transformation to reference landmarks
                    if frame_idx < len(reference_landmarks_all_frames):
                        aligned_landmarks = apply_fixed_transformation(
                            reference_landmarks_all_frames[frame_idx], M_jaw_fixed, M_mouth_fixed
                        )
                    else:
                        # Reset playback state after the reference video ends
                        play_reference_landmarks = False
                        fixed_alignment = False
                        frame_idx = 0
                        continue  # Skip drawing and continue to real-time following

                else:
                    # Real-time alignment with user's face
                    aligned_landmarks = align_reference_landmarks(reference_landmarks_all_frames[0], user_landmarks)

                smoothed_landmarks = smooth_landmarks(aligned_landmarks)
                draw_landmarks(frame, smoothed_landmarks, MOUTH_INDICES, color=(255, 255, 255), thickness=2)
                draw_landmarks(frame, smoothed_landmarks, JAW_INDICES, color=(255, 255, 255), thickness=2)

        out.write(frame)
        cv2.imshow("MediaPipe Face Mesh", frame)

        # Button simulation: Press 'p' to start reference landmarks playback
        if cv2.waitKey(1) & 0xFF == ord('p'):
            play_reference_landmarks = True  # Start playback
            frame_idx = 0  # Reset reference frame counter
            fixed_alignment = False  # Allow re-alignment only once
            play_audio()


        if cv2.waitKey(1) & 0xFF == 27:  # Exit on 'ESC'
            print("Exiting...")
            break

        frame_idx += 1

except Exception as e:
    print(f"An error occurred: {e}")

finally:
    cleanup()
    cap.release()
    out.release()
    cv2.destroyAllWindows()
    print("Released video capture and writer.")