import json
import threading
from typing import List, Dict, Optional, Tuple
from pathlib import Path
import faiss
import numpy as np
from engine.core.config import config

class VectorStore:
    """
    Sub-millisecond Vector Storage and Similarity Engine backed by FAISS (IndexFlatIP).
    Supports exact Cosine Similarity search over L2-normalized 512D ArcFace embeddings.
    Thread-safe persistence to disk with synchronized metadata tracking.
    """

    def __init__(self):
        self.lock = threading.Lock()
        self.dim = config.EMBEDDING_DIM
        self.index_path = config.INDEX_PATH
        self.metadata_path = config.METADATA_PATH

        self.index: faiss.IndexFlatIP = None
        self.metadata: List[Dict] = []
        self._load_or_initialize()

    def _load_or_initialize(self):
        with self.lock:
            if self.index_path.exists() and self.metadata_path.exists():
                try:
                    print(f"[*] Loading FAISS index from {self.index_path}...")
                    self.index = faiss.read_index(str(self.index_path))
                    with open(self.metadata_path, "r", encoding="utf-8") as f:
                        self.metadata = json.load(f)
                    print(f"[+] Loaded FAISS index with {self.index.ntotal} vectors and {len(self.metadata)} metadata records.")
                    return
                except Exception as e:
                    print(f"[!] Error loading existing index ({e}), initializing fresh index.")

            # Fresh Index
            self.index = faiss.IndexFlatIP(self.dim)
            self.metadata = []
            print(f"[+] Initialized fresh FAISS IndexFlatIP (dim={self.dim}).")

    def save(self):
        """Persist FAISS binary index and JSON metadata to disk."""
        with self.lock:
            faiss.write_index(self.index, str(self.index_path))
            with open(self.metadata_path, "w", encoding="utf-8") as f:
                json.dump(self.metadata, f, indent=2)
            print(f"[+] Persisted FAISS index ({self.index.ntotal} vectors) to {self.index_path}")

    def add_or_update_student(
        self,
        student_id: str,
        rollno: str,
        embedding: np.ndarray,
        extra_meta: Optional[Dict] = None
    ) -> Dict:
        """
        Enrolls or updates a student face vector.
        If the student is already registered, replaces their embedding.
        """
        if embedding.ndim == 1:
            embedding = embedding.reshape(1, -1)

        # L2-normalize for exact cosine similarity
        norm = np.linalg.norm(embedding, axis=1, keepdims=True)
        norm[norm == 0] = 1.0
        normalized_emb = (embedding / norm).astype(np.float32)

        meta_entry = {
            "student_id": str(student_id),
            "rollno": str(rollno).strip().toUpperCase() if hasattr(str(rollno), "toUpperCase") else str(rollno).strip().upper(),
            "name": extra_meta.get("name", "") if extra_meta else "",
            "branch": extra_meta.get("branch", "") if extra_meta else "",
            "year": extra_meta.get("year", None) if extra_meta else None,
            "section": extra_meta.get("section", "") if extra_meta else "",
            "enrolled_at": extra_meta.get("enrolled_at", "") if extra_meta else ""
        }

        with self.lock:
            # Check if student already exists in metadata
            existing_idx = next(
                (i for i, m in enumerate(self.metadata) if m.get("student_id") == str(student_id) or m.get("rollno") == meta_entry["rollno"]),
                None
            )

            if existing_idx is not None:
                # Need to rebuild index to update
                vectors = []
                for i in range(self.index.ntotal):
                    if i != existing_idx:
                        v = self.index.reconstruct(i)
                        vectors.append(v)
                
                # Create fresh index and re-add remaining + new
                self.metadata.pop(existing_idx)
                new_index = faiss.IndexFlatIP(self.dim)
                if len(vectors) > 0:
                    v_matrix = np.vstack(vectors).astype(np.float32)
                    new_index.add(v_matrix)
                
                new_index.add(normalized_emb)
                self.metadata.append(meta_entry)
                self.index = new_index
            else:
                self.index.add(normalized_emb)
                self.metadata.append(meta_entry)

        self.save()
        return meta_entry

    def search_face(
        self,
        query_embedding: np.ndarray,
        top_k: int = 1,
        threshold: Optional[float] = None,
        filter_criteria: Optional[Dict] = None,
        verbose: bool = True
    ) -> Optional[Dict]:
        """
        Sub-millisecond identification of a single face embedding.
        Returns the top matching student if similarity >= threshold, else Unknown.
        """
        if threshold is None:
            threshold = config.COSINE_THRESHOLD

        if self.index.ntotal == 0 or len(self.metadata) == 0:
            return {
                "identified": False,
                "similarity": 0.0,
                "student_id": None,
                "rollno": None,
                "name": "Unknown",
                "message": "Vector store is empty. No students enrolled yet."
            }

        if query_embedding.ndim == 1:
            query_embedding = query_embedding.reshape(1, -1)

        norm = np.linalg.norm(query_embedding, axis=1, keepdims=True)
        norm[norm == 0] = 1.0
        normalized_q = (query_embedding / norm).astype(np.float32)

        # FAISS search
        k = min(max(top_k, 5), self.index.ntotal)
        with self.lock:
            distances, indices = self.index.search(normalized_q, k)

        for sim, idx in zip(distances[0], indices[0]):
            if idx < 0 or idx >= len(self.metadata):
                continue
            meta = self.metadata[idx]

            # Optional departmental filtering (e.g., class timetable branch/section filter)
            if filter_criteria:
                if "branch" in filter_criteria and filter_criteria["branch"]:
                    if str(meta.get("branch", "")).strip().upper() != str(filter_criteria["branch"]).strip().upper():
                        continue
                if "section" in filter_criteria and filter_criteria["section"]:
                    if str(meta.get("section", "")).strip().upper() != str(filter_criteria["section"]).strip().upper():
                        continue
                if "year" in filter_criteria and filter_criteria["year"]:
                    try:
                        if int(meta.get("year", 0)) != int(filter_criteria["year"]):
                            continue
                    except (ValueError, TypeError):
                        pass

            similarity_score = float(sim)
            is_match = similarity_score >= threshold
            if verbose:
                print(f"[*] FAISS Search -> Top: {meta.get('rollno')} ({meta.get('name')}) | sim={similarity_score:.4f} | threshold={threshold} | identified={is_match}")

            if is_match:
                return {
                    "identified": True,
                    "similarity": round(similarity_score, 4),
                    "student_id": meta.get("student_id"),
                    "rollno": meta.get("rollno"),
                    "name": meta.get("name"),
                    "branch": meta.get("branch"),
                    "year": meta.get("year"),
                    "section": meta.get("section")
                }
            else:
                # Top match below threshold
                return {
                    "identified": False,
                    "similarity": round(similarity_score, 4),
                    "student_id": None,
                    "rollno": None,
                    "name": "Unknown",
                    "candidate_rollno": meta.get("rollno"),
                    "candidate_name": meta.get("name"),
                    "candidate_similarity": round(similarity_score, 4)
                }

        return {
            "identified": False,
            "similarity": 0.0,
            "student_id": None,
            "rollno": None,
            "name": "Unknown"
        }

    def remove_student(self, student_id: str) -> bool:
        """Removes a student vector from the index and saves changes."""
        with self.lock:
            target_idx = next((i for i, m in enumerate(self.metadata) if m.get("student_id") == str(student_id)), None)
            if target_idx is None:
                return False

            vectors = []
            for i in range(self.index.ntotal):
                if i != target_idx:
                    vectors.append(self.index.reconstruct(i))

            self.metadata.pop(target_idx)
            new_index = faiss.IndexFlatIP(self.dim)
            if len(vectors) > 0:
                v_matrix = np.vstack(vectors).astype(np.float32)
                new_index.add(v_matrix)
            self.index = new_index

        self.save()
        return True

    def get_stats(self) -> Dict:
        """Returns statistics about the current vector index."""
        with self.lock:
            return {
                "total_enrolled": self.index.ntotal if self.index else 0,
                "dimension": self.dim,
                "index_path": str(self.index_path),
                "is_empty": self.index.ntotal == 0 if self.index else True
            }

vector_store = VectorStore()
