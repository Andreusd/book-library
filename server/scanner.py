import os
import re
import hashlib
from typing import List, Dict, Any, Optional

import json
import threading

DEFAULT_LIBRARY_PATH = r"C:\Users\andre\OneDrive\Andreusd\Livros"
ALIASES_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".cache", "shelf_aliases.json"))

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
    return shelf_dir.replace('-', ' ').strip()

def compute_book_id(shelf: str, filename: str) -> str:
    """Returns a deterministic, URL-safe book ID."""
    raw = f"{shelf}:::{filename}"
    return hashlib.sha1(raw.encode('utf-8')).hexdigest()[:16]

class LibraryScanner:
    def __init__(self, library_path: str = DEFAULT_LIBRARY_PATH, aliases_path: str = ALIASES_PATH):
        self.library_path = library_path
        self.aliases_path = aliases_path
        self._lock = threading.RLock()
        self._aliases = self._load_aliases()

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
        if not os.path.exists(self.library_path):
            return []

        shelves = []
        entries = sorted(os.listdir(self.library_path))
        with self._lock:
            aliases = dict(self._aliases)

        for entry in entries:
            full_path = os.path.join(self.library_path, entry)
            if os.path.isdir(full_path):
                # Count PDF files in this folder
                pdf_count = sum(1 for f in os.listdir(full_path) if f.lower().endswith('.pdf'))
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
                    })
        return shelves

    def get_books(self, shelf_filter: Optional[str] = None) -> List[Dict[str, Any]]:
        """Returns all books, optionally filtered by bookshelf."""
        if not os.path.exists(self.library_path):
            return []

        books = []
        entries = sorted(os.listdir(self.library_path))
        for shelf_name in entries:
            if shelf_filter and shelf_name != shelf_filter:
                continue

            shelf_dir = os.path.join(self.library_path, shelf_name)
            if not os.path.isdir(shelf_dir):
                continue

            shelf_display = self.get_shelf_display_name(shelf_name)
            filenames = sorted(os.listdir(shelf_dir))

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
