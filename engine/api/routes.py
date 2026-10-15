import time
from datetime import datetime
from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Depends
from typing import Optional, List
import numpy as np

from engine.core.config import config
from engine.core.pipeline import pipeline, NeuralPipeline
from engine.core.vector_store import vector_store, VectorStore
from engine.core.tiling import adaptive_tiler
from engine.core.auditor import session_manager
from engine.core.rppg import rppg_detector
from engine.core.sensor_fusion import sensor_fusion_engine, SensorTelemetry, FusionResult
from engine.api.schemas import (
    EnrollmentPayload,
    EnrollmentResponse,
    IdentifyPayload,
    IdentifyResponse,
    IdentifiedFaceResult,
    VerifyPayload,
    VerifyResponse,
    TiledAuditPayload,
    TiledAuditResponse,
    StreamFramePayload,
    StreamFrameResponse,
    TrackedFaceResult,
    SessionCreatePayload,
    SessionSummaryResponse,
    RPPGLivenessPayload,
    RPPGLivenessResponse,
    FusionEvaluatePayload,
    FusionEvaluateResponse
)

router = APIRouter(prefix="/api/v1", tags=["Neural Identity Engine"])

def _load_image_from_payload(image_url: Optional[str], image_base64: Optional[str]) -> np.ndarray:
    """Helper to decode image from either URL or Base64."""
    if image_url and image_url.strip():
        return NeuralPipeline.load_from_url(image_url.strip())
    elif image_base64 and image_base64.strip():
        return NeuralPipeline.load_from_base64(image_base64.strip())
    else:
        raise HTTPException(
            status_code=400,
            detail="Must provide either 'image_url' or 'image_base64'."
        )

# ================= CORE IDENTIFICATION & ENROLLMENT =================

@router.get("/health")
def health_check():
    """Engine health, active sessions, and patent metadata."""
    stats = vector_store.get_stats()
    return {
        "status": "healthy",
        "app_name": config.APP_NAME,
        "version": config.VERSION,
        "patent": config.PATENT_REF,
        "model": config.MODEL_NAME,
        "providers": config.EXECUTION_PROVIDERS,
        "active_audit_sessions": len(session_manager.sessions),
        "vector_store": stats
    }

@router.get("/stats")
def vector_stats():
    """Vector store statistics."""
    return vector_store.get_stats()

@router.post("/enroll", response_model=EnrollmentResponse)
def enroll_student(payload: EnrollmentPayload):
    """
    Enrolls a student face into the FAISS vector index.
    Extracts 512D ArcFace embeddings and synchronizes metadata.
    """
    try:
        img_bgr = _load_image_from_payload(payload.image_url, payload.image_base64)
        emb, det_score, bbox = pipeline.extract_enrollment_embedding(img_bgr)

        extra_meta = {
            "name": payload.name,
            "branch": payload.branch or "",
            "year": payload.year,
            "section": payload.section or "",
            "enrolled_at": datetime.utcnow().isoformat()
        }

        vector_store.add_or_update_student(
            student_id=payload.student_id,
            rollno=payload.rollno,
            embedding=emb,
            extra_meta=extra_meta
        )

        return EnrollmentResponse(
            success=True,
            message="Student face successfully enrolled in neural vector index.",
            student_id=payload.student_id,
            rollno=payload.rollno,
            name=payload.name,
            embedding_dim=len(emb),
            det_score=round(det_score, 4),
            bbox=bbox
        )
    except ValueError as ve:
        raise HTTPException(status_code=422, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Enrollment failed: {str(e)}")

@router.post("/enroll/upload", response_model=EnrollmentResponse)
async def enroll_student_upload(
    file: UploadFile = File(...),
    student_id: str = Form(...),
    rollno: str = Form(...),
    name: str = Form(...),
    branch: Optional[str] = Form(None),
    year: Optional[int] = Form(None),
    section: Optional[str] = Form(None)
):
    """Enrolls a student via direct multipart image file upload."""
    try:
        content = await file.read()
        img_bgr = NeuralPipeline.load_from_bytes(content)
        emb, det_score, bbox = pipeline.extract_enrollment_embedding(img_bgr)

        extra_meta = {
            "name": name,
            "branch": branch or "",
            "year": year,
            "section": section or "",
            "enrolled_at": datetime.utcnow().isoformat()
        }

        vector_store.add_or_update_student(
            student_id=student_id,
            rollno=rollno,
            embedding=emb,
            extra_meta=extra_meta
        )

        return EnrollmentResponse(
            success=True,
            message="Student face successfully enrolled via file upload.",
            student_id=student_id,
            rollno=rollno,
            name=name,
            embedding_dim=len(emb),
            det_score=round(det_score, 4),
            bbox=bbox
        )
    except ValueError as ve:
        raise HTTPException(status_code=422, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload enrollment failed: {str(e)}")

@router.post("/identify", response_model=IdentifyResponse)
def identify_faces(payload: IdentifyPayload):
    """
    Sub-millisecond multi-face identification.
    Detects all faces in frame, computes 512D embeddings, and searches FAISS.
    """
    start_time = time.time()
    try:
        img_bgr = _load_image_from_payload(payload.image_url, payload.image_base64)
        detected_faces = pipeline.process_image(img_bgr)

        filter_criteria = {}
        if payload.filter_branch:
            filter_criteria["branch"] = payload.filter_branch
        if payload.filter_section:
            filter_criteria["section"] = payload.filter_section
        if payload.filter_year:
            filter_criteria["year"] = payload.filter_year

        matches: list[IdentifiedFaceResult] = []

        for face in detected_faces:
            search_res = vector_store.search_face(
                query_embedding=face["embedding"],
                top_k=payload.top_k,
                threshold=payload.threshold or config.COSINE_THRESHOLD,
                filter_criteria=filter_criteria if filter_criteria else None
            )

            matches.append(IdentifiedFaceResult(
                bbox=face["bbox"],
                det_score=round(face["det_score"], 4),
                landmarks=face["landmarks"],
                gender=face.get("gender"),
                age=face.get("age"),
                identified=search_res["identified"],
                similarity=search_res["similarity"],
                student_id=search_res.get("student_id"),
                rollno=search_res.get("rollno"),
                name=search_res.get("name"),
                branch=search_res.get("branch"),
                year=search_res.get("year"),
                section=search_res.get("section")
            ))

        inference_time_ms = round((time.time() - start_time) * 1000, 2)
        return IdentifyResponse(
            success=True,
            faces_detected=len(detected_faces),
            matches=matches,
            inference_time_ms=inference_time_ms
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Identification error: {str(e)}")

@router.post("/identify/upload", response_model=IdentifyResponse)
async def identify_faces_upload(
    file: UploadFile = File(...),
    threshold: Optional[float] = Form(None),
    filter_branch: Optional[str] = Form(None),
    filter_year: Optional[int] = Form(None),
    filter_section: Optional[str] = Form(None)
):
    """Direct multipart image file identification."""
    start_time = time.time()
    try:
        content = await file.read()
        img_bgr = NeuralPipeline.load_from_bytes(content)
        detected_faces = pipeline.process_image(img_bgr)

        filter_criteria = {}
        if filter_branch:
            filter_criteria["branch"] = filter_branch
        if filter_section:
            filter_criteria["section"] = filter_section
        if filter_year:
            filter_criteria["year"] = filter_year

        matches: list[IdentifiedFaceResult] = []
        for face in detected_faces:
            search_res = vector_store.search_face(
                query_embedding=face["embedding"],
                top_k=1,
                threshold=threshold or config.COSINE_THRESHOLD,
                filter_criteria=filter_criteria if filter_criteria else None
            )

            matches.append(IdentifiedFaceResult(
                bbox=face["bbox"],
                det_score=round(face["det_score"], 4),
                landmarks=face["landmarks"],
                gender=face.get("gender"),
                age=face.get("age"),
                identified=search_res["identified"],
                similarity=search_res["similarity"],
                student_id=search_res.get("student_id"),
                rollno=search_res.get("rollno"),
                name=search_res.get("name"),
                branch=search_res.get("branch"),
                year=search_res.get("year"),
                section=search_res.get("section")
            ))

        inference_time_ms = round((time.time() - start_time) * 1000, 2)
        return IdentifyResponse(
            success=True,
            faces_detected=len(detected_faces),
            matches=matches,
            inference_time_ms=inference_time_ms
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Identification error: {str(e)}")

@router.post("/verify", response_model=VerifyResponse)
def verify_face(payload: VerifyPayload):
    """1:1 Verification between an input face and a specific enrolled student."""
    try:
        img_bgr = _load_image_from_payload(payload.image_url, payload.image_base64)
        emb, _, _ = pipeline.extract_enrollment_embedding(img_bgr)

        threshold = payload.threshold or config.COSINE_THRESHOLD
        search_res = vector_store.search_face(query_embedding=emb, top_k=1, threshold=threshold)

        is_match = False
        if search_res["identified"]:
            if payload.student_id and search_res["student_id"] == payload.student_id:
                is_match = True
            elif payload.rollno and search_res["rollno"] == payload.rollno.strip().upper():
                is_match = True

        return VerifyResponse(
            verified=is_match,
            similarity=search_res["similarity"],
            threshold=threshold,
            student_id=search_res.get("student_id") if is_match else None,
            rollno=search_res.get("rollno") if is_match else None,
            name=search_res.get("name") if is_match else None
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Verification failed: {str(e)}")

@router.delete("/remove/{student_id}")
def remove_student(student_id: str):
    """Removes a student's embedding from the FAISS vector index."""
    success = vector_store.remove_student(student_id)
    if not success:
        raise HTTPException(status_code=404, detail=f"Student ID '{student_id}' not found in index.")
    return {"success": True, "message": f"Student '{student_id}' removed from vector index."}


# ================= PHASE 2: ADAPTIVE TILING & OPTICAL TRACKING =================

@router.post("/audit/tiled", response_model=TiledAuditResponse)
def audit_tiled(payload: TiledAuditPayload):
    """
    Adaptive Tiling Face Auditor for High-Resolution / Crowded Feeds.
    Dynamically slices the frame into overlapping tiles, detects distant/small faces,
    and merges detections across tile seams via NMS.
    """
    start_time = time.time()
    try:
        img_bgr = _load_image_from_payload(payload.image_url, payload.image_base64)
        h, w = img_bgr.shape[:2]

        merged_dets = adaptive_tiler.process_adaptive(
            pipeline=pipeline,
            img_bgr=img_bgr,
            tile_size=(payload.tile_w, payload.tile_h),
            overlap_ratio=payload.overlap_ratio
        )

        filter_criteria = {}
        if payload.filter_branch:
            filter_criteria["branch"] = payload.filter_branch
        if payload.filter_section:
            filter_criteria["section"] = payload.filter_section
        if payload.filter_year:
            filter_criteria["year"] = payload.filter_year

        matches: List[IdentifiedFaceResult] = []
        for face in merged_dets:
            search_res = vector_store.search_face(
                query_embedding=face["embedding"],
                top_k=1,
                threshold=payload.threshold or config.COSINE_THRESHOLD,
                filter_criteria=filter_criteria if filter_criteria else None
            )

            matches.append(IdentifiedFaceResult(
                bbox=face["bbox"],
                det_score=round(face["det_score"], 4),
                landmarks=face.get("landmarks", []),
                gender=face.get("gender"),
                age=face.get("age"),
                identified=search_res["identified"],
                similarity=search_res["similarity"],
                student_id=search_res.get("student_id"),
                rollno=search_res.get("rollno"),
                name=search_res.get("name"),
                branch=search_res.get("branch"),
                year=search_res.get("year"),
                section=search_res.get("section")
            ))

        latency_ms = round((time.time() - start_time) * 1000, 2)
        return TiledAuditResponse(
            success=True,
            image_dimensions=[w, h],
            faces_detected=len(matches),
            matches=matches,
            latency_ms=latency_ms
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Adaptive tiling error: {str(e)}")

@router.post("/audit/session/create")
def create_audit_session(payload: SessionCreatePayload):
    """Creates a new tracking and attendance auditing session for a classroom/lecture."""
    session = session_manager.get_or_create(
        session_id=payload.session_id,
        subject=payload.subject or "",
        branch=payload.branch or "",
        section=payload.section or "",
        year=payload.year
    )
    return {
        "success": True,
        "message": f"Audit session '{payload.session_id}' initialized.",
        "session_id": session.session_id,
        "created_at": session.created_at
    }

@router.post("/audit/frame", response_model=StreamFrameResponse)
def audit_stream_frame(payload: StreamFramePayload):
    """
    Processes a frame in a video stream with Optical Tracking, rPPG liveness, and Sensor Fusion.
    Runs heavy neural detection every N frames, and 0.08ms optical Kalman tracking on intermediate frames.
    """
    start_time = time.time()
    try:
        img_bgr = _load_image_from_payload(payload.image_url, payload.image_base64)
        session = session_manager.get_or_create(session_id=payload.session_id)

        telemetry_obj = None
        if payload.telemetry:
            telemetry_obj = SensorTelemetry(
                pir_motion_detected=payload.telemetry.pir_motion_detected,
                pir_intensity=payload.telemetry.pir_intensity,
                thermal_surface_temp=payload.telemetry.thermal_surface_temp,
                thermal_ambient_temp=payload.telemetry.thermal_ambient_temp,
                device_id=payload.telemetry.device_id or "EDGE_NODE_01"
            )

        result = session.process_frame(
            frame_bgr=img_bgr,
            force_detection=payload.force_detection,
            use_adaptive_tiling=payload.use_adaptive_tiling,
            telemetry=telemetry_obj
        )

        processing_time_ms = round((time.time() - start_time) * 1000, 2)
        return StreamFrameResponse(
            success=True,
            session_id=result["session_id"],
            frame_index=result["frame_index"],
            is_detection_frame=result["is_detection_frame"],
            tracked_faces_count=result["tracked_faces_count"],
            tracked_faces=result["tracked_faces"],
            verified_students_count=result["verified_students_count"],
            processing_time_ms=processing_time_ms
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Tracking frame error: {str(e)}")

@router.get("/audit/session/{session_id}", response_model=SessionSummaryResponse)
def get_session_summary(session_id: str, min_frames: int = 3):
    """Retrieves current verified attendance summary for an ongoing session."""
    session = session_manager.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail=f"Session '{session_id}' not found.")
    summary = session.get_summary(min_frames_threshold=min_frames)
    return summary

@router.post("/audit/session/{session_id}/finalize", response_model=SessionSummaryResponse)
def finalize_session(session_id: str, min_frames: int = 3):
    """Concludes the auditing session and returns final verified student attendance."""
    summary = session_manager.close(session_id)
    if not summary:
        raise HTTPException(status_code=404, detail=f"Session '{session_id}' not found.")
    return summary


# ================= PHASE 3: ANTI-SPOOFING & MULTI-SENSOR FUSION =================

@router.post("/liveness/rppg", response_model=RPPGLivenessResponse)
def evaluate_rppg_buffer(payload: RPPGLivenessPayload):
    """
    Direct rPPG blood volume pulse analysis on a temporal buffer of facial skin RGB samples.
    Filters capillary chrominance waves and identifies cardiac rhythm in [0.75, 2.67] Hz.
    """
    buffer_arr = np.array(payload.rgb_buffer, dtype=np.float32)
    analysis = rppg_detector.analyze_pulse(buffer_arr, effective_fps=payload.fps)
    return RPPGLivenessResponse(
        is_live=analysis["is_live"],
        liveness_score=analysis["liveness_score"],
        heart_rate_bpm=analysis["heart_rate_bpm"],
        snr_db=analysis["snr_db"],
        dominant_freq_hz=analysis.get("dominant_freq_hz", 0.0),
        status=analysis["status"],
        message=analysis["message"]
    )

@router.post("/sensor/fuse", response_model=FusionEvaluateResponse)
def evaluate_sensor_fusion(payload: FusionEvaluatePayload):
    """
    Direct Multi-Sensor Fusion Evaluation.
    Fuses Optical Biometrics (ArcFace), rPPG blood pulse, PIR motion, and thermal array readings.
    """
    telemetry_obj = None
    if payload.telemetry:
        telemetry_obj = SensorTelemetry(
            pir_motion_detected=payload.telemetry.pir_motion_detected,
            pir_intensity=payload.telemetry.pir_intensity,
            thermal_surface_temp=payload.telemetry.thermal_surface_temp,
            thermal_ambient_temp=payload.telemetry.thermal_ambient_temp,
            device_id=payload.telemetry.device_id or "EDGE_NODE_01"
        )

    rppg_dict = {
        "is_live": payload.is_rppg_live,
        "liveness_score": payload.rppg_liveness_score,
        "status": "AUTHENTIC_LIVING_PULSE" if payload.is_rppg_live else "REJECTED_SPOOF_ATTACK"
    }

    fusion_res: FusionResult = sensor_fusion_engine.fuse(
        face_similarity=payload.face_similarity,
        rppg_liveness=rppg_dict,
        telemetry=telemetry_obj
    )

    return FusionEvaluateResponse(
        authorized=fusion_res.authorized,
        fused_confidence=fusion_res.fused_confidence,
        security_verdict=fusion_res.security_verdict,
        breakdown=fusion_res.breakdown,
        veto_triggered=fusion_res.veto_triggered,
        veto_reason=fusion_res.veto_reason
    )
