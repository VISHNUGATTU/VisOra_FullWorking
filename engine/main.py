import sys
from pathlib import Path
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

# Ensure repository root is on sys.path
ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from engine.core.config import config
from engine.core.pipeline import pipeline
from engine.core.vector_store import vector_store
from engine.api.routes import router as api_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Ensure pipeline and vector store are warm
    print(f"\n=======================================================")
    print(f"  {config.APP_NAME} v{config.VERSION}")
    print(f"  {config.PATENT_REF}")
    print(f"  Model: {config.MODEL_NAME} | Dim: {config.EMBEDDING_DIM}D")
    print(f"  Vector Store: {vector_store.index.ntotal} enrolled vectors")
    print(f"=======================================================\n")
    yield
    print("[*] Shutting down VisOra Neural Engine...")

app = FastAPI(
    title=config.APP_NAME,
    version=config.VERSION,
    description="Patent-published Neural Identity Engine featuring InsightFace (RetinaFace + ArcFace) 512D embeddings and sub-millisecond FAISS vector search.",
    lifespan=lifespan
)

# CORS Middleware (allows React frontend & Node backend)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5000",
        "http://localhost:3000"
    ],
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
        "docs": "/docs",
        "health": "/api/v1/health"
    }

if __name__ == "__main__":
    uvicorn.run(
        app,
        host=config.HOST,
        port=config.PORT,
        reload=False
    )
