"""
VisOra Neural Identity Engine - Build-time Model Preparation Script
Ensures Buffalo_s lightweight models (det_500m & w600k_mbf, ~16MB)
are present in engine/models/buffalo_s before runtime to eliminate
runtime network latency and prevent 512MB RAM OOM on cloud free tiers.
"""

import os
import sys
import zipfile
import urllib.request
from pathlib import Path

# Paths
ENGINE_DIR = Path(__file__).resolve().parent.parent
MODELS_DIR = ENGINE_DIR / "models" / "buffalo_s"
REQUIRED_MODELS = ["det_500m.onnx", "w600k_mbf.onnx"]

BUFFALO_S_URL = "https://github.com/deepinsight/insightface/releases/download/model-zoo/buffalo_s.zip"

def verify_models() -> bool:
    """Check if all required models exist and are valid (>1MB)."""
    if not MODELS_DIR.exists():
        return False
    for model_name in REQUIRED_MODELS:
        model_path = MODELS_DIR / model_name
        if not model_path.exists() or model_path.stat().st_size < 1_000_000:
            return False
    return True

def prepare():
    print(f"[*] Verifying VisOra neural models in: {MODELS_DIR}...")
    MODELS_DIR.mkdir(parents=True, exist_ok=True)

    if verify_models():
        print("[+] All required neural models are present and verified:")
        for m in MODELS_DIR.glob("*.onnx"):
            size_mb = m.stat().st_size / (1024 * 1024)
            print(f"    - {m.name} ({size_mb:.2f} MB)")
        print("[+] Model preparation completed. Runtime will boot instantly with ~123MB RAM.")
        return

    print("[!] Models not detected or incomplete. Downloading buffalo_s package during build phase...")
    zip_path = ENGINE_DIR / "buffalo_s_temp.zip"

    try:
        def reporthook(block_num, block_size, total_size):
            if total_size > 0:
                percent = block_num * block_size / total_size * 100
                if block_num % 500 == 0 or percent >= 100:
                    print(f"    Downloading: {min(percent, 100.0):.1f}%")

        print(f"[*] Fetching from {BUFFALO_S_URL}...")
        urllib.request.urlretrieve(BUFFALO_S_URL, zip_path, reporthook=reporthook)
        print("[+] Download complete. Extracting only lightweight detection & recognition models...")

        with zipfile.ZipFile(zip_path, 'r') as zf:
            for item in zf.namelist():
                # Extract only det_500m (2.5MB), w600k_mbf (13MB), and genderage (1.3MB)
                # Discard heavy 1k3d68.onnx (137MB)
                basename = Path(item).name
                if basename in ["det_500m.onnx", "w600k_mbf.onnx", "genderage.onnx"]:
                    extracted_path = MODELS_DIR / basename
                    with zf.open(item) as src, open(extracted_path, "wb") as dst:
                        dst.write(src.read())
                    print(f"    [+] Extracted: {basename} ({extracted_path.stat().st_size / (1024*1024):.2f} MB)")

        print("[+] Models successfully installed to disk.")
    finally:
        if zip_path.exists():
            zip_path.unlink()
            print("[+] Removed temporary archive.")

    if not verify_models():
        print("[ERROR] Failed to verify models after extraction!")
        sys.exit(1)

    print("[+] Model preparation complete.")

if __name__ == "__main__":
    prepare()
