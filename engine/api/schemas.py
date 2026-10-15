from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class EnrollmentPayload(BaseModel):
    student_id: str = Field(..., description="Unique MongoDB student ObjectId")
    rollno: str = Field(..., description="Student roll number, e.g. 21B91A0501")
    name: str = Field(..., description="Student full name")
    branch: Optional[str] = Field(None, description="Department or Branch (e.g., CSE)")
    year: Optional[int] = Field(None, description="Academic year (1-4)")
    section: Optional[str] = Field(None, description="Section (e.g., A, B)")
    image_url: Optional[str] = Field(None, description="Cloudinary or public image URL")
    image_base64: Optional[str] = Field(None, description="Base64 encoded face image")

class EnrollmentResponse(BaseModel):
    success: bool
    message: str
    student_id: str
    rollno: str
    name: str
    embedding_dim: int = 512
    det_score: float
    bbox: List[float]

class IdentifyPayload(BaseModel):
    image_url: Optional[str] = Field(None, description="Public image URL")
    image_base64: Optional[str] = Field(None, description="Base64 encoded snapshot or video frame")
    top_k: int = Field(1, description="Number of top matches to consider")
    threshold: Optional[float] = Field(None, description="Custom cosine similarity threshold")
    filter_branch: Optional[str] = Field(None, description="Filter candidates by branch")
    filter_year: Optional[int] = Field(None, description="Filter candidates by year")
    filter_section: Optional[str] = Field(None, description="Filter candidates by section")

class IdentifiedFaceResult(BaseModel):
    bbox: List[float]
    det_score: float
    landmarks: List[List[float]]
    gender: Optional[int] = None
    age: Optional[int] = None
    identified: bool
    similarity: float
    student_id: Optional[str] = None
    rollno: Optional[str] = None
    name: Optional[str] = None
    branch: Optional[str] = None
    year: Optional[int] = None
    section: Optional[str] = None

class IdentifyResponse(BaseModel):
    success: bool
    faces_detected: int
    matches: List[IdentifiedFaceResult]
    inference_time_ms: float

class VerifyPayload(BaseModel):
    student_id: Optional[str] = None
    rollno: Optional[str] = None
    image_url: Optional[str] = None
    image_base64: Optional[str] = None
    threshold: Optional[float] = None

class VerifyResponse(BaseModel):
    verified: bool
    similarity: float
    threshold: float
    student_id: Optional[str]
    rollno: Optional[str]
    name: Optional[str]

# ================= PHASE 2: TRACKING & TILING SCHEMAS =================

class TiledAuditPayload(BaseModel):
    image_url: Optional[str] = None
    image_base64: Optional[str] = None
    tile_w: int = Field(640, description="Tile width in pixels")
    tile_h: int = Field(640, description="Tile height in pixels")
    overlap_ratio: float = Field(0.20, description="Tile overlap ratio")
    threshold: Optional[float] = None
    filter_branch: Optional[str] = None
    filter_year: Optional[int] = None
    filter_section: Optional[str] = None

class TiledAuditResponse(BaseModel):
    success: bool
    image_dimensions: List[int]
    faces_detected: int
    matches: List[IdentifiedFaceResult]
    latency_ms: float

class SensorTelemetryPayload(BaseModel):
    pir_motion_detected: bool = Field(True, description="PIR motion sensor trigger")
    pir_intensity: float = Field(1.0, description="PIR signal magnitude [0.0 to 1.0]")
    thermal_surface_temp: Optional[float] = Field(36.4, description="Target surface temperature in °C")
    thermal_ambient_temp: Optional[float] = Field(24.0, description="Ambient room temperature in °C")
    device_id: Optional[str] = "EDGE_NODE_01"

class StreamFramePayload(BaseModel):
    session_id: str = Field(..., description="Active auditing session or camera identifier")
    image_base64: Optional[str] = None
    image_url: Optional[str] = None
    force_detection: bool = Field(False, description="Force neural re-detection on this frame")
    use_adaptive_tiling: bool = Field(True, description="Enable adaptive tiling on detection frames")
    telemetry: Optional[SensorTelemetryPayload] = None

class TrackedFaceResult(BaseModel):
    track_id: int
    bbox: List[float]
    det_score: float
    landmarks: List[List[float]]
    frames_tracked: int
    time_since_update: int
    is_interpolated: bool
    identity: Dict[str, Any]
    liveness: Dict[str, Any]
    fusion: Dict[str, Any]

class StreamFrameResponse(BaseModel):
    success: bool
    session_id: str
    frame_index: int
    is_detection_frame: bool
    tracked_faces_count: int
    tracked_faces: List[TrackedFaceResult]
    verified_students_count: int
    processing_time_ms: float

class SessionCreatePayload(BaseModel):
    session_id: str
    subject: Optional[str] = ""
    branch: Optional[str] = ""
    section: Optional[str] = ""
    year: Optional[int] = None

class SessionSummaryResponse(BaseModel):
    session_id: str
    subject: str
    branch: str
    section: str
    year: Optional[int]
    total_frames_processed: int
    present_count: int
    spoof_flags_count: int = 0
    present_students: List[Dict[str, Any]]
    flagged_spoofs: List[Dict[str, Any]] = []

# ================= PHASE 3: ANTI-SPOOFING & FUSION SCHEMAS =================

class RPPGLivenessPayload(BaseModel):
    rgb_buffer: List[List[float]] = Field(..., description="List of [R, G, B] averages over consecutive frames")
    fps: float = Field(30.0, description="Effective frame rate")

class RPPGLivenessResponse(BaseModel):
    is_live: bool
    liveness_score: float
    heart_rate_bpm: float
    snr_db: float
    dominant_freq_hz: float
    status: str
    message: str

class FusionEvaluatePayload(BaseModel):
    face_similarity: float = Field(..., description="Cosine similarity score from ArcFace 512D")
    rppg_liveness_score: float = Field(..., description="rPPG liveness confidence [0.0 to 1.0]")
    is_rppg_live: bool = Field(..., description="Whether cardiac pulse was verified")
    telemetry: Optional[SensorTelemetryPayload] = None

class FusionEvaluateResponse(BaseModel):
    authorized: bool
    fused_confidence: float
    security_verdict: str
    breakdown: Dict[str, float]
    veto_triggered: bool
    veto_reason: Optional[str]
