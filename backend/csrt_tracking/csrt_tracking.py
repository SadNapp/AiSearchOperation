"""
SAR-VISION // CSRT Object Tracking Module
Performs channel and spatial reliability tracking with exponential trajectory smoothing.
"""

import cv2
import numpy as np
from typing import List, Dict, Any, Tuple


class CSRTTrackerEngine:
    """
    CSRT (Channel and Spatial Reliability) object tracking engine with exponential position smoothing.
    """

    def __init__(self, smoothing_factor: float = 0.35):
        self.smoothing_factor = smoothing_factor
        self.trackers: Dict[int, Any] = {}
        self.smoothed_bboxes: Dict[int, List[float]] = {}
        self.next_id = 1

    def init_tracker(self, frame: np.ndarray, bbox: List[int], obj_id: int):
        """Initialize OpenCV CSRT tracker for a specific object bounding box [x1, y1, x2, y2]."""
        x1, y1, x2, y2 = bbox
        w = max(10, x2 - x1)
        h = max(10, y2 - y1)

        # Fallback to Legacy or modern OpenCV TrackerCSRT
        tracker = None
        if hasattr(cv2, 'TrackerCSRT_create'):
            tracker = cv2.TrackerCSRT_create()
        elif hasattr(cv2, 'legacy') and hasattr(cv2.legacy, 'TrackerCSRT_create'):
            tracker = cv2.legacy.TrackerCSRT_create()

        if tracker is not None:
            try:
                tracker.init(frame, (x1, y1, w, h))
                self.trackers[obj_id] = tracker
                self.smoothed_bboxes[obj_id] = [float(x1), float(y1), float(x2), float(y2)]
            except Exception as e:
                print(f"[CSRT] Failed to initialize CSRT tracker for ID {obj_id}: {e}")

    def update_tracks(self, frame: np.ndarray, raw_detections: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Updates target positions using CSRT tracker updates and applies exponential smoothing.
        """
        h_frame, w_frame = frame.shape[:2]
        processed_detections = []

        # If no active trackers exist, initialize from raw detections
        if not self.trackers and raw_detections:
            for det in raw_detections:
                obj_id = self.next_id
                self.next_id += 1
                self.init_tracker(frame, det["bbox"], obj_id)

        # Update existing CSRT trackers
        active_ids = list(self.trackers.keys())
        for obj_id in active_ids:
            tracker = self.trackers[obj_id]
            success, box = False, None
            try:
                success, box = tracker.update(frame)
            except Exception:
                success = False

            if success and box is not None:
                x, y, w, h = box
                raw_box = [x, y, x + w, y + h]

                # Exponential smoothing of coordinates
                prev_box = self.smoothed_bboxes.get(obj_id, raw_box)
                smoothed_box = [
                    self.smoothing_factor * raw_box[i] + (1.0 - self.smoothing_factor) * prev_box[i]
                    for i in range(4)
                ]
                self.smoothed_bboxes[obj_id] = smoothed_box

                # Clamp values inside frame
                x1_clamped = max(0, min(int(smoothed_box[0]), w_frame - 1))
                y1_clamped = max(0, min(int(smoothed_box[1]), h_frame - 1))
                x2_clamped = max(x1_clamped + 1, min(int(smoothed_box[2]), w_frame))
                y2_clamped = max(y1_clamped + 1, min(int(smoothed_box[3]), h_frame))

                processed_detections.append({
                    "id": obj_id,
                    "label": "person",
                    "conf": 88.5,
                    "bbox": [x1_clamped, y1_clamped, x2_clamped, y2_clamped],
                    "status": "TRACKING"
                })
            else:
                # Remove stale tracker
                self.trackers.pop(obj_id, None)
                self.smoothed_bboxes.pop(obj_id, None)

        return processed_detections
