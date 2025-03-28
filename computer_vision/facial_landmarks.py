import cv2
import mediapipe as mp
import csv
import sys
from pathlib import Path

# Initialize MediaPipe Face Mesh
mp_face_mesh = mp.solutions.face_mesh
face_mesh = mp_face_mesh.FaceMesh(static_image_mode=False, max_num_faces=1, refine_landmarks=True)

# Paths
video_path = "computer_vision\carrot.mp4"  # Input video path
csv_output_path = "computer_vision/reference_landmarks.csv"  # CSV output path for landmarks

# Open video capture
cap = cv2.VideoCapture(video_path)

# Get video properties
frame_width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
frame_height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
fps = int(cap.get(cv2.CAP_PROP_FPS))

# Open CSV file for writing
csv_file = open(csv_output_path, mode='w', newline='')
csv_writer = csv.writer(csv_file)
csv_writer.writerow(["Frame", "Landmark_Index", "X", "Y"])  # Header

# Define indices for mouth and jaw landmarks
MOUTH_INDICES = [61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 308, 324, 318, 402, 317, 14, 87, 178, 88, 95, 78, 61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291,
                  308, 415, 310, 311, 312, 13, 82, 81, 80, 78, 191  ] # Adjusted for MediaPipe
JAW_INDICES = [389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162] # Adjusted for MediaPipe

# Helper function to draw connected landmarks
def draw_connected_landmarks(image, landmarks, indices, color=(0, 255, 0), thickness=2):
    for i in range(1, len(indices)):
        pt1 = landmarks[indices[i - 1]]
        pt2 = landmarks[indices[i]]
        cv2.line(image, pt1, pt2, color, thickness)


try:
    frame_idx = 0  # Frame counter
    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            print("Finished processing video.")
            break

        # Convert frame to RGB
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

        # Process the frame with MediaPipe Face Mesh
        results = face_mesh.process(rgb_frame)

        if results.multi_face_landmarks:
            for face_landmarks in results.multi_face_landmarks:
                # Extract landmarks
                landmarks = [
                    (int(landmark.x * frame_width), int(landmark.y * frame_height))
                    for landmark in face_landmarks.landmark
                ]

                # Draw landmarks for the jaw and mouth
                draw_connected_landmarks(frame, landmarks, JAW_INDICES, color=(255, 255, 255))  
                draw_connected_landmarks(frame, landmarks, MOUTH_INDICES, color=(255, 255, 255))  
                
                # Label only the mouth and jaw indices
                # for idx in MOUTH_INDICES + JAW_INDICES:  # Combine both lists
                #     x, y = landmarks[idx]
                #     cv2.putText(frame, str(idx), (x + 5, y + 5), cv2.FONT_HERSHEY_SIMPLEX, 0.3, (255, 0, 0), 1)

                # Save landmarks to CSV
                for idx, (x, y) in enumerate(landmarks):
                    csv_writer.writerow([frame_idx, idx, x, y])
                    
                    

        # Write the processed frame to the output video
        # out.write(frame)
        frame_idx += 1  # Increment frame counter

except Exception as e:
    print(f"An error occurred: {e}")

finally:
    cap.release()
    csv_file.close()
    print("Released video capture and writer. Landmarks saved to CSV.")
