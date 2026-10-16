import os
import threading
from typing import Dict, Any, List, Optional
from .database import get_db, Database

CACHE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".cache"))
DATA_PATH = os.path.join(CACHE_DIR, "library.db")

VALID_COLORS = {"amber", "emerald", "sky", "purple", "rose", "indigo", "orange", "slate"}

class TagsManager:
    """Thread-safe manager for virtual tags and custom book collections stored in SQLite library.db."""

    def __init__(self, data_path: str = DATA_PATH, user_slug: str = "default", db: Optional[Database] = None):
        self.data_path = data_path
        self.user_slug = user_slug
        self.db = db or get_db(data_path)
        self._lock = threading.RLock()

    def get_tags(self, library_id: Optional[str] = None, book_ids_in_scope: Optional[set] = None) -> List[Dict[str, Any]]:
        with self._lock:
            return self.db.get_tags(self.user_slug, library_id=library_id, book_ids_in_scope=book_ids_in_scope)

    def get_tag(self, tag_id: str) -> Optional[Dict[str, Any]]:
        with self._lock:
            return self.db.get_tag(self.user_slug, tag_id)

    def create_tag(self, name: str, color: str = "amber", library_id: Optional[str] = None) -> Dict[str, Any]:
        with self._lock:
            color_val = color if color in VALID_COLORS else "amber"
            return self.db.create_tag(self.user_slug, name=name, color=color_val, library_id=library_id)

    def update_tag(self, tag_id: str, name: Optional[str] = None, color: Optional[str] = None) -> Optional[Dict[str, Any]]:
        with self._lock:
            color_val = color if (color and color in VALID_COLORS) else color
            return self.db.update_tag(self.user_slug, tag_id=tag_id, name=name, color=color_val)

    def delete_tag(self, tag_id: str) -> bool:
        with self._lock:
            return self.db.delete_tag(self.user_slug, tag_id)

    def get_book_tags(self, book_id: str) -> List[Dict[str, Any]]:
        with self._lock:
            return self.db.get_book_tags(self.user_slug, book_id)

    def get_book_tag_ids(self, book_id: str) -> List[str]:
        with self._lock:
            return self.db.get_book_tag_ids(self.user_slug, book_id)

    def set_book_tags(self, book_id: str, tag_ids: List[str]) -> List[Dict[str, Any]]:
        with self._lock:
            return self.db.set_book_tags(self.user_slug, book_id, tag_ids)

    def toggle_book_tag(self, book_id: str, tag_id: str) -> bool:
        with self._lock:
            return self.db.toggle_book_tag(self.user_slug, book_id, tag_id)

    def get_book_ids_for_tag(self, tag_id: str) -> List[str]:
        with self._lock:
            return self.db.get_book_ids_for_tag(self.user_slug, tag_id)
