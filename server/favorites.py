import os
import json
import threading
from datetime import datetime
from typing import Dict, Any, List

DATA_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".cache", "favorites.json"))

class FavoritesManager:
    """Thread-safe manager for book favorites stored non-destructively in .cache/favorites.json."""

    def __init__(self, data_path: str = DATA_PATH):
        self.data_path = data_path
        os.makedirs(os.path.dirname(self.data_path), exist_ok=True)
        self._lock = threading.RLock()
        self._data = self._load()

    def _load(self) -> Dict[str, Any]:
        if os.path.exists(self.data_path):
            try:
                with open(self.data_path, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception as e:
                print(f"Error loading favorites: {e}")
        return {}

    def _save(self):
        try:
            with open(self.data_path, "w", encoding="utf-8") as f:
                json.dump(self._data, f, indent=2, ensure_ascii=False)
        except Exception as e:
            print(f"Error saving favorites: {e}")

    def is_favorite(self, book_id: str) -> bool:
        with self._lock:
            return book_id in self._data

    def get_favorite_ids(self) -> List[str]:
        with self._lock:
            # Sort by created_at descending (most recently favorited first)
            items = sorted(
                self._data.values(), 
                key=lambda x: x.get("created_at", ""), 
                reverse=True
            )
            return [item["book_id"] for item in items]

    def toggle_favorite(self, book_id: str) -> bool:
        with self._lock:
            if book_id in self._data:
                del self._data[book_id]
                self._save()
                return False
            else:
                self._data[book_id] = {
                    "book_id": book_id,
                    "created_at": datetime.now().isoformat()
                }
                self._save()
                return True

    def set_favorite(self, book_id: str, is_fav: bool) -> bool:
        with self._lock:
            if is_fav:
                if book_id not in self._data:
                    self._data[book_id] = {
                        "book_id": book_id,
                        "created_at": datetime.now().isoformat()
                    }
                    self._save()
                return True
            else:
                if book_id in self._data:
                    del self._data[book_id]
                    self._save()
                return False
