import cv2
import os

video_path = "src/assets/reveal-video.mp4"
out_dir = "preview-out/frames"
os.makedirs(out_dir, exist_ok=True)

cap = cv2.VideoCapture(video_path)
width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
fps = cap.get(cv2.CAP_PROP_FPS)
total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

print(f"Video Info: {width}x{height}, FPS: {fps}, Total Frames: {total_frames}")

for frame_idx in [0, total_frames // 4, total_frames // 2, (3 * total_frames) // 4, total_frames - 5]:
    cap.set(cv2.CAP_PROP_POS_FRAMES, frame_idx)
    ret, frame = cap.read()
    if ret:
        cv2.imwrite(f"{out_dir}/frame_{frame_idx:04d}.jpg", frame)
        print(f"Saved frame_{frame_idx:04d}.jpg")

cap.release()
