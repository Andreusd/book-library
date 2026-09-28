import os
import json
import uuid
import threading
from datetime import datetime
from typing import Dict, Any, List, Optional

DATA_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".cache", "tags.json"))

DEFAULT_TAGS = [
    {"name": "Want to Read", "color": "amber"},
    {"name": "Computer Science", "color": "sky"},
    {"name": "Work", "color": "indigo"},
    {"name": "Classics", "color": "rose"},
]

VALID_COLORS = {"amber", "emerald", "sky", "purple", "rose", "indigo", "orange", "slate"}

class TagsManager:
    """Thread-safe manager for virtual tags and custom book collections stored in .cache/tags.json."""

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
                    if isinstance(data, dict) and "tags" in data and "book_tags" in data:
                        return data
            except Exception as e:
                print(f"Error loading tags: {e}")

        # Initialize with default tags
        initial = {
            "tags": {},
            "book_tags": {}
        }
        for dt in DEFAULT_TAGS:
            t_id = f"tag_{uuid.uuid4().hex[:8]}"
            initial["tags"][t_id] = {
                "id": t_id,
                "name": dt["name"],
                "color": dt["color"],
                "created_at": datetime.now().isoformat()
            }
        
        try:
            with open(self.data_path, "w", encoding="utf-8") as f:
                json.dump(initial, f, indent=2, ensure_ascii=False)
        except Exception as e:
            print(f"Error saving initial tags: {e}")

        return initial

    def _save(self):
        try:
            with open(self.data_path, "w", encoding="utf-8") as f:
                json.dump(self._data, f, indent=2, ensure_ascii=False)
        except Exception as e:
            print(f"Error saving tags: {e}")

    def get_tags(self, book_ids_in_scope: Optional[set] = None) -> List[Dict[str, Any]]:
        """Returns all tags sorted alphabetically by name, with book counts (scoped to library if provided)."""
        with self._lock:
            tags_list = []
            book_tags = self._data.get("book_tags", {})

            for tag_id, tag in self._data.get("tags", {}).items():
                if book_ids_in_scope is not None:
                    count = sum(
                        1 for b_id, t_ids in book_tags.items()
                        if b_id in book_ids_in_scope and tag_id in t_ids
                    )
                else:
                    count = sum(1 for t_ids in book_tags.values() if tag_id in t_ids)

                tag_copy = dict(tag)
                tag_copy["book_count"] = count
                tags_list.append(tag_copy)

            tags_list.sort(key=lambda x: x["name"].lower())
            return tags_list

    def get_tag(self, tag_id: str) -> Optional[Dict[str, Any]]:
        with self._lock:
            tag = self._data.get("tags", {}).get(tag_id)
            return dict(tag) if tag else None

    def create_tag(self, name: str, color: str = "amber") -> Dict[str, Any]:
        with self._lock:
            clean_name = name.strip()
            if not clean_name:
                raise ValueError("Tag name cannot be empty")
            
            # Check for duplicate name (case-insensitive)
            for existing in self._data.get("tags", {}).values():
                if existing.get("name", "").lower() == clean_name.lower():
                    return dict(existing)

            color_val = color if color in VALID_COLORS else "amber"
            tag_id = f"tag_{uuid.uuid4().hex[:8]}"
            tag = {
                "id": tag_id,
                "name": clean_name,
                "color": color_val,
                "created_at": datetime.now().isoformat()
            }
            self._data.setdefault("tags", {})[tag_id] = tag
            self._save()
            tag_copy = dict(tag)
            tag_copy["book_count"] = 0
            return tag_copy

    def update_tag(self, tag_id: str, name: Optional[str] = None, color: Optional[str] = None) -> Optional[Dict[str, Any]]:
        with self._lock:
            tag = self._data.get("tags", {}).get(tag_id)
            if not tag:
                return None

            if name is not None:
                clean_name = name.strip()
                if clean_name:
                    tag["name"] = clean_name
            if color is not None and color in VALID_COLORS:
                tag["color"] = color

            self._save()
            return dict(tag)

    def delete_tag(self, tag_id: str) -> bool:
        with self._lock:
            tags = self._data.get("tags", {})
            if tag_id not in tags:
                return False

            del tags[tag_id]

            # Remove tag_id from all book_tags
            book_tags = self._data.get("book_tags", {})
            for b_id, t_ids in list(book_tags.items()):
                if tag_id in t_ids:
                    t_ids = [t for t in t_ids if t != tag_id]
                    if t_ids:
                        book_tags[b_id] = t_ids
                    else:
                        del book_tags[b_id]

            self._save()
            return True

    def get_book_tags(self, book_id: str) -> List[Dict[str, Any]]:
        """Returns the list of full tag objects assigned to a book."""
        with self._lock:
            tag_ids = self._data.get("book_tags", {}).get(book_id, [])
            tags_map = self._data.get("tags", {})
            result = []
            for tid in tag_ids:
                if tid in tags_map:
                    result.append(dict(tags_map[tid]))
            result.sort(key=lambda x: x["name"].lower())
            return result

    def get_book_tag_ids(self, book_id: str) -> List[str]:
        with self._lock:
            return list(self._data.get("book_tags", {}).get(book_id, []))

    def set_book_tags(self, book_id: str, tag_ids: List[str]) -> List[Dict[str, Any]]:
        with self._lock:
            valid_ids = [tid for tid in tag_ids if tid in self._data.get("tags", {})]
            # Deduplicate preserving order
            seen = set()
            deduped = []
            for tid in valid_ids:
                if tid not in seen:
                    seen.add(tid)
                    deduped.append(tid)

            book_tags = self._data.setdefault("book_tags", {})
            if deduped:
                book_tags[book_id] = deduped
            elif book_id in book_tags:
                del book_tags[book_id]

            self._save()
            return self.get_book_tags(book_id)

    def toggle_book_tag(self, book_id: str, tag_id: str) -> bool:
        with self._lock:
            if tag_id not in self._data.get("tags", {}):
                return False

            book_tags = self._data.setdefault("book_tags", {})
            current = book_tags.get(book_id, [])
            if tag_id in current:
                current = [t for t in current if t != tag_id]
                if current:
                    book_tags[book_id] = current
                else:
                    del book_tags[book_id]
                self._save()
                return False
            else:
                current = list(current)
                current.append(tag_id)
                book_tags[book_id] = current
                self._save()
                return True

    def get_book_ids_for_tag(self, tag_id: str) -> List[str]:
        with self._lock:
            return [
                b_id for b_id, t_ids in self._data.get("book_tags", {}).items()
                if tag_id in t_ids
            ]
