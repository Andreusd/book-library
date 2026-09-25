import os
import re
import hashlib
import zipfile
import posixpath
import html
from typing import List, Dict, Any, Optional, Tuple

import json
import threading
from .config import ConfigManager

ALIASES_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".cache", "shelf_aliases.json"))
ICONS_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".cache", "shelf_icons.json"))
METADATA_CACHE_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".cache", "epub_metadata.json"))
BOOK_EXTENSIONS = ('.pdf', '.epub')

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

format_folder_name = format_shelf_name

def compute_book_id(shelf: str, filename: str, library_id: str = "default") -> str:
    """
    Returns a deterministic, URL-safe book ID.
    If library_id is 'default' (or empty), keeps the legacy hash formula
    for 100% backward compatibility with existing covers, progress, favorites, and annotations.
    For other libraries, namespaces by library_id to avoid cross-library ID collisions.
    """
    if not library_id or library_id == "default":
        raw = f"{shelf}:::{filename}"
    else:
        raw = f"{library_id}:::{shelf}:::{filename}"
    return hashlib.sha1(raw.encode('utf-8')).hexdigest()[:16]

class LibraryScanner:
    def __init__(self, config_mgr: Optional[ConfigManager] = None, aliases_path: str = ALIASES_PATH, icons_path: str = ICONS_PATH, metadata_cache_path: str = METADATA_CACHE_PATH):
        self.config_mgr = config_mgr or ConfigManager()
        self.aliases_path = aliases_path
        self.icons_path = icons_path
        self.metadata_cache_path = metadata_cache_path
        self._lock = threading.RLock()
        self._aliases = self._load_aliases()
        self._icons = self._load_icons()
        self._metadata_cache = self._load_metadata_cache()

    @property
    def library_path(self) -> str:
        """Returns the filesystem path of the currently active library."""
        return self.config_mgr.get_library_path()

    def set_library_path(self, new_path: str) -> str:
        """Sets and persists a new book library folder path for active library."""
        with self._lock:
            return self.config_mgr.set_library_path(new_path)

    def _resolve_library(self, library_id: Optional[str] = None) -> Tuple[str, str]:
        """Resolves (library_id, library_path) from given ID or active library."""
        if library_id:
            lib = self.config_mgr.get_library_by_id(library_id)
            if lib and lib.get("path"):
                return lib["id"], lib["path"]
            return library_id, ""

        active = self.config_mgr.get_active_library()
        if active and active.get("path"):
            return active["id"], active["path"]

        path = self.config_mgr.get_library_path()
        return "default", path

    def _load_aliases(self) -> Dict[str, str]:
        if os.path.exists(self.aliases_path):
            try:
                with open(self.aliases_path, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception as e:
                print(f"Error loading folder aliases: {e}")
        return {}

    def _save_aliases(self):
        os.makedirs(os.path.dirname(self.aliases_path), exist_ok=True)
        try:
            with open(self.aliases_path, "w", encoding="utf-8") as f:
                json.dump(self._aliases, f, indent=2, ensure_ascii=False)
        except Exception as e:
            print(f"Error saving folder aliases: {e}")

    def _load_icons(self) -> Dict[str, str]:
        if os.path.exists(self.icons_path):
            try:
                with open(self.icons_path, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception as e:
                print(f"Error loading folder icons: {e}")
        return {}

    def _save_icons(self):
        os.makedirs(os.path.dirname(self.icons_path), exist_ok=True)
        try:
            with open(self.icons_path, "w", encoding="utf-8") as f:
                json.dump(self._icons, f, indent=2, ensure_ascii=False)
        except Exception as e:
            print(f"Error saving folder icons: {e}")

    def _load_metadata_cache(self) -> Dict[str, Any]:
        if os.path.exists(self.metadata_cache_path):
            try:
                with open(self.metadata_cache_path, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception as e:
                print(f"Error loading epub metadata cache: {e}")
        return {}

    def _save_metadata_cache(self):
        os.makedirs(os.path.dirname(self.metadata_cache_path), exist_ok=True)
        try:
            with open(self.metadata_cache_path, "w", encoding="utf-8") as f:
                json.dump(self._metadata_cache, f, indent=2, ensure_ascii=False)
        except Exception as e:
            print(f"Error saving epub metadata cache: {e}")

    def _get_epub_metadata(self, epub_path: str, mtime: float) -> Dict[str, str]:
        cache_key = f"{epub_path}:::{mtime}"
        with self._lock:
            if cache_key in self._metadata_cache:
                return self._metadata_cache[cache_key]

        meta = {"title": "", "author": ""}
        try:
            with zipfile.ZipFile(epub_path, 'r') as z:
                try:
                    c_data = z.read('META-INF/container.xml').decode('utf-8', errors='ignore')
                    m_rf = re.search(r'full-path=["\']([^"\']+)["\']', c_data, re.IGNORECASE)
                    opf_path = m_rf.group(1) if m_rf else 'content.opf'
                except Exception:
                    opf_candidates = [n for n in z.namelist() if n.lower().endswith('.opf')]
                    opf_path = opf_candidates[0] if opf_candidates else ''

                if not opf_path or opf_path not in z.namelist():
                    for n in z.namelist():
                        if n.lower() == opf_path.lower():
                            opf_path = n
                            break

                if opf_path:
                    opf_text = z.read(opf_path).decode('utf-8', errors='ignore')
                    m_title = re.search(r'<dc:title[^>]*>([^<]+)</dc:title>', opf_text, re.IGNORECASE)
                    if m_title:
                        meta['title'] = html.unescape(m_title.group(1).strip())
                    m_author = re.search(r'<dc:creator[^>]*>([^<]+)</dc:creator>', opf_text, re.IGNORECASE)
                    if m_author:
                        meta['author'] = html.unescape(m_author.group(1).strip())
        except Exception as e:
            print(f"Error reading EPUB metadata from {epub_path}: {e}")

        with self._lock:
            self._metadata_cache[cache_key] = meta
            self._save_metadata_cache()

        return meta

    def set_shelf_icon(self, shelf_id: str, icon_name: str, library_id: Optional[str] = None) -> str:
        """Sets or resets an icon name for a folder scoped to library."""
        lib_id, _ = self._resolve_library(library_id)
        key = f"{lib_id}:::{shelf_id}"
        with self._lock:
            icon_name = icon_name.strip()
            if icon_name and icon_name.lower() != "folder":
                self._icons[key] = icon_name
                if lib_id == "default":
                    self._icons[shelf_id] = icon_name
            else:
                self._icons.pop(key, None)
                if lib_id == "default":
                    self._icons.pop(shelf_id, None)
            self._save_icons()
            return self.get_shelf_icon(shelf_id, lib_id)

    set_folder_icon = set_shelf_icon

    def get_shelf_icon(self, shelf_id: str, library_id: Optional[str] = None) -> str:
        """Returns the icon name for a folder scoped to library."""
        lib_id, _ = self._resolve_library(library_id)
        key = f"{lib_id}:::{shelf_id}"
        with self._lock:
            if key in self._icons:
                return self._icons[key]
            if lib_id == "default" and shelf_id in self._icons:
                return self._icons[shelf_id]
            return ""

    get_folder_icon = get_shelf_icon

    def set_shelf_alias(self, shelf_id: str, custom_name: str, library_id: Optional[str] = None) -> str:
        """Sets or resets a virtual custom name for a folder scoped to library."""
        lib_id, _ = self._resolve_library(library_id)
        key = f"{lib_id}:::{shelf_id}"
        with self._lock:
            custom_name = custom_name.strip()
            if custom_name:
                self._aliases[key] = custom_name
                if lib_id == "default":
                    self._aliases[shelf_id] = custom_name
            else:
                self._aliases.pop(key, None)
                if lib_id == "default":
                    self._aliases.pop(shelf_id, None)
            self._save_aliases()
            return self.get_shelf_display_name(shelf_id, lib_id)

    set_folder_alias = set_shelf_alias

    def get_shelf_display_name(self, shelf_id: str, library_id: Optional[str] = None) -> str:
        """Returns custom name if defined, otherwise formatted folder name."""
        lib_id, _ = self._resolve_library(library_id)
        key = f"{lib_id}:::{shelf_id}"
        with self._lock:
            if key in self._aliases:
                return self._aliases[key]
            if lib_id == "default" and shelf_id in self._aliases:
                return self._aliases[shelf_id]
            return format_shelf_name(shelf_id)

    get_folder_display_name = get_shelf_display_name

    def get_shelves(self, library_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """Returns list of all folders with metadata and book counts for a library."""
        lib_id, lib_path = self._resolve_library(library_id)
        if not lib_path or not os.path.isdir(lib_path):
            return []

        shelves = []
        try:
            entries = sorted(os.listdir(lib_path))
        except Exception:
            return []

        # Check for direct books in root directory
        root_books = [f for f in entries if f.lower().endswith(BOOK_EXTENSIONS) and os.path.isfile(os.path.join(lib_path, f))]
        if root_books:
            custom_name = self.get_shelf_display_name("_general", lib_id)
            orig_name = "General"
            icon = self.get_shelf_icon("_general", lib_id) or "BookOpen"
            shelves.append({
                "id": "_general",
                "name": custom_name,
                "original_name": orig_name,
                "custom_name": custom_name if custom_name != orig_name else "",
                "folder": "_general",
                "shelf": "_general",
                "book_count": len(root_books),
                "icon": icon,
                "library_id": lib_id,
            })

        for entry in entries:
            full_path = os.path.join(lib_path, entry)
            if os.path.isdir(full_path):
                try:
                    book_count = sum(1 for f in os.listdir(full_path) if f.lower().endswith(BOOK_EXTENSIONS))
                except Exception:
                    book_count = 0

                if book_count > 0:
                    orig_name = format_shelf_name(entry)
                    custom_name = self.get_shelf_display_name(entry, lib_id)
                    icon = self.get_shelf_icon(entry, lib_id)
                    shelves.append({
                        "id": entry,
                        "name": custom_name,
                        "original_name": orig_name,
                        "custom_name": custom_name if custom_name != orig_name else "",
                        "folder": entry,
                        "shelf": entry,
                        "book_count": book_count,
                        "icon": icon,
                        "library_id": lib_id,
                    })
        return shelves

    get_folders = get_shelves

    def get_books(self, shelf_filter: Optional[str] = None, folder_filter: Optional[str] = None, library_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """Returns all books strictly belonging to a library, optionally filtered by folder."""
        lib_id, lib_path = self._resolve_library(library_id)
        if not lib_path or not os.path.isdir(lib_path):
            return []

        active_filter = folder_filter or shelf_filter
        books = []
        try:
            entries = sorted(os.listdir(lib_path))
        except Exception:
            return []

        # Direct books in root directory
        if not active_filter or active_filter == "_general":
            root_books = [f for f in entries if f.lower().endswith(BOOK_EXTENSIONS) and os.path.isfile(os.path.join(lib_path, f))]
            shelf_display = self.get_shelf_display_name("_general", lib_id)
            for fname in root_books:
                full_path = os.path.join(lib_path, fname)
                try:
                    stat = os.stat(full_path)
                    size = stat.st_size
                    mtime = stat.st_mtime
                except Exception:
                    size = 0
                    mtime = 0

                is_epub = fname.lower().endswith('.epub')
                meta = self._get_epub_metadata(full_path, mtime) if is_epub else {}
                title = meta.get("title") or clean_title(fname)
                author = meta.get("author", "")
                book_id = compute_book_id("_general", fname, lib_id)
                books.append({
                    "id": book_id,
                    "library_id": lib_id,
                    "title": title,
                    "author": author,
                    "format": "epub" if is_epub else "pdf",
                    "filename": fname,
                    "shelf": "_general",
                    "shelf_display": shelf_display,
                    "folder": "_general",
                    "folder_display": shelf_display,
                    "size_bytes": size,
                    "size_formatted": format_size(size),
                    "modified_time": mtime,
                    "path": full_path,
                })

        # Subdirectory shelves/folders
        for shelf_name in entries:
            if active_filter and shelf_name != active_filter:
                continue

            shelf_dir = os.path.join(lib_path, shelf_name)
            if not os.path.isdir(shelf_dir):
                continue

            shelf_display = self.get_shelf_display_name(shelf_name, lib_id)
            try:
                filenames = sorted(os.listdir(shelf_dir))
            except Exception:
                filenames = []

            for fname in filenames:
                if not fname.lower().endswith(BOOK_EXTENSIONS):
                    continue

                full_path = os.path.join(shelf_dir, fname)
                try:
                    stat = os.stat(full_path)
                    size = stat.st_size
                    mtime = stat.st_mtime
                except Exception:
                    size = 0
                    mtime = 0

                is_epub = fname.lower().endswith('.epub')
                meta = self._get_epub_metadata(full_path, mtime) if is_epub else {}
                title = meta.get("title") or clean_title(fname)
                author = meta.get("author", "")
                book_id = compute_book_id(shelf_name, fname, lib_id)

                books.append({
                    "id": book_id,
                    "library_id": lib_id,
                    "title": title,
                    "author": author,
                    "format": "epub" if is_epub else "pdf",
                    "filename": fname,
                    "shelf": shelf_name,
                    "shelf_display": shelf_display,
                    "folder": shelf_name,
                    "folder_display": shelf_display,
                    "size_bytes": size,
                    "size_formatted": format_size(size),
                    "modified_time": mtime,
                    "path": full_path,
                })

        return books

    def find_book(self, book_id: str, library_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """Finds a specific book by ID, checking targeted/active library first, then others."""
        # 1. Check targeted library or active library
        for book in self.get_books(library_id=library_id):
            if book["id"] == book_id:
                return book

        # 2. Check other libraries if not found
        active_id = self.config_mgr.get_active_library_id()
        for lib in self.config_mgr.get_libraries():
            other_id = lib.get("id")
            if other_id and other_id != (library_id or active_id):
                for book in self.get_books(library_id=other_id):
                    if book["id"] == book_id:
                        return book

        return None
