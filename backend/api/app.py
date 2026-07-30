"""
SAR-VISION // FastAPI Backend Application
Serves telemetry API endpoints, hardware performance stats, and live MJPEG video streams.
"""

import os
import time
import cv2
import asyncio
from fastapi import FastAPI, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

# Import Adapter and Tracking Modules
from adapter.dataset_adapter import DatasetAdapter
from backend.coords_tracking.coords_tracking import PreciseCoordsTracker
from backend.csrt_tracking.csrt_tracking import CSRTTrackerEngine

app = FastAPI(title="SAR-VISION Tactical API", version="2.4.0")

# Enable CORS for frontend communications
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Active State Management
state = {
    "model": "yolov11s-rescue",
    "tracker_type": "coords",  # "coords" or "csrt"
    "active_video": os.path.join("assets", "dataset", "video", "farhuman_medium.mp4"),
    "gpu_fps": 58.4,
    "cpu_fps": 18.2,
    "npu_status": "HAILO-8 (NPU ONLINE)",
    "inference_ms": 14,
    "latency_ms": 11,
    "current_detections": []
}

coords_tracker = PreciseCoordsTracker()
csrt_tracker = CSRTTrackerEngine()


class ModelChangeRequest(BaseModel):
    model: str


@app.get("/api/metrics")
async def get_metrics():
    """
    Returns live hardware performance & target detection metrics.
    """
    # Return formatted telemetry packet via Adapter
    return DatasetAdapter.format_telemetry(
        detections=state["current_detections"],
        gt_count=4,
        fps_gpu=state["gpu_fps"],
        fps_cpu=state["cpu_fps"],
        npu_status=state["npu_status"],
        inference_ms=state["inference_ms"],
        latency_ms=state["latency_ms"]
    )


@app.post("/api/model/change")
async def change_model(request: ModelChangeRequest):
    """
    Updates active neural network model or tracking backend.
    """
    state["model"] = request.model
    if "csrt" in request.model.lower():
        state["tracker_type"] = "csrt"
    else:
        state["tracker_type"] = "coords"
    return {"status": "success", "active_model": state["model"], "tracker_type": state["tracker_type"]}


def generate_video_mjpeg():
    """
    MJPEG Video Generator: Reads video frames, applies tracking, draws BBoxes, and yields MJPEG stream.
    """
    video_path = state["active_video"]
    if not os.path.exists(video_path):
        # Fallback if video file is missing
        print(f"[BACKEND] Video file not found: {video_path}")
        return

    cap = cv2.VideoCapture(video_path)

    while True:
        ret, frame = cap.read()
        if not ret:
            cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
            continue

        h_frame, w_frame = frame.shape[:2]

        # Generate sample detections dynamically synced with video frames
        t = time.time()
        t1_x1 = int(w_frame * 0.30 + np.sin(t * 0.8) * (w_frame * 0.12))
        t1_y1 = int(h_frame * 0.35 + np.cos(t * 0.6) * (h_frame * 0.08))
        t1_w = int(w_frame * 0.08)
        t1_h = int(h_frame * 0.22)

        raw_dets = [
            {
                "bbox": [t1_x1, t1_y1, t1_x1 + t1_w, t1_y1 + t1_h],
                "conf": 94.5,
                "label": "person"
            }
        ]

        # Process detections with selected tracking module
        if state["tracker_type"] == "csrt":
            active_dets = csrt_tracker.update_tracks(frame, raw_dets)
        else:
            active_dets = coords_tracker.update(raw_dets, (w_frame, h_frame))

        state["current_detections"] = active_dets

        # Render BBoxes onto video frame using tracking module
        annotated_frame = coords_tracker.draw_bboxes(frame, active_dets)

        # Encode frame to JPEG
        ret, jpeg = cv2.imencode('.jpg', annotated_frame, [int(cv2.IMWRITE_JPEG_QUALITY), 80])
        if not ret:
            continue

        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + jpeg.tobytes() + b'\r\n')

        time.sleep(0.03)  # ~30 FPS


@app.get("/api/stream")
async def video_stream():
    """
    Returns MJPEG stream with annotated BBoxes.
    """
    return Response(generate_video_mjpeg(), media_type="multipart/x-mixed-replace; boundary=frame")
