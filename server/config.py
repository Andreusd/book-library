import os
import json
import threading
import uuid
from typing import Dict, Any, Optional, List

CACHE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".cache"))
CONFIG_FILE = os.path.join(CACHE_DIR, "config.json")

class ConfigManager:
    """Manages multi-library application settings persisted in .cache/config.json."""

    def __init__(self, config_path: str = CONFIG_FILE):
        self.config_path = config_path
        self._lock = threading.RLock()
        self._last_mtime = 0.0
        self._config = self._load()
        if os.path.exists(self.config_path):
            try:
                self._last_mtime = os.path.getmtime(self.config_path)
            except Exception:
                pass

    def _reload_if_changed(self):
        try:
            if os.path.exists(self.config_path):
                m = os.path.getmtime(self.config_path)
                if m > self._last_mtime:
                    self._config = self._load()
                    self._last_mtime = m
        except Exception:
            pass

    def _load(self) -> Dict[str, Any]:
        data = {}
        if os.path.exists(self.config_path):
            try:
                with open(self.config_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
            except Exception as e:
                print(f"Error loading config: {e}")
        return self._migrate_and_normalize(data)

    def _migrate_and_normalize(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """Ensures the config has the multi-library structure with automated backward-compatibility."""
        libraries = config.get("libraries")
        if not isinstance(libraries, list):
            libraries = []

        # Check for legacy single library_path
        legacy_path = config.get("library_path", "").strip()
        if not libraries and legacy_path:
            norm_path = os.path.abspath(os.path.expanduser(legacy_path))
            base_name = os.path.basename(norm_path.rstrip("/\\")) or "Default Library"
            libraries.append({
                "id": "default",
                "name": base_name,
                "path": norm_path,
            })
        elif not libraries:
            # Check environment variable and candidate directories
            env_path = os.environ.get("BOOK_LIBRARY_PATH", "").strip()
            candidates = [
                env_path,
                os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "books")),
                os.path.expanduser("~/Books"),
                os.path.expanduser("~/Documents/Books"),
            ]
            for c in candidates:
                if c and os.path.isdir(c):
                    norm_c = os.path.abspath(os.path.expanduser(c))
                    base_name = os.path.basename(norm_c.rstrip("/\\")) or "Default Library"
                    libraries.append({
                        "id": "default",
                        "name": base_name,
                        "path": norm_c,
                    })
                    break

        config["libraries"] = libraries
        active_id = config.get("active_library_id", "")
        valid_ids = [lib["id"] for lib in libraries if isinstance(lib, dict) and "id" in lib]
        if active_id not in valid_ids and valid_ids:
            config["active_library_id"] = valid_ids[0]
        elif not valid_ids:
            config["active_library_id"] = ""

        # Keep legacy library_path synchronized
        active_lib = next((l for l in libraries if l["id"] == config["active_library_id"]), None)
        config["library_path"] = active_lib["path"] if active_lib else ""

        return config

    def _save(self):
        os.makedirs(os.path.dirname(self.config_path), exist_ok=True)
        try:
            with open(self.config_path, "w", encoding="utf-8") as f:
                json.dump(self._config, f, indent=2, ensure_ascii=False)
            if os.path.exists(self.config_path):
                self._last_mtime = os.path.getmtime(self.config_path)
        except Exception as e:
            print(f"Error saving config: {e}")

    def get_libraries(self) -> List[Dict[str, Any]]:
        """Returns list of all configured libraries."""
        with self._lock:
            self._reload_if_changed()
            return [dict(lib) for lib in self._config.get("libraries", [])]

    def get_active_library_id(self) -> str:
        """Returns the ID of the currently active library."""
        with self._lock:
            self._reload_if_changed()
            return self._config.get("active_library_id", "")

    def get_active_library(self) -> Optional[Dict[str, Any]]:
        """Returns metadata for the currently active library."""
        with self._lock:
            self._reload_if_changed()
            active_id = self.get_active_library_id()
            for lib in self._config.get("libraries", []):
                if lib.get("id") == active_id:
                    return dict(lib)
            return None

    def get_library_by_id(self, library_id: str) -> Optional[Dict[str, Any]]:
        """Returns metadata for a specific library by ID."""
        with self._lock:
            self._reload_if_changed()
            for lib in self._config.get("libraries", []):
                if lib.get("id") == library_id:
                    return dict(lib)
            return None

    def set_active_library(self, library_id: str) -> bool:
        """Sets the active library ID and persists configuration."""
        with self._lock:
            for lib in self._config.get("libraries", []):
                if lib.get("id") == library_id:
                    self._config["active_library_id"] = library_id
                    self._config["library_path"] = lib.get("path", "")
                    self._save()
                    return True
            return False

    def add_library(self, name: str, path: str, set_active: bool = False) -> Dict[str, Any]:
        """Adds a new library directory path."""
        with self._lock:
            clean_path = os.path.abspath(os.path.expanduser(path.strip()))
            clean_name = name.strip() or os.path.basename(clean_path.rstrip("/\\")) or "Books"
            libraries = self._config.get("libraries", [])
            
            lib_id = "default" if not libraries else f"lib_{uuid.uuid4().hex[:8]}"
            new_lib = {
                "id": lib_id,
                "name": clean_name,
                "path": clean_path,
            }
            libraries.append(new_lib)
            self._config["libraries"] = libraries

            if set_active or len(libraries) == 1:
                self._config["active_library_id"] = lib_id
                self._config["library_path"] = clean_path

            self._save()
            return dict(new_lib)

    def update_library(self, library_id: str, name: Optional[str] = None, path: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """Updates name or directory path of an existing library."""
        with self._lock:
            for lib in self._config.get("libraries", []):
                if lib.get("id") == library_id:
                    if name is not None and name.strip():
                        lib["name"] = name.strip()
                    if path is not None and path.strip():
                        clean_path = os.path.abspath(os.path.expanduser(path.strip()))
                        lib["path"] = clean_path
                        if self._config.get("active_library_id") == library_id:
                            self._config["library_path"] = clean_path

                    self._save()
                    return dict(lib)
            return None

    def remove_library(self, library_id: str) -> bool:
        """Removes a library from configuration. Prevents removing the last library."""
        with self._lock:
            libraries = self._config.get("libraries", [])
            if len(libraries) <= 1:
                return False

            idx_to_remove = next((i for i, l in enumerate(libraries) if l.get("id") == library_id), None)
            if idx_to_remove is None:
                return False

            removed = libraries.pop(idx_to_remove)
            self._config["libraries"] = libraries

            # If active library was removed, fallback to first available
            if self._config.get("active_library_id") == library_id:
                new_active = libraries[0]["id"]
                self._config["active_library_id"] = new_active
                self._config["library_path"] = libraries[0].get("path", "")

            self._save()
            return True

    def get_library_path(self) -> str:
        """Returns the active library path."""
        with self._lock:
            self._reload_if_changed()
            active = self.get_active_library()
            if active and active.get("path"):
                return active["path"]
            return self._config.get("library_path", "")

    def set_library_path(self, path: str) -> str:
        """Sets and persists a library path for the active library (or creates one)."""
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
