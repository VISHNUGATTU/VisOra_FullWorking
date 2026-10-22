import sys
import gc
import os
from pathlib import Path
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import numpy as np
import uvicorn

# Ensure repository root is on sys.path
ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from engine.core.config import config
from engine.core.pipeline import pipeline
from engine.core.vector_store import vector_store
from engine.core.scheduler import schedule_manager
from engine.core.auditor import session_manager
from engine.api.routes import router as api_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Warm-up neural pipeline and vector store
    print(f"\n=======================================================")
    print(f"  {config.APP_NAME} v{config.VERSION} [PRODUCTION MODE]")
    print(f"  {config.PATENT_REF}")
    print(f"  Model: {config.MODEL_NAME} | Dim: {config.EMBEDDING_DIM}D")
    print(f"  Vector Store: {vector_store.index.ntotal} enrolled vectors")
    print(f"=======================================================\n")

    # Warm-up inference engine with dummy image to avoid cold-start latency on first live capture
    try:
        dummy_canvas = np.zeros((320, 320, 3), dtype=np.uint8)
        pipeline.process_image(dummy_canvas)
        print("[+] Neural pipeline warm-up inference completed.")
    except Exception as warmup_err:
        print(f"[*] Note: Pipeline warm-up passed ({warmup_err})")

    yield

    # Graceful Shutdown
    print("\n[*] Initiating graceful shutdown of VisOra Neural Engine...")
    try:
        # 1. Flush and persist FAISS index to disk
        vector_store.save()
        print("  [+] FAISS vector index persisted to disk.")

        # 2. Shutdown APScheduler if running
        if hasattr(schedule_manager, "scheduler") and schedule_manager.scheduler.running:
            schedule_manager.scheduler.shutdown(wait=False)
            print("  [+] APScheduler background threads stopped.")

        # 3. Garbage collection
        gc.collect()
        print("  [+] Memory buffers cleared.")
    except Exception as shut_err:
        print(f"  [!] Shutdown cleanup warning: {shut_err}")
    print("[+] VisOra Neural Engine shutdown complete.\n")

app = FastAPI(
    title=config.APP_NAME,
    version=config.VERSION,
    description="Patent-published Neural Identity Engine featuring InsightFace (RetinaFace + ArcFace) 512D embeddings, rPPG liveness, and sub-millisecond FAISS vector search.",
    lifespan=lifespan
)

# Dynamic CORS Configuration
configured_origins = os.getenv("ALLOWED_ORIGINS", "").split(",")
allowed_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:4173",
    "http://localhost:6446",
    "http://127.0.0.1:6446",
    "http://localhost:5000",
    "http://localhost:3000",
] + [o.strip() for o in configured_origins if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=r"https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)

@app.get("/")
def root():
    return {
        "engine": config.APP_NAME,
        "version": config.VERSION,
        "patent": config.PATENT_REF,
        "status": "ONLINE",
        "docs": "/docs",
        "health": "/health",
        "enrolled_vectors": vector_store.index.ntotal
    }

@app.get("/health")
def root_health():
    """Standard container health check probe."""
    stats = vector_store.get_stats()
    return {
        "status": "healthy",
        "engine": config.APP_NAME,
        "version": config.VERSION,
        "patent": config.PATENT_REF,
        "model": config.MODEL_NAME,
        "providers": config.EXECUTION_PROVIDERS,
        "active_sessions": len(session_manager.sessions),
        "vector_store": stats
    }

@app.get("/ready")
def readiness_probe():
    """Kubernetes / Docker readiness probe."""
    if pipeline.is_ready() and vector_store.index is not None:
        return {"status": "READY"}
    return JSONResponse(status_code=503, content={"status": "INITIALIZING"})

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Production structured JSON exception handler."""
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "error": "InternalEngineError",
            "message": str(exc),
            "path": request.url.path
        }
    )

if __name__ == "__main__":
    uvicorn.run(
        app,
        host=config.HOST,
        port=config.PORT,
        reload=False,
        access_log=True
    )
