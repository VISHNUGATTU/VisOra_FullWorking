# VisOra: Neural Identity Engine
**Patent Application No:** 202641036876 (Published by Indian Patent Office)

The **VisOra Neural Identity Engine** is an intelligent, high-throughput biometric microservice built with **FastAPI**, **ONNX Runtime (InsightFace)**, and **FAISS** for sub-millisecond vector similarity search, featuring dual-layer anti-spoofing and high-performance CPU optimization.

---

## Technical Specifications
- **Face Detection & Landmark Alignment:** RetinaFace / SCRFD with 5-point facial landmark alignment via ONNX Runtime CPU.
- **Deep Feature Representation:** ArcFace (Additive Angular Margin Loss) generating L2-normalized **512-dimensional vector embeddings**.
- **Vector Search Engine:** FAISS `IndexFlatIP` calculating exact cosine similarities in **< 2 milliseconds**.
- **Adaptive Tiling (SAHI style):** Dynamic slicing of high-resolution classroom panorama frames into overlapping tiles for detecting distant/small faces with global NMS fusion.
- **Optical Bounding-Box Tracking:** 2D Bounding-Box Kalman Filter with Hungarian assignment (`scipy.optimize.linear_sum_assignment`), achieving **0.08ms per frame** tracking throughput (>5,000x CPU speedup).
- **Anti-Spoofing Layer 1 (rPPG):** Remote Photoplethysmography extracting blood volume pulse (BVP) via CHROM algorithm & zero-phase Butterworth filtering with FFT spectral concentration SNR in $[0.75, 2.50]\text{ Hz}$ ($45 - 150\text{ BPM}$).
- **Anti-Spoofing Layer 2 (Multi-Sensor Fusion):** Real-time ingestion and Bayesian fusion of Passive Infrared (PIR) kinetic presence and Thermal surface temperatures ($34.0^\circ\text{C} - 38.0^\circ\text{C}$) with hard security vetoes against paper masks, screens, and mannequins.
- **Session Auditor:** Video stream presence aggregator for automated classroom lecture attendance auditing.

---

## Directory Structure
```
engine/
├── api/
│   ├── routes.py         # REST endpoints (enroll, identify, verify, tiled audit, frame stream, rppg, sensor fusion)
│   └── schemas.py        # Pydantic request & response models
├── core/
│   ├── config.py         # Thresholds, model names, and persistence paths
│   ├── pipeline.py       # RetinaFace detection + ArcFace 512D feature extraction
│   ├── vector_store.py   # Thread-safe FAISS index with metadata persistence
│   ├── tiling.py         # Adaptive Tiler (SAHI dynamic slicing + NMS seam fusion)
│   ├── kalman.py         # 2D Bounding-Box Kalman Filter state estimator
│   ├── tracking.py       # Optical Face Tracker with intelligent embedding caching
│   ├── rppg.py           # Remote Photoplethysmography capillary pulse detector
│   ├── sensor_fusion.py  # Multi-Sensor Fusion Engine (PIR + Thermal + rPPG + ArcFace)
│   └── auditor.py        # Continuous Session Auditor for streaming video attendance
├── data/
│   └── index/            # Persisted faiss_index.bin and metadata.json
├── main.py               # FastAPI application entrypoint with CORS
├── requirements.txt      # Dependency specification
├── test_engine.py        # Phase 1 test suite
├── test_phase2.py        # Phase 2 test suite (Tiling & Optical Tracking benchmarks)
└── test_phase3.py        # Phase 3 test suite (rPPG Liveness & Sensor Fusion validation)
```

---

## API Endpoints

### Core Enrollment & Identification
- `GET /api/v1/health`: Service status, active sessions, model info, vector count.
- `POST /api/v1/enroll`: Enrolls a student face via image URL or base64.
- `POST /api/v1/enroll/upload`: Enrolls a student face via direct image file upload.
- `POST /api/v1/identify`: Multi-face 1:N vector search on input frame.
- `POST /api/v1/identify/upload`: Multi-face identification on uploaded file.
- `POST /api/v1/verify`: 1:1 biometric identity verification.
- `DELETE /api/v1/remove/{student_id}`: Removes student embedding from FAISS.

### Adaptive Tiling & Optical Tracking (Phase 2)
- `POST /api/v1/audit/tiled`: Slices high-resolution frames (1080p, 4K) into overlapping tiles, detects distant faces, and merges them across tile seams via NMS.
- `POST /api/v1/audit/session/create`: Initializes a lecture attendance auditing session.
- `POST /api/v1/audit/frame`: Ingests a video stream frame (switches automatically between neural detection, 0.08ms optical tracking, rPPG liveness, and multi-sensor fusion).
- `GET /api/v1/audit/session/{session_id}`: Real-time query of currently present students in the session.
- `POST /api/v1/audit/session/{session_id}/finalize`: Closes session and outputs verified attendance summary.

### Anti-Spoofing & Sensor Fusion (Phase 3)
- `POST /api/v1/liveness/rppg`: Evaluates a temporal RGB buffer of facial skin pixels, extracting heart rate and liveness SNR.
- `POST /api/v1/sensor/fuse`: Evaluates multi-sensor telemetry (facial similarity + rPPG liveness + PIR + thermal surface temp).

---

## Test Suites
```bash
# Phase 1: Neural Core & FAISS
python engine/test_engine.py

# Phase 2: CPU Optimization & Optical Tracking
python engine/test_phase2.py

# Phase 3: Anti-Spoofing & Sensor Fusion
python engine/test_phase3.py
```
