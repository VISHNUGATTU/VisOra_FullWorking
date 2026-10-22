import sys
import numpy as np
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from engine.core.vector_store import vector_store

def generate_deterministic_unit_embedding(seed_str: str, dim: int = 512) -> np.ndarray:
    """Generates a deterministic 512D unit vector based on a seed string."""
    seed_val = abs(hash(seed_str)) % (2**32)
    rng = np.random.RandomState(seed_val)
    vec = rng.randn(dim).astype(np.float32)
    norm = np.linalg.norm(vec)
    if norm > 0:
        vec = vec / norm
    return vec

def seed_faiss_vectors():
    print("\n" + "="*70)
    print("  VISORA FAISS VECTOR STORE SCALING SEEDER")
    print("  Enrolling 100+ 512D Biometric Embeddings for Benchmark Scale")
    print("  Patent App Reference: 202641036876 (Form 2, The Patents Act 1970)")
    print("="*70)

    # Cohorts matching the MongoDB seeder
    cohorts = [
        {"branch": "CSE-DS", "year": 3, "section": "B", "count": 40, "roll_prefix": "23071A67"},
        {"branch": "CSE-DS", "year": 3, "section": "A", "count": 30, "roll_prefix": "23071A67A"},
        {"branch": "AI&DS", "year": 2, "section": "A", "count": 30, "roll_prefix": "24071A54"},
        {"branch": "CSE-CyS", "year": 4, "section": "A", "count": 25, "roll_prefix": "21071A62"}
    ]

    enrolled = 0
    # Special students (Inventors)
    special = [
        {"rollno": "23071A6788", "name": "G. Vishnu Phani", "branch": "CSE-DS", "year": 3, "section": "B"},
        {"rollno": "23071A6789", "name": "Y. Gayathri Karthikeya", "branch": "CSE-DS", "year": 3, "section": "B"}
    ]

    for sp in special:
        emb = generate_deterministic_unit_embedding(sp["rollno"])
        vector_store.add_or_update_student(
            student_id=f"ST_{sp['rollno']}",
            rollno=sp["rollno"],
            embedding=emb,
            extra_meta={
                "name": sp["name"],
                "branch": sp["branch"],
                "year": sp["year"],
                "section": sp["section"]
            }
        )
        enrolled += 1

    for cohort in cohorts:
        for i in range(1, cohort["count"] + 1):
            pad = f"0{i}" if i < 10 else f"{i}"
            rollno = f"{cohort['roll_prefix']}{pad}"
            name = f"Student {rollno}"
            emb = generate_deterministic_unit_embedding(rollno)

            vector_store.add_or_update_student(
                student_id=f"ST_{rollno}",
                rollno=rollno,
                embedding=emb,
                extra_meta={
                    "name": name,
                    "branch": cohort["branch"],
                    "year": cohort["year"],
                    "section": cohort["section"]
                }
            )
            enrolled += 1

    stats = vector_store.get_stats()
    print(f"\n[+] FAISS Vector Seeding Complete!")
    print(f"    - Total Enrolled Vectors in FAISS: {stats['total_enrolled']}")
    print(f"    - Vector Dimensionality: {stats['dimension']}D (ArcFace Unit Embeddings)")
    print(f"    - Index File: {stats['index_path']}")
    print("="*70 + "\n")
    return stats

if __name__ == "__main__":
    seed_faiss_vectors()
