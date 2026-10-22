import os
from pathlib import Path

# Base Paths
BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
MODELS_DIR = BASE_DIR / "models"
INDEX_DIR = DATA_DIR / "index"
CACHE_DIR = DATA_DIR / "cache"

MODELS_DIR.mkdir(parents=True, exist_ok=True)
INDEX_DIR.mkdir(parents=True, exist_ok=True)
CACHE_DIR.mkdir(parents=True, exist_ok=True)

class Config:
    # Service Information
    APP_NAME: str = "VisOra Neural Identity Engine"
    VERSION: str = "1.0.0"
    PATENT_REF: str = "Indian Patent App No: 202641036876"

    # Directory Paths
    BASE_DIR: Path = BASE_DIR
    DATA_DIR: Path = DATA_DIR
    MODELS_DIR: Path = MODELS_DIR

    # InsightFace & Model Settings
    # 'buffalo_s' provides det_500m (SCRFD/RetinaFace fast) + w600k_mbf (ArcFace 512D)
    MODEL_NAME: str = os.getenv("VISORA_MODEL_NAME", "buffalo_s")
    INSIGHTFACE_ROOT: str = os.getenv("INSIGHTFACE_ROOT", str(BASE_DIR))
    DET_SIZE: tuple = (320, 320)
    EMBEDDING_DIM: int = 512
    EXECUTION_PROVIDERS: list = ["CPUExecutionProvider"]

    # Thresholds
    DETECTION_THRESHOLD: float = float(os.getenv("DETECTION_THRESHOLD", "0.50"))
    # Cosine similarity threshold for ArcFace 512D (>= 0.38 is strong match across webcam lighting variations)
    COSINE_THRESHOLD: float = float(os.getenv("COSINE_THRESHOLD", "0.38"))

    # Vector Storage (FAISS)
    INDEX_PATH: Path = INDEX_DIR / "faiss_index.bin"
    METADATA_PATH: Path = INDEX_DIR / "metadata.json"

    # Server settings
    HOST: str = os.getenv("VISORA_ENGINE_HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", os.getenv("VISORA_ENGINE_PORT", "8000")))

config = Config()
