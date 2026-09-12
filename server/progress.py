import os
import json
import threading
from datetime import datetime
from typing import Dict, Any, Optional, List

DATA_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".cache", "progress.json"))

class ProgressTracker:
    def __init__(self, data_path: str = DATA_PATH):
        self.data_path = data_path
        os.makedirs(os.path.dirname(self.data_path), exist_ok=True)
        self._lock = threading.RLock()
        self._data = self._load()

    def _load(self) -> Dict[str, Any]:
        if os.path.exists(self.data_path):
            try:
                with open(self.data_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    return {k: v for k, v in data.items() if v.get("page", 1) > 1 or v.get("status") == "completed"}
            except Exception as e:
                print(f"Error loading progress file: {e}")
        return {}

    def _save(self):
        try:
            with open(self.data_path, "w", encoding="utf-8") as f:
                json.dump(self._data, f, indent=2, ensure_ascii=False)
        except Exception as e:
            print(f"Error saving progress file: {e}")

    def get_progress(self, book_id: str) -> Optional[Dict[str, Any]]:
        with self._lock:
            return self._data.get(book_id)

    def set_progress(self, book_id: str, page: int, total_pages: int) -> Dict[str, Any]:
        with self._lock:
            # A book is only in progress if read beyond page 1 (cover)
            if page <= 1:
                if book_id in self._data:
                    del self._data[book_id]
                    self._save()
                return {
                    "page": 1,
                    "total_pages": total_pages,
                    "percent": 0.0,
                    "status": "not_started"
                }

            pct = round((page / max(total_pages, 1)) * 100, 1)
            record = {
                "page": page,
                "total_pages": total_pages,
                "percent": pct,
                "updated_at": datetime.now().isoformat()
            }
            self._data[book_id] = record
            self._save()
            return record

    def reset_progress(self, book_id: str):
        """Removes progress record completely for a book."""
        with self._lock:
            if book_id in self._data:
                del self._data[book_id]
                self._save()

    def mark_completed(self, book_id: str, total_pages: int = 1) -> Dict[str, Any]:
        """Marks a book as 100% completed."""
        with self._lock:
            record = {
                "page": total_pages,
                "total_pages": total_pages,
                "percent": 100.0,
                "status": "completed",
                "updated_at": datetime.now().isoformat()
            }
            self._data[book_id] = record
            self._save()
            return record

    def get_all(self) -> Dict[str, Any]:
        with self._lock:
            return dict(self._data)

    def get_recent(self, limit: int = 8, include_completed: bool = False) -> List[Dict[str, Any]]:
        """Returns list of book_ids sorted by most recently read, excluding completed books and books on page 1."""
        with self._lock:
            items = []
            for b_id, info in self._data.items():
                if info.get("page", 1) <= 1:
                    continue
                if not include_completed and info.get("percent", 0) >= 100:
                    continue
                items.append({
                    "book_id": b_id,
                    **info
                })
            items.sort(key=lambda x: x.get("updated_at", ""), reverse=True)
            return items[:limit]
