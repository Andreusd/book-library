import os
import json
import threading
from typing import Dict, Any, Optional

CACHE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".cache"))
CONFIG_FILE = os.path.join(CACHE_DIR, "config.json")

class ConfigManager:
    """Manages application settings persisted in .cache/config.json."""

    def __init__(self, config_path: str = CONFIG_FILE):
        self.config_path = config_path
        self._lock = threading.RLock()
        self._config = self._load()

    def _load(self) -> Dict[str, Any]:
        if os.path.exists(self.config_path):
            try:
                with open(self.config_path, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception as e:
                print(f"Error loading config: {e}")
        return {}

    def _save(self):
        os.makedirs(os.path.dirname(self.config_path), exist_ok=True)
        try:
            with open(self.config_path, "w", encoding="utf-8") as f:
                json.dump(self._config, f, indent=2, ensure_ascii=False)
        except Exception as e:
            print(f"Error saving config: {e}")

    def get_library_path(self) -> str:
        """
        Resolves the configured library path with the following priority:
        1. Persisted config in .cache/config.json
        2. BOOK_LIBRARY_PATH environment variable
        3. Local fallback paths if they exist
        """
        with self._lock:
            saved = self._config.get("library_path", "").strip()
            if saved:
                return os.path.abspath(os.path.expanduser(saved))

        # Check environment variable
        env_path = os.environ.get("BOOK_LIBRARY_PATH", "").strip()
        if env_path:
            return os.path.abspath(os.path.expanduser(env_path))

        # Check local fallback directories
        candidates = [
            os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "books")),
            os.path.expanduser("~/Books"),
            os.path.expanduser("~/Documents/Books"),
        ]
        for candidate in candidates:
            if candidate and os.path.isdir(candidate):
                return os.path.abspath(candidate)

        return ""

    def set_library_path(self, path: str) -> str:
        """Saves a new library path to the persisted configuration."""
        with self._lock:
            clean_path = path.strip()
            if clean_path:
                clean_path = os.path.abspath(os.path.expanduser(clean_path))
            self._config["library_path"] = clean_path
            self._save()
            return clean_path

    @staticmethod
    def validate_path(path: str) -> Dict[str, Any]:
        """Validates a library path and counts available shelves and PDF books."""
        clean = (path or "").strip()
        if not clean:
            return {
                "valid": False,
                "exists": False,
                "is_dir": False,
                "shelf_count": 0,
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
                "book_count": 0,
                "error": str(e),
                "normalized_path": norm_path
            }

        shelf_count = 0
        book_count = 0

        # Check for direct PDFs in root
        root_pdfs = [f for f in entries if f.lower().endswith('.pdf') and os.path.isfile(os.path.join(norm_path, f))]
        if root_pdfs:
            shelf_count += 1
            book_count += len(root_pdfs)

        # Check subdirectories
        for entry in entries:
            sub = os.path.join(norm_path, entry)
            if os.path.isdir(sub):
                try:
                    sub_pdfs = sum(1 for f in os.listdir(sub) if f.lower().endswith('.pdf'))
                    if sub_pdfs > 0:
                        shelf_count += 1
                        book_count += sub_pdfs
                except Exception:
                    pass

        return {
            "valid": True,
            "exists": True,
            "is_dir": True,
            "shelf_count": shelf_count,
            "book_count": book_count,
            "error": None if book_count > 0 else "no_pdfs_found",
            "normalized_path": norm_path
        }
