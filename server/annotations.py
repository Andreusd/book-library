import os
import json
import threading
import uuid
from datetime import datetime
from typing import List, Dict, Any, Optional

CACHE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".cache"))
ANNOTATIONS_FILE = os.path.join(CACHE_DIR, "annotations.json")

class AnnotationsManager:
    """Manages reading highlights and comments per book, persisted in .cache/annotations.json."""

    def __init__(self, storage_path: str = ANNOTATIONS_FILE):
        self.storage_path = storage_path
        self._lock = threading.RLock()
        self._data = self._load()

    def _load(self) -> Dict[str, List[Dict[str, Any]]]:
        if os.path.exists(self.storage_path):
            try:
                with open(self.storage_path, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception as e:
                print(f"Error loading annotations: {e}")
        return {}

    def _save(self):
        os.makedirs(os.path.dirname(self.storage_path), exist_ok=True)
        try:
            with open(self.storage_path, "w", encoding="utf-8") as f:
                json.dump(self._data, f, indent=2, ensure_ascii=False)
        except Exception as e:
            print(f"Error saving annotations: {e}")

    def get_annotations(self, book_id: str) -> List[Dict[str, Any]]:
        """Returns all annotations for a specific book, sorted by page."""
        with self._lock:
            items = list(self._data.get(book_id, []))
            items.sort(key=lambda x: (x.get("page", 1), x.get("created_at", "")))
            return items

    def add_annotation(self, book_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """Adds a new highlight or comment for a book."""
        with self._lock:
            if book_id not in self._data:
                self._data[book_id] = []

            annotation_id = f"ann_{uuid.uuid4().hex[:12]}"
            record = {
                "id": annotation_id,
                "book_id": book_id,
                "page": int(data.get("page", 1)),
                "text": str(data.get("text", "")).strip(),
                "color": str(data.get("color", "yellow")),
                "comment": str(data.get("comment", "")).strip(),
                "rects": list(data.get("rects", [])),
                "created_at": datetime.now().isoformat(),
                "updated_at": datetime.now().isoformat()
            }
            self._data[book_id].append(record)
            self._save()
            return record

    def update_annotation(self, book_id: str, annotation_id: str, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Updates an existing annotation's comment or color."""
        with self._lock:
            if book_id not in self._data:
                return None

            for item in self._data[book_id]:
                if item.get("id") == annotation_id:
                    if "comment" in data:
                        item["comment"] = str(data["comment"]).strip()
                    if "color" in data:
                        item["color"] = str(data["color"])
                    item["updated_at"] = datetime.now().isoformat()
                    self._save()
                    return item
            return None

    def delete_annotation(self, book_id: str, annotation_id: str) -> bool:
        """Deletes an annotation by ID."""
        with self._lock:
            if book_id not in self._data:
                return False

            original_len = len(self._data[book_id])
            self._data[book_id] = [
                item for item in self._data[book_id]
                if item.get("id") != annotation_id
            ]
            if len(self._data[book_id]) < original_len:
                self._save()
                return True
            return False
