import os
import threading
import uuid
from typing import Dict, Any, Optional, List
from .database import get_db, Database

CACHE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".cache"))
CONFIG_FILE = os.path.join(CACHE_DIR, "library.db")

class ConfigManager:
    """Manages multi-library application settings persisted in SQLite library.db."""

    def __init__(self, config_path: str = CONFIG_FILE, db: Optional[Database] = None):
        self.config_path = config_path
        self.db = db or get_db(config_path)
        self._lock = threading.RLock()
        self._runtime_active_id = ""

    def get_libraries(self) -> List[Dict[str, Any]]:
        with self._lock:
            return self.db.get_libraries()

    def get_active_library_id(self) -> str:
        with self._lock:
            return getattr(self, "_runtime_active_id", "") or ""

    def get_active_library(self) -> Optional[Dict[str, Any]]:
        with self._lock:
            active_id = self.get_active_library_id()
            if not active_id:
                return None
            return self.db.get_library(active_id)

    def get_library_by_id(self, library_id: str) -> Optional[Dict[str, Any]]:
        with self._lock:
            return self.db.get_library(library_id)

    def set_active_library(self, library_id: str) -> bool:
        with self._lock:
            lib = self.db.get_library(library_id)
            if lib:
                self._runtime_active_id = library_id
                return True
            return False

    def add_library(self, name: str, path: str, set_active: bool = False) -> Dict[str, Any]:
        with self._lock:
            clean_path = os.path.abspath(os.path.expanduser(path.strip()))
            clean_name = name.strip() or os.path.basename(clean_path.rstrip("/\\")) or "Books"
            libraries = self.db.get_libraries()
            lib_id = "default" if not libraries else f"lib_{uuid.uuid4().hex[:8]}"
            new_lib = self.db.add_library(lib_id, clean_name, clean_path)
            if set_active:
                self._runtime_active_id = lib_id
            return new_lib

    def update_library(self, library_id: str, name: Optional[str] = None, path: Optional[str] = None) -> Optional[Dict[str, Any]]:
        with self._lock:
            clean_path = os.path.abspath(os.path.expanduser(path.strip())) if (path and path.strip()) else None
            return self.db.update_library(library_id, name=name, path=clean_path)

    def remove_library(self, library_id: str) -> bool:
        with self._lock:
            success = self.db.delete_library(library_id)
            if success and getattr(self, "_runtime_active_id", "") == library_id:
                self._runtime_active_id = ""
            return success

    def get_library_path(self) -> str:
        with self._lock:
            active = self.get_active_library()
            if active and active.get("path"):
                return active["path"]
            libs = self.get_libraries()
            return libs[0]["path"] if libs else ""

    def set_library_path(self, path: str) -> str:
        with self._lock:
            clean_path = path.strip()
            if clean_path:
                clean_path = os.path.abspath(os.path.expanduser(clean_path))

            active = self.get_active_library()
            if active:
                self.update_library(active["id"], path=clean_path)
            else:
                self.add_library("Default Library", clean_path, set_active=True)

            return clean_path

    def get_show_file_extension(self) -> bool:
        """Returns whether file extension badges (EPUB, PDF) should be shown."""
        return bool(self.db.get_setting("show_file_extension", True))

    def set_show_file_extension(self, show: bool) -> bool:
        """Saves whether file extension badges should be shown."""
        return bool(self.db.set_setting("show_file_extension", bool(show)))

    def get_book_animations(self) -> bool:
        """Returns whether book opening and closing zoom animations are enabled."""
        return bool(self.db.get_setting("book_animations", True))

    def set_book_animations(self, enabled: bool) -> bool:
        """Saves whether book opening and closing zoom animations are enabled."""
        return bool(self.db.set_setting("book_animations", bool(enabled)))

    @staticmethod
    def validate_path(path: str) -> Dict[str, Any]:
        """Validates a library path and counts available folders and PDF books."""
        clean = (path or "").strip()
        if not clean:
            return {
                "valid": False,
                "exists": False,
                "is_dir": False,
                "shelf_count": 0,
                "folder_count": 0,
                "book_count": 0,
                "error": "path_empty",
                "normalized_path": ""
            }

        norm_path = os.path.abspath(os.path.expanduser(clean))
        if not os.path.exists(norm_path):
            return {
                "valid": False,
                "exists": False,
                "is_dir": False,
                "shelf_count": 0,
                "folder_count": 0,
                "book_count": 0,
                "error": "path_not_found",
                "normalized_path": norm_path
            }

        if not os.path.isdir(norm_path):
            return {
                "valid": False,
                "exists": True,
                "is_dir": False,
                "shelf_count": 0,
                "folder_count": 0,
                "book_count": 0,
                "error": "not_a_directory",
                "normalized_path": norm_path
            }

        try:
            entries = sorted(os.listdir(norm_path))
        except Exception as e:
            return {
                "valid": False,
                "exists": True,
                "is_dir": True,
                "shelf_count": 0,
                "folder_count": 0,
                "book_count": 0,
                "error": str(e),
                "normalized_path": norm_path
            }

        folder_count = 0
        book_count = 0

        # Check for direct books (.pdf and .epub) in root
        root_books = [f for f in entries if f.lower().endswith(('.pdf', '.epub')) and os.path.isfile(os.path.join(norm_path, f))]
        if root_books:
            folder_count += 1
            book_count += len(root_books)

        # Check subdirectories
        for entry in entries:
            sub = os.path.join(norm_path, entry)
            if os.path.isdir(sub):
                try:
                    sub_books = sum(1 for f in os.listdir(sub) if f.lower().endswith(('.pdf', '.epub')))
                    if sub_books > 0:
                        folder_count += 1
                        book_count += sub_books
                except Exception:
                    pass

        return {
            "valid": True,
            "exists": True,
            "is_dir": True,
            "shelf_count": folder_count,
            "folder_count": folder_count,
            "book_count": book_count,
            "error": None if book_count > 0 else "no_pdfs_found",
            "normalized_path": norm_path
        }
