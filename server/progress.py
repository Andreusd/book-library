import os
import json
import threading
from datetime import datetime
from typing import Dict, Any, Optional, List

DATA_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".cache", "progress.json"))

class ProgressTracker:
    def __init__(self, data_path: str = DATA_PATH):
        self.data_path = data_path
        dir_name = os.path.dirname(self.data_path)
        if dir_name:
            os.makedirs(dir_name, exist_ok=True)
        self._lock = threading.RLock()
        self._data = self._load()

    def _load(self) -> Dict[str, Any]:
        if os.path.exists(self.data_path):
            try:
                with open(self.data_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    return {k: v for k, v in data.items() if isinstance(v, dict)}
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

    def set_progress(self, book_id: str, page: int, total_pages: int, zoom: Optional[float] = None, invert_colors: Optional[bool] = None) -> Dict[str, Any]:
        with self._lock:
            existing = self._data.get(book_id, {})
            current_zoom = round(zoom, 2) if zoom is not None else existing.get("zoom", 1.2)
            current_invert = bool(invert_colors) if invert_colors is not None else existing.get("invert_colors", False)

            # A book is only in progress if read beyond page 1 (cover)
            if page <= 1:
                record = {
                    "page": 1,
                    "total_pages": total_pages,
                    "percent": 0.0,
                    "zoom": current_zoom,
                    "invert_colors": current_invert,
                    "status": "not_started"
                }
                self._data[book_id] = record
                self._save()
                return record

            pct = round((page / max(total_pages, 1)) * 100, 1)
            record = {
                "page": page,
                "total_pages": total_pages,
                "percent": pct,
                "zoom": current_zoom,
                "invert_colors": current_invert,
                "updated_at": datetime.now().isoformat()
            }
            self._data[book_id] = record
            self._save()
            return record

    def set_zoom(self, book_id: str, zoom: float) -> Dict[str, Any]:
        """Saves preferred zoom for a book, preserving reading progress and night mode."""
        with self._lock:
            existing = self._data.get(book_id, {
                "page": 1,
                "total_pages": 1,
                "percent": 0.0,
                "status": "not_started"
            })
            existing["zoom"] = round(zoom, 2)
            self._data[book_id] = existing
            self._save()
            return existing

    def set_night_mode(self, book_id: str, invert_colors: bool) -> Dict[str, Any]:
        """Saves preferred night reading mode (invert colors) for a book, preserving reading progress and zoom."""
        with self._lock:
            existing = self._data.get(book_id, {
                "page": 1,
                "total_pages": 1,
                "percent": 0.0,
                "status": "not_started"
            })
            existing["invert_colors"] = bool(invert_colors)
            self._data[book_id] = existing
            self._save()
            return existing

    def reset_progress(self, book_id: str) -> Dict[str, Any]:
        """Resets progress to page 1 but preserves preferred zoom, night mode, and total_pages."""
        with self._lock:
            existing = self._data.get(book_id, {})
            zoom = existing.get("zoom", 1.2)
            invert = existing.get("invert_colors", False)
            total_pages = existing.get("total_pages", 1)
            record = {
                "page": 1,
                "total_pages": total_pages,
                "percent": 0.0,
                "zoom": zoom,
                "invert_colors": invert,
                "status": "not_started"
            }
            self._data[book_id] = record
            self._save()
            return record

    def mark_completed(self, book_id: str, total_pages: int = 1) -> Dict[str, Any]:
        """Marks a book as 100% completed, preserving zoom and night mode."""
        with self._lock:
            existing = self._data.get(book_id, {})
            zoom = existing.get("zoom", 1.2)
            invert = existing.get("invert_colors", False)
            record = {
                "page": total_pages,
                "total_pages": total_pages,
                "percent": 100.0,
                "zoom": zoom,
                "invert_colors": invert,
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
