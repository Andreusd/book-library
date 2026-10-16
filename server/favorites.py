import os
import threading
from typing import Dict, Any, List, Optional
from .database import get_db, Database

CACHE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".cache"))
DATA_PATH = os.path.join(CACHE_DIR, "library.db")

class FavoritesManager:
    """Thread-safe manager for book favorites stored in SQLite library.db."""

    def __init__(self, data_path: str = DATA_PATH, user_slug: str = "default", db: Optional[Database] = None):
        self.data_path = data_path
        self.user_slug = user_slug
        self.db = db or get_db(data_path)
        self._lock = threading.RLock()

    def is_favorite(self, book_id: str) -> bool:
        with self._lock:
            return self.db.is_favorite(self.user_slug, book_id)

    def get_favorite_ids(self) -> List[str]:
        with self._lock:
            return self.db.get_favorite_ids(self.user_slug)

    def toggle_favorite(self, book_id: str) -> bool:
        with self._lock:
            return self.db.toggle_favorite(self.user_slug, book_id)

    def set_favorite(self, book_id: str, is_fav: bool) -> bool:
        with self._lock:
            return self.db.set_favorite(self.user_slug, book_id, is_fav)
