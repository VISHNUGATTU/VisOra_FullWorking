import io
import base64
import requests
import numpy as np
import cv2
import insightface
from typing import List, Dict, Tuple, Optional
from engine.core.config import config

class NeuralPipeline:
    """
    VisOra Neural Core Pipeline.
    Combines RetinaFace (face detection & 5-point landmark alignment) with
    ArcFace (Additive Angular Margin Loss deep representation) to yield
    normalized 512D feature embeddings.
    """

    def __init__(self):
        print(f"[*] Initializing InsightFace pipeline with model '{config.MODEL_NAME}' from root '{config.INSIGHTFACE_ROOT}' on {config.EXECUTION_PROVIDERS}...")
        self.app = insightface.app.FaceAnalysis(
            name=config.MODEL_NAME,
            root=config.INSIGHTFACE_ROOT,
            providers=config.EXECUTION_PROVIDERS,
            allowed_modules=["detection", "recognition"]
        )
        self.app.prepare(ctx_id=0, det_size=config.DET_SIZE)
        print("[+] InsightFace Neural Pipeline loaded and ready (Lean Cloud Memory Mode: ~123MB).")

    @staticmethod
    def load_from_bytes(data: bytes) -> np.ndarray:
        """Decode raw image bytes into an OpenCV BGR numpy array."""
        np_arr = np.frombuffer(data, np.uint8)
        img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
        if img is None:
            raise ValueError("Failed to decode image from provided bytes.")
        return img

    @staticmethod
    def load_from_base64(b64_string: str) -> np.ndarray:
        """Decode a Base64 string (with or without data URI header) into an image."""
        if "," in b64_string:
            b64_string = b64_string.split(",", 1)[1]
        decoded = base64.b64decode(b64_string)
        return NeuralPipeline.load_from_bytes(decoded)

    @staticmethod
    def load_from_url(url: str) -> np.ndarray:
        """Download an image from a URL (e.g. Cloudinary) and decode it."""
        headers = {"User-Agent": "VisOra-Neural-Engine/1.0"}
        resp = requests.get(url, headers=headers, timeout=12)
        if resp.status_code != 200:
            raise ValueError(f"Failed to fetch image from URL. HTTP status: {resp.status_code}")
        return NeuralPipeline.load_from_bytes(resp.content)

    def process_image(self, img_bgr: np.ndarray, min_det_score: Optional[float] = None) -> List[Dict]:
        """
        Runs full face detection, alignment, and 512D embedding extraction.
        Returns a list of detected face dictionaries.
        """
        if min_det_score is None:
            min_det_score = config.DETECTION_THRESHOLD

        faces = self.app.get(img_bgr)
        results = []

        for face in faces:
            det_score = float(face.det_score)
            if det_score < min_det_score:
                continue

            # Ensure embedding is L2-normalized float32
            raw_emb = face.normed_embedding if hasattr(face, "normed_embedding") else face.embedding
            emb = np.array(raw_emb, dtype=np.float32)
            norm = np.linalg.norm(emb)
            if norm > 0:
                emb = emb / norm

            bbox = [float(coord) for coord in face.bbox]
            kps = [[float(p[0]), float(p[1])] for p in face.kps] if hasattr(face, "kps") else []

            results.append({
                "bbox": bbox,
                "det_score": det_score,
                "landmarks": kps,
                "embedding": emb,
                "gender": int(face.gender) if hasattr(face, "gender") else None,
                "age": int(face.age) if hasattr(face, "age") else None
            })

        return results

    def extract_enrollment_embedding(self, img_bgr: np.ndarray) -> Tuple[np.ndarray, float, List[float]]:
        """
        Extracts 512D embedding for enrolling a student.
        Ensures a single high-quality face is present.
        Returns (embedding, det_score, bbox).
        """
        faces = self.process_image(img_bgr, min_det_score=config.DETECTION_THRESHOLD)
        if not faces:
            raise ValueError("No face detected in the enrollment image. Please provide a clear, front-facing portrait.")

        # If multiple faces are present, select the largest bounding box area
        best_face = max(faces, key=lambda f: (f["bbox"][2] - f["bbox"][0]) * (f["bbox"][3] - f["bbox"][1]))
        return best_face["embedding"], best_face["det_score"], best_face["bbox"]

# Singleton instance
pipeline = NeuralPipeline()
