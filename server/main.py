import os
import sys
from typing import Optional, List, Dict, Any
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Query, Request, status
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

# Base paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CLIENT_DIST = os.path.abspath(os.path.join(BASE_DIR, "..", "client", "dist"))

# Core components
scanner = LibraryScanner()
cover_mgr = CoverManager()
tracker = ProgressTracker()
annotations_mgr = AnnotationsManager()
favorites_mgr = FavoritesManager()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Pre-cache covers in the background on startup
    books = scanner.get_books()
    print(f"Discovered {len(books)} books across {len(scanner.get_shelves())} shelves.")
    cover_mgr.pre_cache_all(books)
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

class SetShelfIconPayload(BaseModel):
    shelf_id: Optional[str] = None
    folder_id: Optional[str] = None
    icon: str

class ToggleFavoritePayload(BaseModel):
    book_id: str

class SettingsPayload(BaseModel):
    library_path: str

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
    page: int
    text: str
    color: str = "yellow"
    comment: Optional[str] = ""
    rects: List[Dict[str, Any]] = []

class UpdateAnnotationPayload(BaseModel):
    comment: Optional[str] = None
    color: Optional[str] = None

@app.get("/api/libraries")
def list_libraries():
    """Returns list of all configured libraries with validation and folder/book counts."""
    active_id = scanner.config_mgr.get_active_library_id()
    libs = scanner.config_mgr.get_libraries()
    results = []
    for lib in libs:
        val = scanner.config_mgr.validate_path(lib["path"])
        results.append({
            "id": lib["id"],
            "name": lib["name"],
            "path": lib["path"],
            "is_active": lib["id"] == active_id,
            "folder_count": val.get("folder_count", 0),
            "book_count": val.get("book_count", 0),
            "valid": val.get("valid", False),
            "error": val.get("error")
        })
    return {
        "libraries": results,
        "active_library_id": active_id
    }

@app.post("/api/libraries")
def add_library(payload: AddLibraryPayload):
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
def update_library(library_id: str, payload: UpdateLibraryPayload):
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
def delete_library(library_id: str):
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
def set_active_library(payload: SetActiveLibraryPayload):
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
def get_settings():
    """Returns the current book library folder path and validation status."""
    path = scanner.library_path
    validation = scanner.config_mgr.validate_path(path) if path else {
        "valid": False, "exists": False, "is_dir": False, "shelf_count": 0, "folder_count": 0, "book_count": 0, "error": "path_empty", "normalized_path": ""
    }
    return {
        "library_path": path,
        "active_library_id": scanner.config_mgr.get_active_library_id(),
        "libraries": scanner.config_mgr.get_libraries(),
        "validation": validation,
    }

@app.post("/api/settings/validate")
def validate_settings_path(payload: ValidatePathPayload):
    """Validates a prospective book library folder path."""
    return scanner.config_mgr.validate_path(payload.path)

@app.post("/api/settings")
def save_settings(payload: SettingsPayload):
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
def list_folders(library_id: Optional[str] = Query(None)):
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
def rename_folder(payload: RenameShelfPayload):
    """Virtually renames a folder inside the app without changing the physical folder."""
    target_id = payload.folder_id or payload.shelf_id
    if not target_id:
        raise HTTPException(status_code=400, detail="Missing folder_id or shelf_id")
    scanner.set_shelf_alias(target_id, payload.custom_name)
    folders = scanner.get_folders()
    return {
        "status": "ok",
        "folders": folders,
        "shelves": folders,
        "folder_id": target_id,
        "shelf_id": target_id,
        "name": scanner.get_shelf_display_name(target_id)
    }

@app.post("/api/folders/icon")
@app.post("/api/shelves/icon")
def set_folder_icon(payload: SetShelfIconPayload):
    """Sets or resets the icon for a folder without changing the physical folder."""
    target_id = payload.folder_id or payload.shelf_id
    if not target_id:
        raise HTTPException(status_code=400, detail="Missing folder_id or shelf_id")
    icon = scanner.set_shelf_icon(target_id, payload.icon)
    folders = scanner.get_folders()
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
    library_id: Optional[str] = Query(None, description="Filter by library ID"),
    query: Optional[str] = Query(None, description="Search query across titles"),
    sort: Optional[str] = Query("title_asc", description="Sort order: title_asc, title_desc, size_desc, recent")
):
    """Returns books enriched with reading progress, favorite status, and cover URLs, strictly isolated by library."""
    shelf_val = shelf if isinstance(shelf, str) else None
    folder_val = folder if isinstance(folder, str) else None
    query_val = query if isinstance(query, str) else None
    sort_val = sort if isinstance(sort, str) else "title_asc"
    lib_val = library_id if isinstance(library_id, str) else None

    active_filter = folder_val or shelf_val
    if active_filter == "favorites":
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

    # Enrich each book with reading progress, favorite status, and cover URL
    for b in books:
        prog = all_progress.get(b["id"])
        b["progress"] = prog if prog else {"page": 1, "total_pages": 0, "percent": 0}
        b["cover_url"] = f"/api/cover/{b['id']}"
        b["is_favorite"] = favorites_mgr.is_favorite(b["id"])

    # Filter by search query if provided
    if query_val:
        q = query_val.lower().strip()
        books = [b for b in books if q in b["title"].lower() or q in b.get("folder_display", "").lower() or q in b.get("shelf_display", "").lower()]

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
def continue_reading(library_id: Optional[str] = Query(None)):
    """Returns recently opened books that have reading progress, strictly scoped to library."""
    lib_val = library_id if isinstance(library_id, str) else None
    recents = tracker.get_recent(limit=25)
    # Strictly isolate: only books physically belonging to this library
    lib_books = {b["id"]: b for b in scanner.get_books(library_id=lib_val)}
    results = []
    for r in recents:
        b = lib_books.get(r["book_id"])
        if b:
            b_copy = dict(b)
            prog = {
                "page": r.get("page", 1),
                "total_pages": r.get("total_pages", 100),
                "percent": r.get("percent", 0),
                "status": r.get("status", "in_progress"),
                "zoom": r.get("zoom", 1.2),
                "invert_colors": r.get("invert_colors", False),
                "updated_at": r.get("updated_at", "")
            }
            if "cfi" in r and r["cfi"]:
                prog["cfi"] = r["cfi"]
            b_copy["progress"] = prog
            b_copy["cover_url"] = f"/api/cover/{b['id']}"
            b_copy["is_favorite"] = favorites_mgr.is_favorite(b["id"])
            results.append(b_copy)
            if len(results) >= 10:
                break
    return {"books": results}

@app.post("/api/progress")
def save_progress(payload: ProgressPayload):
    """Saves the current reading page/cfi, zoom, and night reading mode for a book."""
    record = tracker.set_progress(
        payload.book_id, 
        payload.page, 
        payload.total_pages, 
        payload.zoom,
        payload.invert_colors,
        payload.cfi,
        payload.percent
    )
    return {"status": "ok", "progress": record}

@app.post("/api/book/zoom")
def save_zoom(payload: ZoomPayload):
    """Saves the preferred zoom level for a book."""
    record = tracker.set_zoom(payload.book_id, payload.zoom)
    return {"status": "ok", "record": record}

@app.post("/api/book/night-mode")
def save_night_mode(payload: NightModePayload):
    """Saves the preferred night reading mode (invert colors) for a book."""
    record = tracker.set_night_mode(payload.book_id, payload.invert_colors)
    return {"status": "ok", "record": record}

@app.post("/api/book/status")
def update_book_status(payload: StatusPayload):
    """Marks a book as not started or completed."""
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
def get_book(book_id: str):
    """Returns details for a single book."""
    b = scanner.find_book(book_id)
    if not b:
        raise HTTPException(status_code=404, detail="Book not found")
    b_copy = dict(b)
    prog = tracker.get_progress(book_id)
    b_copy["progress"] = prog if prog else {"page": 1, "total_pages": 0, "percent": 0}
    b_copy["cover_url"] = f"/api/cover/{book_id}"
    b_copy["is_favorite"] = favorites_mgr.is_favorite(book_id)
    return b_copy

@app.get("/api/cover/{book_id}")
def get_cover(book_id: str):
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
def stream_book_file(book_id: str):
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
def get_favorites(library_id: Optional[str] = Query(None)):
    """Returns list of favorite book IDs and favorite books strictly scoped to library."""
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
            books.append(b_copy)
    return {
        "favorite_ids": [b["id"] for b in books],
        "books": books,
        "count": len(books)
    }

@app.post("/api/favorites/toggle")
def toggle_favorite(payload: ToggleFavoritePayload):
    """Toggles a book's favorite status."""
    is_fav = favorites_mgr.toggle_favorite(payload.book_id)
    return {
        "status": "ok",
        "book_id": payload.book_id,
        "is_favorite": is_fav,
        "favorite_ids": favorites_mgr.get_favorite_ids()
    }

@app.get("/api/annotations/{book_id}")
def get_annotations(book_id: str):
    """Returns all highlights and comments for a book."""
    return {"annotations": annotations_mgr.get_annotations(book_id)}

@app.post("/api/annotations")
def create_annotation(payload: AnnotationPayload):
    """Saves a new highlight or comment for a book."""
    record = annotations_mgr.add_annotation(payload.book_id, payload.dict())
    return {"status": "ok", "annotation": record}

@app.put("/api/annotations/{book_id}/{annotation_id}")
def update_annotation(book_id: str, annotation_id: str, payload: UpdateAnnotationPayload):
    """Updates an existing annotation's comment or color."""
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
def delete_annotation(book_id: str, annotation_id: str):
    """Deletes an annotation."""
    success = annotations_mgr.delete_annotation(book_id, annotation_id)
    if not success:
        raise HTTPException(status_code=404, detail="Annotation not found")
    return {"status": "ok"}

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
