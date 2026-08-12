import cv2
import numpy as np
import subprocess
import os
import shutil

video_in = "src/assets/reveal-video.mp4"
video_temp = "src/assets/reveal-video-temp.mp4"
ffmpeg_exe = r"C:\Python313\Lib\site-packages\imageio_ffmpeg\binaries\ffmpeg-win-x86_64-v7.1.exe"

cap = cv2.VideoCapture(video_in)
orig_w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
orig_h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
fps = cap.get(cv2.CAP_PROP_FPS)
total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

# Target Ultra HD resolution: 1920x1080 (Full HD / 1080p Ultra Crisp)
target_w, target_h = 1920, 1080

print(f"Processing Video: {orig_w}x{orig_h} -> {target_w}x{target_h}, FPS: {fps}, Total Frames: {total_frames}")

# Watermark ROI in 1280x720 coordinates:
x1_orig, x2_orig = 1100, 1240
y1_orig, y2_orig = 570, 685

# Create video writer using imageio_ffmpeg / ffmpeg pipe for maximum quality
command = [
    ffmpeg_exe,
    "-y",
    "-f", "rawvideo",
    "-vcodec", "rawvideo",
    "-s", f"{target_w}x{target_h}",
    "-pix_fmt", "bgr24",
    "-r", str(fps),
    "-i", "-",
    "-c:v", "libx264",
    "-pix_fmt", "yuv420p",
    "-crf", "17",
    "-preset", "slow",
    video_temp
]

proc = subprocess.Popen(command, stdin=subprocess.PIPE)

count = 0
while True:
    ret, frame = cap.read()
    if not ret:
        break

    # 1. Inpaint Gemini watermark in 720p space
    roi = frame[y1_orig:y2_orig, x1_orig:x2_orig]
    gray_roi = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY)
    _, mask_roi = cv2.threshold(gray_roi, 185, 255, cv2.THRESH_BINARY)
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
    mask_roi = cv2.dilate(mask_roi, kernel, iterations=2)

    mask = np.zeros((orig_h, orig_w), dtype=np.uint8)
    mask[y1_orig:y2_orig, x1_orig:x2_orig] = mask_roi

    cleaned = cv2.inpaint(frame, mask, 5, cv2.INPAINT_TELEA)

    # 2. Ultra HD Upscaling to 1920x1080 using Lanczos-4
    hd_frame = cv2.resize(cleaned, (target_w, target_h), interpolation=cv2.INTER_LANCZOS4)

    # 3. Subtle Unsharp Masking for Ultra HD sharpness & crisp edges
    blurred = cv2.GaussianBlur(hd_frame, (0, 0), 2.5)
    sharpened = cv2.addWeighted(hd_frame, 1.25, blurred, -0.25, 0)

    # Write frame to ffmpeg stdin pipe
    proc.stdin.write(sharpened.tobytes())
    count += 1
    if count % 30 == 0:
        print(f"Processed {count}/{total_frames} frames ({int(count/total_frames*100)}%)...")

cap.release()
proc.stdin.close()
proc.wait()

print("Video encoding complete!")

# Replace original video asset with enhanced Ultra HD video
if os.path.exists(video_temp):
    shutil.move(video_temp, video_in)
    print("Successfully updated src/assets/reveal-video.mp4 with Ultra HD watermark-free video!")
