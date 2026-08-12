import cv2
import numpy as np

# Load test frame
frame = cv2.imread("preview-out/frames/frame_0120.jpg")
h, w, _ = frame.shape

# Watermark ROI bounding box in 1280x720:
# x: 1110 to 1230, y: 580 to 670
x1, x2 = 1100, 1240
y1, y2 = 570, 685

# Create binary mask of white/bright sparkle watermark inside ROI
roi = frame[y1:y2, x1:x2]
gray_roi = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY)

# Threshold for white/light sparkle logo
_, mask_roi = cv2.threshold(gray_roi, 190, 255, cv2.THRESH_BINARY)
# Dilate mask slightly to cover anti-aliased edges
kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
mask_roi = cv2.dilate(mask_roi, kernel, iterations=2)

# Full frame mask
mask = np.zeros((h, w), dtype=np.uint8)
mask[y1:y2, x1:x2] = mask_roi

# Inpaint using Telea / Navier-Stokes algorithm
inpainted = cv2.inpaint(frame, mask, 5, cv2.INPAINT_TELEA)

# Save test result
cv2.imwrite("preview-out/inpainted_test.jpg", inpainted)
print("Saved preview-out/inpainted_test.jpg")
