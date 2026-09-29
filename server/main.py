import os
import sys
from typing import Optional, List, Dict, Any
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Query, Request, status, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

import pypdfium2 as pdfium

from .scanner import LibraryScanner
from .covers import CoverManager
from .progress import ProgressTracker
from .annotations import AnnotationsManager
from .favorites import FavoritesManager
from .lookup import LookupManager
from .tags import TagsManager
from .users import UserManager
from .deps import (
    get_scanner,
    get_cover_mgr,
    get_lookup_mgr,
    get_user_mgr,
    get_request_user,
)

# Base paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CLIENT_DIST = os.path.abspath(os.path.join(BASE_DIR, "..", "client", "dist"))

# Core components via dependency injection
scanner = get_scanner()
cover_mgr = get_cover_mgr()
lookup_mgr = get_lookup_mgr()
user_mgr = get_user_mgr()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Pre-cache covers for all configured libraries on startup
    all_books = []
    for lib in scanner.config_mgr.get_libraries():
        lib_books = scanner.get_books(library_id=lib["id"])
        all_books.extend(lib_books)
    print(f"Discovered {len(all_books)} books across {len(scanner.config_mgr.get_libraries())} libraries.")
    cover_mgr.pre_cache_all(all_books)
    yield

app = FastAPI(title="Book Library API", lifespan=lifespan)

# Allow CORS for development Vite server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ProgressPayload(BaseModel):
    book_id: str
    page: int = 1
    total_pages: int = 1
    zoom: Optional[float] = None
    invert_colors: Optional[bool] = None
    cfi: Optional[str] = None
    percent: Optional[float] = None

class ZoomPayload(BaseModel):
    book_id: str
    zoom: float

class NightModePayload(BaseModel):
    book_id: str
    invert_colors: bool

class StatusPayload(BaseModel):
    book_id: str
    status: str  # "not_started" | "completed"

class RenameShelfPayload(BaseModel):
    shelf_id: Optional[str] = None
    folder_id: Optional[str] = None
    custom_name: str
    library_id: Optional[str] = None

class SetShelfIconPayload(BaseModel):
    shelf_id: Optional[str] = None
    folder_id: Optional[str] = None
    icon: str
    library_id: Optional[str] = None

class ToggleFavoritePayload(BaseModel):
    book_id: str

class SettingsPayload(BaseModel):
    library_path: str

class DisplaySettingsPayload(BaseModel):
    show_file_extension: bool

class ValidatePathPayload(BaseModel):
    path: str

class AddLibraryPayload(BaseModel):
    name: str
    path: str
    set_active: Optional[bool] = False

class UpdateLibraryPayload(BaseModel):
    name: Optional[str] = None
    path: Optional[str] = None

class SetActiveLibraryPayload(BaseModel):
    library_id: str

class AnnotationPayload(BaseModel):
    book_id: str
    page: Optional[int] = 1
    cfi: Optional[str] = None
    chapter: Optional[str] = None
    text: str
    color: str = "yellow"
    comment: Optional[str] = ""
    rects: Optional[List[Dict[str, Any]]] = []

class UpdateAnnotationPayload(BaseModel):
    comment: Optional[str] = None
    color: Optional[str] = None

class TranslatePayload(BaseModel):
    text: str
    target_lang: Optional[str] = "pt"
    source_lang: Optional[str] = "auto"

class CreateTagPayload(BaseModel):
    name: str
    color: Optional[str] = "amber"
    library_id: Optional[str] = None

class UpdateTagPayload(BaseModel):
    name: Optional[str] = None
    color: Optional[str] = None

class SetBookTagsPayload(BaseModel):
    tag_ids: List[str]

class ToggleBookTagPayload(BaseModel):
    tag_id: str

class UserPayload(BaseModel):
    username: str

@app.get("/api/users")
def list_users(user_mgr: UserManager = Depends(get_user_mgr)):
    """Returns list of registered users sorted by recent activity."""
    return {"users": user_mgr.list_users()}

@app.post("/api/users")
def register_user(payload: UserPayload, user_mgr: UserManager = Depends(get_user_mgr)):
    """Registers or touches a user profile."""
    clean = payload.username.strip()
    if not clean:
        raise HTTPException(status_code=400, detail="Username cannot be empty")
    profile = user_mgr.touch_user(clean)
    return {"status": "ok", "user": profile, "users": user_mgr.list_users()}

@app.get("/api/users/current")
def get_current_user_profile(user: str = Depends(get_request_user), user_mgr: UserManager = Depends(get_user_mgr)):
    """Returns profile for the current requesting user."""
    profile = user_mgr.touch_user(user)
    return {"user": profile}

@app.delete("/api/users/{username}")
def delete_user(username: str, user_mgr: UserManager = Depends(get_user_mgr)):
    """Deletes a user profile and all their scoped data from disk."""
    clean = username.strip()
    if not clean:
        raise HTTPException(status_code=400, detail="Username cannot be empty")
    success = user_mgr.delete_user(clean)
    return {
        "status": "ok" if success else "not_found",
        "deleted": clean,
        "users": user_mgr.list_users()
    }


@app.get("/api/libraries")
def list_libraries(library_id: Optional[str] = Query(None), scanner: LibraryScanner = Depends(get_scanner)):
    """Returns list of all configured libraries with validation, folder/book counts, and sample covers."""
    libs = scanner.config_mgr.get_libraries()
    results = []
    for lib in libs:
        val = scanner.config_mgr.validate_path(lib["path"])
        sample_covers = []
        folder_count = 0
        book_count = 0
        if val.get("valid"):
            try:
                books = scanner.get_books(library_id=lib["id"])
                book_count = len(books)
                sample_covers = [f"/api/cover/{b['id']}" for b in books[:4]]
                folders = scanner.get_folders(library_id=lib["id"])
                folder_count = len(folders)
            except Exception:
                folder_count = val.get("folder_count", 0)
                book_count = val.get("book_count", 0)
        else:
            folder_count = val.get("folder_count", 0)
            book_count = val.get("book_count", 0)

        results.append({
            "id": lib["id"],
            "name": lib["name"],
            "path": lib["path"],
            "is_active": bool(library_id and lib["id"] == library_id),
            "folder_count": folder_count,
            "book_count": book_count,
            "valid": val.get("valid", False),
            "error": val.get("error"),
            "sample_covers": sample_covers,
        })
    return {
        "libraries": results,
        "active_library_id": library_id or ""
    }

@app.post("/api/libraries")
def add_library(payload: AddLibraryPayload, scanner: LibraryScanner = Depends(get_scanner), cover_mgr: CoverManager = Depends(get_cover_mgr)):
    """Adds a new library directory path."""
    val = scanner.config_mgr.validate_path(payload.path)
    if not val["valid"]:
        raise HTTPException(status_code=400, detail=f"Invalid folder path: {val.get('error')}")

    new_lib = scanner.config_mgr.add_library(
        payload.name, 
        payload.path, 
        set_active=bool(payload.set_active)
    )
    new_books = scanner.get_books(library_id=new_lib["id"])
    cover_mgr.pre_cache_all(new_books)
    return {
        "status": "ok",
        "library": new_lib,
        "libraries": scanner.config_mgr.get_libraries(),
        "active_library_id": scanner.config_mgr.get_active_library_id()
    }

@app.put("/api/libraries/{library_id}")
def update_library(library_id: str, payload: UpdateLibraryPayload, scanner: LibraryScanner = Depends(get_scanner), cover_mgr: CoverManager = Depends(get_cover_mgr)):
    """Updates the display name or path of an existing library."""
    if payload.path:
        val = scanner.config_mgr.validate_path(payload.path)
        if not val["valid"]:
            raise HTTPException(status_code=400, detail=f"Invalid folder path: {val.get('error')}")

    updated = scanner.config_mgr.update_library(library_id, name=payload.name, path=payload.path)
    if not updated:
        raise HTTPException(status_code=404, detail="Library not found")

    if payload.path:
        books = scanner.get_books(library_id=library_id)
        cover_mgr.pre_cache_all(books)

    return {
        "status": "ok",
        "library": updated,
        "libraries": scanner.config_mgr.get_libraries()
    }

@app.delete("/api/libraries/{library_id}")
def delete_library(library_id: str, scanner: LibraryScanner = Depends(get_scanner)):
    """Removes a library from the library list (files on disk remain untouched)."""
    success = scanner.config_mgr.remove_library(library_id)
    if not success:
        raise HTTPException(status_code=400, detail="Cannot delete library (not found or only library remaining)")

    return {
        "status": "ok",
        "libraries": scanner.config_mgr.get_libraries(),
        "active_library_id": scanner.config_mgr.get_active_library_id()
    }

@app.post("/api/libraries/active")
def set_active_library(payload: SetActiveLibraryPayload, scanner: LibraryScanner = Depends(get_scanner), cover_mgr: CoverManager = Depends(get_cover_mgr)):
    """Switches the active library directory."""
    success = scanner.config_mgr.set_active_library(payload.library_id)
    if not success:
        raise HTTPException(status_code=404, detail="Library not found")

    books = scanner.get_books(library_id=payload.library_id)
    cover_mgr.pre_cache_all(books)
    return {
        "status": "ok",
        "active_library_id": payload.library_id,
        "library": scanner.config_mgr.get_active_library()
    }

@app.get("/api/settings")
def get_settings(library_id: Optional[str] = Query(None), scanner: LibraryScanner = Depends(get_scanner)):
    """Returns application settings, display preferences, and library status."""
    lib = scanner.config_mgr.get_library_by_id(library_id) if library_id else None
    path = lib["path"] if lib else scanner.library_path
    validation = scanner.config_mgr.validate_path(path) if path else {
        "valid": False, "exists": False, "is_dir": False, "shelf_count": 0, "folder_count": 0, "book_count": 0, "error": "path_empty", "normalized_path": ""
    }
    return {
        "library_path": path,
        "active_library_id": library_id or "",
        "libraries": scanner.config_mgr.get_libraries(),
        "validation": validation,
        "show_file_extension": scanner.config_mgr.get_show_file_extension(),
    }

@app.post("/api/settings/display")
def update_display_settings(payload: DisplaySettingsPayload, scanner: LibraryScanner = Depends(get_scanner)):
    """Updates display preferences such as showing/hiding file extension tags."""
    val = scanner.config_mgr.set_show_file_extension(payload.show_file_extension)
    return {"status": "ok", "show_file_extension": val}

@app.post("/api/settings/validate")
def validate_settings_path(payload: ValidatePathPayload, scanner: LibraryScanner = Depends(get_scanner)):
    """Validates a prospective book library folder path."""
    return scanner.config_mgr.validate_path(payload.path)

@app.post("/api/settings")
def save_settings(payload: SettingsPayload, scanner: LibraryScanner = Depends(get_scanner), cover_mgr: CoverManager = Depends(get_cover_mgr)):
    """Saves and persists a new book library folder path."""
    clean = payload.library_path.strip()
    validation = scanner.config_mgr.validate_path(clean)
    if clean and not validation["valid"]:
        raise HTTPException(status_code=400, detail=f"Invalid folder path: {validation.get('error')}")

    saved_path = scanner.set_library_path(clean)
    books = scanner.get_books()
    cover_mgr.pre_cache_all(books)
    folders = scanner.get_folders()
    return {
        "status": "ok",
        "library_path": saved_path,
        "shelves_count": len(folders),
        "folders_count": len(folders),
        "books_count": len(books)
    }

@app.get("/api/folders")
@app.get("/api/shelves")
def list_folders(library_id: Optional[str] = Query(None), scanner: LibraryScanner = Depends(get_scanner)):
    """Returns list of all folders with book counts for a specific or active library."""
    lib_val = library_id if isinstance(library_id, str) else None
    folders = scanner.get_folders(library_id=lib_val)
    total_books = sum(s["book_count"] for s in folders)
    return {
        "folders": folders,
        "shelves": folders,
        "total_folders": len(folders),
        "total_shelves": len(folders),
        "total_books": total_books,
        "library_id": lib_val or scanner.config_mgr.get_active_library_id()
    }

@app.post("/api/folders/rename")
@app.post("/api/shelves/rename")
def rename_folder(payload: RenameShelfPayload, scanner: LibraryScanner = Depends(get_scanner)):
    """Virtually renames a folder inside the app without changing the physical folder."""
    target_id = payload.folder_id or payload.shelf_id
    if not target_id:
        raise HTTPException(status_code=400, detail="Missing folder_id or shelf_id")
    scanner.set_shelf_alias(target_id, payload.custom_name, library_id=payload.library_id)
    folders = scanner.get_folders(library_id=payload.library_id)
    return {
        "status": "ok",
        "folders": folders,
        "shelves": folders,
        "folder_id": target_id,
        "shelf_id": target_id,
        "name": scanner.get_shelf_display_name(target_id, library_id=payload.library_id)
    }

@app.post("/api/folders/icon")
@app.post("/api/shelves/icon")
def set_folder_icon(payload: SetShelfIconPayload, scanner: LibraryScanner = Depends(get_scanner)):
    """Sets or resets the icon for a folder without changing the physical folder."""
    target_id = payload.folder_id or payload.shelf_id
    if not target_id:
        raise HTTPException(status_code=400, detail="Missing folder_id or shelf_id")
    icon = scanner.set_shelf_icon(target_id, payload.icon, library_id=payload.library_id)
    folders = scanner.get_folders(library_id=payload.library_id)
    return {
        "status": "ok",
        "folders": folders,
        "shelves": folders,
        "folder_id": target_id,
        "shelf_id": target_id,
        "icon": icon
    }

@app.get("/api/books")
def list_books(
    shelf: Optional[str] = Query(None, description="Filter by folder or shelf name"),
    folder: Optional[str] = Query(None, description="Filter by folder name"),
    tag: Optional[str] = Query(None, description="Filter by tag ID"),
    library_id: Optional[str] = Query(None, description="Filter by library ID"),
    query: Optional[str] = Query(None, description="Search query across titles"),
    sort: Optional[str] = Query("title_asc", description="Sort order: title_asc, title_desc, size_desc, recent"),
    user: str = Depends(get_request_user),
    scanner: LibraryScanner = Depends(get_scanner),
    user_mgr: UserManager = Depends(get_user_mgr),
):
    """Returns books enriched with reading progress, favorite status, tags, and cover URLs, strictly isolated by library and user."""
    tracker = user_mgr.get_tracker(user)
    favorites_mgr = user_mgr.get_favorites_mgr(user)
    tags_mgr = user_mgr.get_tags_mgr(user)

    shelf_val = shelf if isinstance(shelf, str) else None
    folder_val = folder if isinstance(folder, str) else None
    tag_val = tag if isinstance(tag, str) else None
    query_val = query if isinstance(query, str) else None
    sort_val = sort if isinstance(sort, str) else "title_asc"
    lib_val = library_id if isinstance(library_id, str) else None

    active_filter = folder_val or shelf_val
    if active_filter and active_filter.startswith("tag:"):
        tag_val = active_filter[4:]
        active_filter = None

    if tag_val:
        tagged_ids = set(tags_mgr.get_book_ids_for_tag(tag_val))
        books = [b for b in scanner.get_books(library_id=lib_val) if b["id"] in tagged_ids]
    elif active_filter == "favorites":
        books = [b for b in scanner.get_books(library_id=lib_val) if favorites_mgr.is_favorite(b["id"])]
    elif active_filter == "continue-reading":
        all_prog = tracker.get_all()
        in_prog_ids = {
            b_id for b_id, p in all_prog.items()
            if p.get("status") not in ("not_started", "completed")
            and (p.get("page", 1) > 1 or p.get("cfi") or p.get("percent", 0) > 0)
            and p.get("percent", 0) < 100
        }
        books = [b for b in scanner.get_books(library_id=lib_val) if b["id"] in in_prog_ids]
    else:
        books = scanner.get_books(folder_filter=active_filter, library_id=lib_val)
    all_progress = tracker.get_all()

    # Enrich each book with reading progress, favorite status, tags, and cover URL
    for b in books:
        prog = all_progress.get(b["id"])
        if prog:
            p_pct = prog.get("percent", 0)
            p_cfi = prog.get("cfi")
            if (p_pct is None or p_pct <= 0) and p_cfi and b.get("path") and b["path"].lower().endswith(".epub"):
                est = scanner.estimate_epub_percent(b["path"], p_cfi)
                if est is not None and est > 0:
                    prog["percent"] = est
                    tracker._data[b["id"]]["percent"] = est
                    tracker._save()
            elif not p_cfi and prog.get("total_pages", 0) > 1 and prog.get("page", 0) > 0:
                calc_pct = round((prog["page"] / prog["total_pages"]) * 100, 1)
                if abs((p_pct or 0) - calc_pct) > 0.5:
                    prog["percent"] = calc_pct
                    tracker._data[b["id"]]["percent"] = calc_pct
                    tracker._save()
        b["progress"] = prog if prog else {"page": 1, "total_pages": 0, "percent": 0}
        b["cover_url"] = f"/api/cover/{b['id']}"
        b["is_favorite"] = favorites_mgr.is_favorite(b["id"])
        b["tags"] = tags_mgr.get_book_tags(b["id"])

    # Filter by search query if provided
    if query_val:
        q = query_val.lower().strip()
        books = [
            b for b in books 
            if q in b["title"].lower() 
            or q in b.get("folder_display", "").lower() 
            or q in b.get("shelf_display", "").lower()
            or any(q in t.get("name", "").lower() for t in b.get("tags", []))
        ]

    # Sort
    if sort_val == "title_asc":
        if active_filter == "continue-reading":
            books.sort(key=lambda x: x["progress"].get("updated_at", ""), reverse=True)
        else:
            books.sort(key=lambda x: x["title"].lower())
    elif sort_val == "title_desc":
        books.sort(key=lambda x: x["title"].lower(), reverse=True)
    elif sort_val == "size_desc":
        books.sort(key=lambda x: x["size_bytes"], reverse=True)
    elif sort_val == "recent":
        books.sort(key=lambda x: x["progress"].get("updated_at", ""), reverse=True)

    # Show favorites first inside each folder (stable sort preserves primary ordering)
    if active_filter and active_filter not in ("continue-reading", "favorites"):
        books.sort(key=lambda x: 0 if x.get("is_favorite") else 1)

    return {
        "books": books,
        "count": len(books),
    }

@app.get("/api/continue-reading")
def continue_reading(
    library_id: Optional[str] = Query(None),
    user: str = Depends(get_request_user),
    scanner: LibraryScanner = Depends(get_scanner),
    user_mgr: UserManager = Depends(get_user_mgr)
):
    """Returns recently opened books that have reading progress, strictly scoped to library and user."""
    tracker = user_mgr.get_tracker(user)
    favorites_mgr = user_mgr.get_favorites_mgr(user)
    tags_mgr = user_mgr.get_tags_mgr(user)

    lib_val = library_id if isinstance(library_id, str) else None
    recents = tracker.get_recent(limit=25)
    # Strictly isolate: only books physically belonging to this library
    lib_books = {b["id"]: b for b in scanner.get_books(library_id=lib_val)}
    results = []
    for r in recents:
        b = lib_books.get(r["book_id"])
        if b:
            b_copy = dict(b)
            r_pct = r.get("percent", 0)
            r_cfi = r.get("cfi")
            if (r_pct is None or r_pct <= 0) and r_cfi and b.get("path") and b["path"].lower().endswith(".epub"):
                est = scanner.estimate_epub_percent(b["path"], r_cfi)
                if est is not None and est > 0:
                    r_pct = est
                    tracker._data[r["book_id"]]["percent"] = est
                    tracker._save()
            elif not r_cfi and r.get("total_pages", 0) > 1 and r.get("page", 0) > 0:
                calc_pct = round((r["page"] / r["total_pages"]) * 100, 1)
                if abs((r_pct or 0) - calc_pct) > 0.5:
                    r_pct = calc_pct
                    tracker._data[r["book_id"]]["percent"] = calc_pct
                    tracker._save()

            prog = {
                "page": r.get("page", 1),
                "total_pages": r.get("total_pages", 100),
                "percent": r_pct,
                "status": r.get("status", "in_progress"),
                "zoom": r.get("zoom", 1.2),
                "invert_colors": r.get("invert_colors", False),
                "updated_at": r.get("updated_at", "")
            }
            if r_cfi:
                prog["cfi"] = r_cfi
            b_copy["progress"] = prog
            b_copy["cover_url"] = f"/api/cover/{b['id']}"
            b_copy["is_favorite"] = favorites_mgr.is_favorite(b["id"])
            b_copy["tags"] = tags_mgr.get_book_tags(b["id"])
            results.append(b_copy)
            if len(results) >= 10:
                break
    return {"books": results}

@app.post("/api/progress")
def save_progress(
    payload: ProgressPayload,
    user: str = Depends(get_request_user),
    scanner: LibraryScanner = Depends(get_scanner),
    user_mgr: UserManager = Depends(get_user_mgr)
):
    """Saves the current reading page/cfi, zoom, and night reading mode for a book."""
    tracker = user_mgr.get_tracker(user)

    pct = payload.percent
    if (pct is None or pct <= 0) and payload.cfi:
        b = scanner.find_book(payload.book_id)
        if b and b.get("path") and b["path"].lower().endswith(".epub"):
            est = scanner.estimate_epub_percent(b["path"], payload.cfi)
            if est is not None and est > 0:
                pct = est

    record = tracker.set_progress(
        payload.book_id, 
        payload.page, 
        payload.total_pages, 
        payload.zoom,
        payload.invert_colors,
        payload.cfi,
        pct
    )
    return {"status": "ok", "progress": record}

@app.post("/api/book/zoom")
def save_zoom(
    payload: ZoomPayload,
    user: str = Depends(get_request_user),
    user_mgr: UserManager = Depends(get_user_mgr)
):
    """Saves the preferred zoom level for a book."""
    tracker = user_mgr.get_tracker(user)
    record = tracker.set_zoom(payload.book_id, payload.zoom)
    return {"status": "ok", "record": record}

@app.post("/api/book/night-mode")
def save_night_mode(
    payload: NightModePayload,
    user: str = Depends(get_request_user),
    user_mgr: UserManager = Depends(get_user_mgr)
):
    """Saves the preferred night reading mode (invert colors) for a book."""
    tracker = user_mgr.get_tracker(user)
    record = tracker.set_night_mode(payload.book_id, payload.invert_colors)
    return {"status": "ok", "record": record}

@app.post("/api/book/status")
def update_book_status(
    payload: StatusPayload,
    user: str = Depends(get_request_user),
    scanner: LibraryScanner = Depends(get_scanner),
    user_mgr: UserManager = Depends(get_user_mgr)
):
    """Marks a book as not started or completed."""
    tracker = user_mgr.get_tracker(user)

    b = scanner.find_book(payload.book_id)
    if not b:
        raise HTTPException(status_code=404, detail="Book not found")

    if payload.status == "not_started":
        rec = tracker.reset_progress(payload.book_id)
        return {
            "status": "ok",
            "progress": rec
        }
    elif payload.status == "completed":
        is_epub = b.get("format") == "epub" or b["path"].lower().endswith(".epub")
        total_pages = 100 if is_epub else 1
        if not is_epub:
            try:
                pdf = pdfium.PdfDocument(b["path"])
                total_pages = len(pdf)
                pdf.close()
            except Exception as e:
                print(f"Could not read total pages for {b['title']}: {e}")

        rec = tracker.mark_completed(payload.book_id, total_pages)
        return {"status": "ok", "progress": rec}
    else:
        raise HTTPException(status_code=400, detail="Invalid status. Must be 'not_started' or 'completed'")

@app.get("/api/book/{book_id}")
def get_book(
    book_id: str,
    user: str = Depends(get_request_user),
    scanner: LibraryScanner = Depends(get_scanner),
    user_mgr: UserManager = Depends(get_user_mgr)
):
    """Returns details for a single book enriched with reading stats, annotations, and metadata."""
    tracker = user_mgr.get_tracker(user)
    favorites_mgr = user_mgr.get_favorites_mgr(user)
    tags_mgr = user_mgr.get_tags_mgr(user)
    annotations_mgr = user_mgr.get_annotations_mgr(user)

    b = scanner.find_book(book_id)
    if not b:
        raise HTTPException(status_code=404, detail="Book not found")
    b_copy = dict(b)
    prog = tracker.get_progress(book_id)
    if prog:
        p_pct = prog.get("percent", 0)
        p_cfi = prog.get("cfi")
        if (p_pct is None or p_pct <= 0) and p_cfi and b.get("path") and b["path"].lower().endswith(".epub"):
            est = scanner.estimate_epub_percent(b["path"], p_cfi)
            if est is not None and est > 0:
                prog["percent"] = est
                tracker._data[book_id]["percent"] = est
                tracker._save()
    b_copy["progress"] = prog if prog else {"page": 1, "total_pages": 0, "percent": 0}
    b_copy["cover_url"] = f"/api/cover/{book_id}"
    b_copy["is_favorite"] = favorites_mgr.is_favorite(book_id)
    b_copy["tags"] = tags_mgr.get_book_tags(book_id)

    # Annotations summary
    book_annotations = annotations_mgr.get_annotations(book_id)
    b_copy["annotations"] = book_annotations
    b_copy["annotations_count"] = len(book_annotations)

    # Technical file metadata for PDF
    if b.get("format") == "pdf" and b.get("path") and os.path.isfile(b["path"]):
        try:
            pdf = pdfium.PdfDocument(b["path"])
            total_pages = len(pdf)
            b_copy["total_pages"] = total_pages
            if not b_copy["progress"].get("total_pages") or b_copy["progress"]["total_pages"] <= 1:
                b_copy["progress"]["total_pages"] = total_pages
            meta = pdf.get_metadata_dict()
            if meta:
                raw_auth = meta.get("Author")
                if raw_auth and not b_copy.get("author") and not any(ord(c) < 32 for c in raw_auth):
                    b_copy["author"] = raw_auth.strip()
                raw_subj = meta.get("Subject")
                if raw_subj and raw_subj != "None" and not b_copy.get("description"):
                    b_copy["description"] = raw_subj.strip()
                if meta.get("Creator"):
                    b_copy["creator"] = meta["Creator"].strip()
                if meta.get("CreationDate"):
                    b_copy["creation_date"] = meta["CreationDate"].strip()
            pdf.close()
        except Exception:
            pass

    return b_copy

@app.get("/api/cover/{book_id}")
def get_cover(book_id: str, scanner: LibraryScanner = Depends(get_scanner), cover_mgr: CoverManager = Depends(get_cover_mgr)):
    """Serves the WebP cover thumbnail for a book (generates on-the-fly if needed)."""
    b = scanner.find_book(book_id)
    if not b:
        raise HTTPException(status_code=404, detail="Book not found")

    cover_path = cover_mgr.generate_cover(b["path"], book_id, b["title"])
    return FileResponse(
        cover_path,
        media_type="image/webp",
        headers={"Cache-Control": "public, max-age=86400"}
    )

@app.get("/api/pdf/{book_id}")
@app.get("/api/epub/{book_id}")
@app.get("/api/epub/{book_id}.epub")
@app.get("/api/book-file/{book_id}")
def stream_book_file(book_id: str, scanner: LibraryScanner = Depends(get_scanner)):
    """Streams the book file (.pdf or .epub) with byte-range support for fast in-browser rendering."""
    clean_id = book_id.removesuffix(".epub").removesuffix(".pdf")
    b = scanner.find_book(clean_id) or scanner.find_book(book_id)
    if not b or not os.path.exists(b["path"]):
        raise HTTPException(status_code=404, detail="Book file not found")

    is_epub = b.get("format") == "epub" or b["path"].lower().endswith(".epub")
    media_type = "application/epub+zip" if is_epub else "application/pdf"

    return FileResponse(
        b["path"],
        media_type=media_type,
        content_disposition_type="inline",
        filename=b["filename"]
    )

@app.get("/api/favorites")
def get_favorites(
    library_id: Optional[str] = Query(None),
    user: str = Depends(get_request_user),
    scanner: LibraryScanner = Depends(get_scanner),
    user_mgr: UserManager = Depends(get_user_mgr)
):
    """Returns list of favorite book IDs and favorite books strictly scoped to library and user."""
    favorites_mgr = user_mgr.get_favorites_mgr(user)
    tracker = user_mgr.get_tracker(user)
    tags_mgr = user_mgr.get_tags_mgr(user)

    lib_val = library_id if isinstance(library_id, str) else None
    fav_ids = set(favorites_mgr.get_favorite_ids())
    all_progress = tracker.get_all()
    # Strictly isolate: only books physically belonging to this library
    lib_books = scanner.get_books(library_id=lib_val)
    books = []
    for b in lib_books:
        if b["id"] in fav_ids:
            b_copy = dict(b)
            prog = all_progress.get(b["id"])
            b_copy["progress"] = prog if prog else {"page": 1, "total_pages": 0, "percent": 0}
            b_copy["cover_url"] = f"/api/cover/{b['id']}"
            b_copy["is_favorite"] = True
            b_copy["tags"] = tags_mgr.get_book_tags(b["id"])
            books.append(b_copy)
    return {
        "favorite_ids": [b["id"] for b in books],
        "books": books,
        "count": len(books)
    }

@app.post("/api/favorites/toggle")
def toggle_favorite(
    payload: ToggleFavoritePayload,
    user: str = Depends(get_request_user),
    user_mgr: UserManager = Depends(get_user_mgr)
):
    """Toggles a book's favorite status."""
    favorites_mgr = user_mgr.get_favorites_mgr(user)
    is_fav = favorites_mgr.toggle_favorite(payload.book_id)
    return {
        "status": "ok",
        "book_id": payload.book_id,
        "is_favorite": is_fav,
        "favorite_ids": favorites_mgr.get_favorite_ids()
    }

# --- Virtual Tags & Custom Collections API ---

@app.get("/api/tags")
def list_tags(
    library_id: Optional[str] = Query(None),
    user: str = Depends(get_request_user),
    scanner: LibraryScanner = Depends(get_scanner),
    user_mgr: UserManager = Depends(get_user_mgr)
):
    """Returns all virtual tags with book counts strictly scoped to library and user."""
    tags_mgr = user_mgr.get_tags_mgr(user)
    lib_val = library_id if isinstance(library_id, str) and library_id.strip() else None
    if lib_val:
        lib_books = scanner.get_books(library_id=lib_val)
        book_ids = {b["id"] for b in lib_books}
        return {"tags": tags_mgr.get_tags(library_id=lib_val, book_ids_in_scope=book_ids)}
    return {"tags": tags_mgr.get_tags()}

@app.post("/api/tags")
def create_tag(
    payload: CreateTagPayload,
    user: str = Depends(get_request_user),
    user_mgr: UserManager = Depends(get_user_mgr)
):
    """Creates a new virtual tag scoped to a specific library."""
    tags_mgr = user_mgr.get_tags_mgr(user)
    clean = payload.name.strip()
    if not clean:
        raise HTTPException(status_code=400, detail="Tag name cannot be empty")
    lib_id = payload.library_id.strip() if payload.library_id and payload.library_id.strip() else "default"
    tag = tags_mgr.create_tag(clean, payload.color or "amber", library_id=lib_id)
    return {"status": "ok", "tag": tag, "tags": tags_mgr.get_tags(library_id=lib_id)}

@app.put("/api/tags/{tag_id}")
def update_tag(
    tag_id: str,
    payload: UpdateTagPayload,
    library_id: Optional[str] = Query(None),
    user: str = Depends(get_request_user),
    user_mgr: UserManager = Depends(get_user_mgr)
):
    """Updates an existing tag's name or color."""
    tags_mgr = user_mgr.get_tags_mgr(user)
    existing_tag = tags_mgr.get_tag(tag_id)
    tag = tags_mgr.update_tag(tag_id, name=payload.name, color=payload.color)
    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found")
    lib_val = library_id or (existing_tag.get("library_id") if existing_tag else None)
    return {"status": "ok", "tag": tag, "tags": tags_mgr.get_tags(library_id=lib_val)}

@app.delete("/api/tags/{tag_id}")
def delete_tag(
    tag_id: str,
    library_id: Optional[str] = Query(None),
    user: str = Depends(get_request_user),
    user_mgr: UserManager = Depends(get_user_mgr)
):
    """Deletes a virtual tag and untags all books."""
    tags_mgr = user_mgr.get_tags_mgr(user)
    existing_tag = tags_mgr.get_tag(tag_id)
    lib_val = library_id or (existing_tag.get("library_id") if existing_tag else None)
    success = tags_mgr.delete_tag(tag_id)
    if not success:
        raise HTTPException(status_code=404, detail="Tag not found")
    return {"status": "ok", "tags": tags_mgr.get_tags(library_id=lib_val)}

@app.get("/api/books/{book_id}/tags")
def get_book_tags(
    book_id: str,
    user: str = Depends(get_request_user),
    user_mgr: UserManager = Depends(get_user_mgr)
):
    """Returns the tags assigned to a book."""
    tags_mgr = user_mgr.get_tags_mgr(user)
    return {"tags": tags_mgr.get_book_tags(book_id)}

@app.post("/api/books/{book_id}/tags")
def set_book_tags(
    book_id: str,
    payload: SetBookTagsPayload,
    user: str = Depends(get_request_user),
    scanner: LibraryScanner = Depends(get_scanner),
    user_mgr: UserManager = Depends(get_user_mgr)
):
    """Sets the tags for a book."""
    tags_mgr = user_mgr.get_tags_mgr(user)
    b = scanner.find_book(book_id)
    if not b:
        raise HTTPException(status_code=404, detail="Book not found")
    tags = tags_mgr.set_book_tags(book_id, payload.tag_ids)
    return {"status": "ok", "book_id": book_id, "tags": tags}

@app.post("/api/books/{book_id}/tags/toggle")
def toggle_book_tag(
    book_id: str,
    payload: ToggleBookTagPayload,
    user: str = Depends(get_request_user),
    scanner: LibraryScanner = Depends(get_scanner),
    user_mgr: UserManager = Depends(get_user_mgr)
):
    """Toggles a tag on a book."""
    tags_mgr = user_mgr.get_tags_mgr(user)
    b = scanner.find_book(book_id)
    if not b:
        raise HTTPException(status_code=404, detail="Book not found")
    is_assigned = tags_mgr.toggle_book_tag(book_id, payload.tag_id)
    return {
        "status": "ok",
        "book_id": book_id,
        "tag_id": payload.tag_id,
        "is_assigned": is_assigned,
        "tags": tags_mgr.get_book_tags(book_id)
    }

@app.get("/api/annotations/{book_id}")
def get_annotations(
    book_id: str,
    user: str = Depends(get_request_user),
    user_mgr: UserManager = Depends(get_user_mgr)
):
    """Returns all highlights and comments for a book."""
    annotations_mgr = user_mgr.get_annotations_mgr(user)
    return {"annotations": annotations_mgr.get_annotations(book_id)}

@app.post("/api/annotations")
def create_annotation(
    payload: AnnotationPayload,
    user: str = Depends(get_request_user),
    user_mgr: UserManager = Depends(get_user_mgr)
):
    """Saves a new highlight or comment for a book."""
    annotations_mgr = user_mgr.get_annotations_mgr(user)
    data = payload.model_dump() if hasattr(payload, "model_dump") else payload.dict()
    record = annotations_mgr.add_annotation(payload.book_id, data)
    return {"status": "ok", "annotation": record}

@app.put("/api/annotations/{book_id}/{annotation_id}")
def update_annotation(
    book_id: str,
    annotation_id: str,
    payload: UpdateAnnotationPayload,
    user: str = Depends(get_request_user),
    user_mgr: UserManager = Depends(get_user_mgr)
):
    """Updates an existing annotation's comment or color."""
    annotations_mgr = user_mgr.get_annotations_mgr(user)
    data = {}
    if payload.comment is not None:
        data["comment"] = payload.comment
    if payload.color is not None:
        data["color"] = payload.color
    record = annotations_mgr.update_annotation(book_id, annotation_id, data)
    if not record:
        raise HTTPException(status_code=404, detail="Annotation not found")
    return {"status": "ok", "annotation": record}

@app.delete("/api/annotations/{book_id}/{annotation_id}")
def delete_annotation(
    book_id: str,
    annotation_id: str,
    user: str = Depends(get_request_user),
    user_mgr: UserManager = Depends(get_user_mgr)
):
    """Deletes an annotation."""
    annotations_mgr = user_mgr.get_annotations_mgr(user)
    success = annotations_mgr.delete_annotation(book_id, annotation_id)
    if not success:
        raise HTTPException(status_code=404, detail="Annotation not found")
    return {"status": "ok"}

@app.get("/api/lookup/define")
def define_word(
    word: str = Query(..., description="Word to define"),
    lang: Optional[str] = Query("en", description="Target language code for definitions"),
    lookup_mgr: LookupManager = Depends(get_lookup_mgr)
):
    """Returns definitions, parts of speech, and examples for a word."""
    if not word.strip():
        raise HTTPException(status_code=400, detail="Word parameter cannot be empty")
    return lookup_mgr.define_word(word.strip(), lang=lang or "en")

@app.post("/api/lookup/translate")
def translate_text(
    payload: TranslatePayload,
    lookup_mgr: LookupManager = Depends(get_lookup_mgr)
):
    """Translates text to target language."""
    if not payload.text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty")
    return lookup_mgr.translate_text(
        payload.text.strip(),
        target_lang=payload.target_lang or "pt",
        source_lang=payload.source_lang or "auto"
    )

@app.get("/api/lookup/translate")
def translate_text_get(
    text: str = Query(..., description="Text to translate"),
    target: Optional[str] = Query("pt", description="Target language code"),
    source: Optional[str] = Query("auto", description="Source language code"),
    lookup_mgr: LookupManager = Depends(get_lookup_mgr)
):
    """Translates text to target language (convenience GET endpoint)."""
    if not text.strip():
        raise HTTPException(status_code=400, detail="Text parameter cannot be empty")
    return lookup_mgr.translate_text(
        text.strip(),
        target_lang=target or "pt",
        source_lang=source or "auto"
    )

# If client production build exists, mount static assets and index.html fallback
if os.path.exists(CLIENT_DIST):
    app.mount("/assets", StaticFiles(directory=os.path.join(CLIENT_DIST, "assets")), name="assets")

    @app.get("/")
    async def serve_root():
        return FileResponse(os.path.join(CLIENT_DIST, "index.html"))

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        if full_path.startswith("api/"):
            raise HTTPException(status_code=404, detail="Endpoint not found")
        file_path = os.path.join(CLIENT_DIST, full_path)
        if os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(CLIENT_DIST, "index.html"))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server.main:app", host="127.0.0.1", port=8000, reload=True)
