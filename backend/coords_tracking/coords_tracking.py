"""
SAR-VISION // High Precision BBox Coordinates Tracking Module
Performs exact coordinate normalization, IoU target association, and high-precision OpenCV BBox rendering.
"""

import cv2
import numpy as np
from typing import List, Dict, Any, Tuple


class PreciseCoordsTracker:
    """
    High-precision tracking module based on exact bounding box coordinate alignment & IoU tracking.
    """

    def __init__(self, iou_threshold: float = 0.4):
        self.iou_threshold = iou_threshold
        self.tracked_objects: Dict[int, Dict[str, Any]] = {}
        self.next_object_id = 1

    def calculate_iou(self, bbox1: List[int], bbox2: List[int]) -> float:
        """Calculate Intersection over Union (IoU) between two bounding boxes [x1, y1, x2, y2]."""
        x1 = max(bbox1[0], bbox2[0])
        y1 = max(bbox1[1], bbox2[1])
        x2 = min(bbox1[2], bbox2[2])
        y2 = min(bbox1[3], bbox2[3])

        intersection = max(0, x2 - x1) * max(0, y2 - y1)
        area1 = (bbox1[2] - bbox1[0]) * (bbox1[3] - bbox1[1])
        area2 = (bbox2[2] - bbox2[0]) * (bbox2[3] - bbox2[1])

        union = area1 + area2 - intersection
        return intersection / union if union > 0 else 0.0

    def update(self, detections: List[Dict[str, Any]], frame_size: Tuple[int, int]) -> List[Dict[str, Any]]:
        """
        Updates tracked targets with incoming detections, assigning consistent IDs and exact coordinates.
        """
        frame_w, frame_h = frame_size
        updated_targets = []

        for det in detections:
            bbox = det["bbox"]
            conf = det.get("conf", 85.0)
            label = det.get("label", "person")

            # Clamp coordinates exactly inside frame bounds
            x1 = max(0, min(int(bbox[0]), frame_w - 1))
            y1 = max(0, min(int(bbox[1]), frame_h - 1))
            x2 = max(x1 + 1, min(int(bbox[2]), frame_w))
            y2 = max(y1 + 1, min(int(bbox[3]), frame_h))
            norm_bbox = [x1, y1, x2, y2]

            best_match_id = None
            best_iou = 0.0

            for obj_id, obj_data in self.tracked_objects.items():
                iou = self.calculate_iou(norm_bbox, obj_data["bbox"])
                if iou > self.iou_threshold and iou > best_iou:
                    best_iou = iou
                    best_match_id = obj_id

            if best_match_id is None:
                assigned_id = self.next_object_id
                self.next_object_id += 1
            else:
                assigned_id = best_match_id

            target_status = "LOCKED" if conf >= 85.0 else "TRACKING"

            target_packet = {
                "id": assigned_id,
                "label": label,
                "conf": float(conf),
                "bbox": norm_bbox,
                "status": target_status
            }

            self.tracked_objects[assigned_id] = target_packet
            updated_targets.append(target_packet)

        return updated_targets

    def draw_bboxes(self, frame: np.ndarray, detections: List[Dict[str, Any]]) -> np.ndarray:
        """
        Draws high-precision tactical bounding boxes directly onto an OpenCV frame.
        """
        annotated_frame = frame.copy()

        for det in detections:
            x1, y1, x2, y2 = det["bbox"]
            obj_id = det["id"]
            label = det["label"]
            conf = det["conf"]
            is_locked = det["status"] == "LOCKED"

            color = (56, 56, 224) if is_locked else (108, 203, 163)  # BGR

            # Draw precise rectangle
            cv2.rectangle(annotated_frame, (x1, y1), (x2, y2), color, 2)

            # Draw label tag banner
            tag_text = f"#{obj_id} {label.upper()} {conf:.1f}%"
            (text_w, text_h), baseline = cv2.getTextSize(tag_text, cv2.FONT_HERSHEY_SIMPLEX, 0.45, 1)

            tag_y = max(y1, text_h + 4)
            cv2.rectangle(annotated_frame, (x1, tag_y - text_h - 4), (x1 + text_w + 6, tag_y + baseline), (20, 26, 22), -1)
            cv2.rectangle(annotated_frame, (x1, tag_y - text_h - 4), (x1 + text_w + 6, tag_y + baseline), color, 1)
            cv2.putText(annotated_frame, tag_text, (x1 + 3, tag_y - 2), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (255, 255, 255), 1, cv2.LINE_AA)

        return annotated_frame
