import os
import re
import hashlib
from typing import List, Dict, Any, Optional

import json
import threading
from .config import ConfigManager

ALIASES_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".cache", "shelf_aliases.json"))
ICONS_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".cache", "shelf_icons.json"))

def format_size(bytes_size: int) -> str:
    """Format file size in human-readable units."""
    for unit in ['B', 'KB', 'MB', 'GB']:
        if bytes_size < 1024.0:
            return f"{bytes_size:.1f} {unit}" if unit != 'B' else f"{bytes_size} B"
        bytes_size /= 1024.0
    return f"{bytes_size:.1f} TB"

def clean_title(filename: str) -> str:
    """Derives a clean display title from the PDF filename."""
    name, _ = os.path.splitext(filename)
    # Replace multiple underscores or hyphens used as separators
    name = re.sub(r'[_]+', ' ', name)
    # Clean up whitespace
    name = re.sub(r'\s+', ' ', name).strip()
    return name

def format_shelf_name(shelf_dir: str) -> str:
    """Converts a directory name like 'Algoritmos-e-Estruturas' into 'Algoritmos e Estruturas'."""
    if shelf_dir == "_general":
        return "General"
    return shelf_dir.replace('-', ' ').strip()

def compute_book_id(shelf: str, filename: str) -> str:
    """Returns a deterministic, URL-safe book ID."""
    raw = f"{shelf}:::{filename}"
    return hashlib.sha1(raw.encode('utf-8')).hexdigest()[:16]

class LibraryScanner:
    def __init__(self, config_mgr: Optional[ConfigManager] = None, aliases_path: str = ALIASES_PATH, icons_path: str = ICONS_PATH):
        self.config_mgr = config_mgr or ConfigManager()
        self.library_path = self.config_mgr.get_library_path()
        self.aliases_path = aliases_path
        self.icons_path = icons_path
        self._lock = threading.RLock()
        self._aliases = self._load_aliases()
        self._icons = self._load_icons()

    def set_library_path(self, new_path: str) -> str:
        """Sets and persists a new book library folder path."""
        with self._lock:
            resolved = self.config_mgr.set_library_path(new_path)
            self.library_path = resolved
            return resolved

    def _load_aliases(self) -> Dict[str, str]:
        if os.path.exists(self.aliases_path):
            try:
                with open(self.aliases_path, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception as e:
                print(f"Error loading shelf aliases: {e}")
        return {}

    def _save_aliases(self):
        os.makedirs(os.path.dirname(self.aliases_path), exist_ok=True)
        try:
            with open(self.aliases_path, "w", encoding="utf-8") as f:
                json.dump(self._aliases, f, indent=2, ensure_ascii=False)
        except Exception as e:
            print(f"Error saving shelf aliases: {e}")

    def _load_icons(self) -> Dict[str, str]:
        if os.path.exists(self.icons_path):
            try:
                with open(self.icons_path, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception as e:
                print(f"Error loading shelf icons: {e}")
        return {}

    def _save_icons(self):
        os.makedirs(os.path.dirname(self.icons_path), exist_ok=True)
        try:
            with open(self.icons_path, "w", encoding="utf-8") as f:
                json.dump(self._icons, f, indent=2, ensure_ascii=False)
        except Exception as e:
            print(f"Error saving shelf icons: {e}")

    def set_shelf_icon(self, shelf_id: str, icon_name: str) -> str:
        """Sets or resets an icon name for a bookshelf."""
        with self._lock:
            icon_name = icon_name.strip()
            if icon_name and icon_name.lower() != "folder":
                self._icons[shelf_id] = icon_name
            elif shelf_id in self._icons:
                del self._icons[shelf_id]
            self._save_icons()
            return self._icons.get(shelf_id, "")

    def get_shelf_icon(self, shelf_id: str) -> str:
        """Returns the icon name for a shelf, or empty string if default."""
        with self._lock:
            return self._icons.get(shelf_id, "")

    def set_shelf_alias(self, shelf_id: str, custom_name: str) -> str:
        """Sets or resets a virtual custom name for a bookshelf."""
        with self._lock:
            custom_name = custom_name.strip()
            if custom_name:
                self._aliases[shelf_id] = custom_name
            elif shelf_id in self._aliases:
                del self._aliases[shelf_id]
            self._save_aliases()
            return self._aliases.get(shelf_id, format_shelf_name(shelf_id))

    def get_shelf_display_name(self, shelf_id: str) -> str:
        """Returns custom name if defined, otherwise formatted folder name."""
        with self._lock:
            return self._aliases.get(shelf_id, format_shelf_name(shelf_id))

    def get_shelves(self) -> List[Dict[str, Any]]:
        """Returns list of all bookshelf categories with metadata and book counts."""
        if not self.library_path or not os.path.isdir(self.library_path):
            return []

        shelves = []
        try:
            entries = sorted(os.listdir(self.library_path))
        except Exception:
            return []

        with self._lock:
            aliases = dict(self._aliases)
            icons = dict(self._icons)

        # Check for direct PDFs in root directory
        root_pdfs = [f for f in entries if f.lower().endswith('.pdf') and os.path.isfile(os.path.join(self.library_path, f))]
        if root_pdfs:
            custom_name = aliases.get("_general", "")
            orig_name = "General"
            shelves.append({
                "id": "_general",
                "name": custom_name if custom_name else orig_name,
                "original_name": orig_name,
                "custom_name": custom_name,
                "folder": "_general",
                "book_count": len(root_pdfs),
                "icon": icons.get("_general", "BookOpen"),
            })

        for entry in entries:
            full_path = os.path.join(self.library_path, entry)
            if os.path.isdir(full_path):
                try:
                    pdf_count = sum(1 for f in os.listdir(full_path) if f.lower().endswith('.pdf'))
                except Exception:
                    pdf_count = 0

                if pdf_count > 0:
                    orig_name = format_shelf_name(entry)
                    custom_name = aliases.get(entry, "")
                    shelves.append({
                        "id": entry,
                        "name": custom_name if custom_name else orig_name,
                        "original_name": orig_name,
                        "custom_name": custom_name,
                        "folder": entry,
                        "book_count": pdf_count,
                        "icon": icons.get(entry, ""),
                    })
        return shelves

    def get_books(self, shelf_filter: Optional[str] = None) -> List[Dict[str, Any]]:
        """Returns all books, optionally filtered by bookshelf."""
        if not self.library_path or not os.path.isdir(self.library_path):
            return []

        books = []
        try:
            entries = sorted(os.listdir(self.library_path))
        except Exception:
            return []

        # Direct PDFs in root directory
        if not shelf_filter or shelf_filter == "_general":
            root_pdfs = [f for f in entries if f.lower().endswith('.pdf') and os.path.isfile(os.path.join(self.library_path, f))]
            shelf_display = self.get_shelf_display_name("_general")
            for fname in root_pdfs:
                full_path = os.path.join(self.library_path, fname)
                try:
                    stat = os.stat(full_path)
                    size = stat.st_size
                    mtime = stat.st_mtime
                except Exception:
                    size = 0
                    mtime = 0

                book_id = compute_book_id("_general", fname)
                books.append({
                    "id": book_id,
                    "title": clean_title(fname),
                    "filename": fname,
                    "shelf": "_general",
                    "shelf_display": shelf_display,
                    "size_bytes": size,
                    "size_formatted": format_size(size),
                    "modified_time": mtime,
                    "path": full_path,
                })

        # Subdirectory shelves
        for shelf_name in entries:
            if shelf_filter and shelf_name != shelf_filter:
                continue

            shelf_dir = os.path.join(self.library_path, shelf_name)
            if not os.path.isdir(shelf_dir):
                continue

            shelf_display = self.get_shelf_display_name(shelf_name)
            try:
                filenames = sorted(os.listdir(shelf_dir))
            except Exception:
                filenames = []

            for fname in filenames:
                if not fname.lower().endswith('.pdf'):
                    continue

                full_path = os.path.join(shelf_dir, fname)
                try:
                    stat = os.stat(full_path)
                    size = stat.st_size
                    mtime = stat.st_mtime
                except Exception:
                    size = 0
                    mtime = 0

                book_id = compute_book_id(shelf_name, fname)

                books.append({
                    "id": book_id,
                    "title": clean_title(fname),
                    "filename": fname,
                    "shelf": shelf_name,
                    "shelf_display": shelf_display,
                    "size_bytes": size,
                    "size_formatted": format_size(size),
                    "modified_time": mtime,
                    "path": full_path,
                })

        return books

    def find_book(self, book_id: str) -> Optional[Dict[str, Any]]:
        """Finds a specific book by ID."""
        for book in self.get_books():
            if book["id"] == book_id:
                return book
        return None
