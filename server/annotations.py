import os
import threading
from typing import List, Dict, Any, Optional
from .database import get_db, Database

CACHE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".cache"))
ANNOTATIONS_FILE = os.path.join(CACHE_DIR, "library.db")

class AnnotationsManager:
    """Manages reading highlights and comments per book, persisted in SQLite library.db."""

    def __init__(self, storage_path: str = ANNOTATIONS_FILE, user_slug: str = "default", db: Optional[Database] = None):
        self.storage_path = storage_path
        self.user_slug = user_slug
        self.db = db or get_db(storage_path)
        self._lock = threading.RLock()

    def get_annotations(self, book_id: str) -> List[Dict[str, Any]]:
        """Returns all annotations for a specific book, sorted by page."""
        with self._lock:
            return self.db.get_annotations(self.user_slug, book_id)

    def add_annotation(self, book_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """Adds a new highlight or comment for a book."""
        with self._lock:
            return self.db.add_annotation(self.user_slug, book_id, data)

    def update_annotation(self, book_id: str, annotation_id: str, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Updates an existing annotation's comment or color."""
        with self._lock:
            return self.db.update_annotation(self.user_slug, book_id, annotation_id, data)

    def delete_annotation(self, book_id: str, annotation_id: str) -> bool:
        """Deletes an annotation by ID."""
        with self._lock:
            return self.db.delete_annotation(self.user_slug, book_id, annotation_id)
