"""
SAR-VISION // Adapter Module
Handles normalization of model predictions, bounding box coordinates, and telemetry packet formatting.
"""

from typing import List, Dict, Any, Tuple


class DatasetAdapter:
    """
    Adapter layer bridging raw neural network / tracking outputs with backend API & frontend UI.
    """

    @staticmethod
    def normalize_bbox(bbox: List[float], frame_size: Tuple[int, int]) -> List[int]:
        """
        Normalizes bounding box coordinates [x1, y1, x2, y2] to integer pixel values bounded by frame size.
        """
        frame_width, frame_height = frame_size
        x1, y1, x2, y2 = bbox

        x1_norm = max(0, min(int(x1), frame_width - 1))
        y1_norm = max(0, min(int(y1), frame_height - 1))
        x2_norm = max(x1_norm + 1, min(int(x2), frame_width))
        y2_norm = max(y1_norm + 1, min(int(y2), frame_height))

        return [x1_norm, y1_norm, x2_norm, y2_norm]

    @staticmethod
    def format_telemetry(
        detections: List[Dict[str, Any]],
        gt_count: int = 4,
        fps_gpu: float = 45.2,
        fps_cpu: float = 16.5,
        npu_status: str = "HAILO-8 (NPU)",
        inference_ms: int = 14,
        latency_ms: int = 11
    ) -> Dict[str, Any]:
        """
        Constructs standardized JSON telemetry packet for FastAPI backend & frontend.
        """
        return {
            "people": len(detections),
            "gt": gt_count,
            "fps_gpu": round(fps_gpu, 1),
            "fps_cpu": round(fps_cpu, 1),
            "npu": npu_status,
            "inference": inference_ms,
            "latency": latency_ms,
            "detections": detections
        }
