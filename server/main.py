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
    page: int
    total_pages: int
    zoom: Optional[float] = None

class ZoomPayload(BaseModel):
    book_id: str
    zoom: float

class StatusPayload(BaseModel):
    book_id: str
    status: str  # "not_started" | "completed"

class RenameShelfPayload(BaseModel):
    shelf_id: str
    custom_name: str

class ToggleFavoritePayload(BaseModel):
    book_id: str

class SettingsPayload(BaseModel):
    library_path: str

class ValidatePathPayload(BaseModel):
    path: str

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

@app.get("/api/settings")
def get_settings():
    """Returns the current book library folder path and validation status."""
    path = scanner.library_path
    validation = scanner.config_mgr.validate_path(path) if path else {
        "valid": False, "exists": False, "is_dir": False, "shelf_count": 0, "book_count": 0, "error": "path_empty", "normalized_path": ""
    }
    return {
        "library_path": path,
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
    return {
        "status": "ok",
        "library_path": saved_path,
        "shelves_count": len(scanner.get_shelves()),
        "books_count": len(books)
    }

@app.get("/api/shelves")
def list_shelves():
    """Returns list of all bookshelf categories with book counts."""
    shelves = scanner.get_shelves()
    total_books = sum(s["book_count"] for s in shelves)
    return {
        "shelves": shelves,
        "total_shelves": len(shelves),
        "total_books": total_books,
    }

@app.post("/api/shelves/rename")
def rename_shelf(payload: RenameShelfPayload):
    """Virtually renames a bookshelf inside the app without changing the physical folder."""
    scanner.set_shelf_alias(payload.shelf_id, payload.custom_name)
    return {
        "status": "ok",
        "shelves": scanner.get_shelves(),
        "shelf_id": payload.shelf_id,
        "name": scanner.get_shelf_display_name(payload.shelf_id)
    }

@app.get("/api/books")
def list_books(
    shelf: Optional[str] = Query(None, description="Filter by shelf name"),
    query: Optional[str] = Query(None, description="Search query across titles"),
    sort: Optional[str] = Query("title_asc", description="Sort order: title_asc, title_desc, size_desc, recent")
):
    """Returns books enriched with reading progress, favorite status, and cover URLs."""
    if shelf == "favorites":
        books = [b for b in scanner.get_books() if favorites_mgr.is_favorite(b["id"])]
    elif shelf == "continue-reading":
        all_prog = tracker.get_all()
        in_prog_ids = {
            b_id for b_id, p in all_prog.items()
            if p.get("status") not in ("not_started", "completed")
            and p.get("page", 1) > 1
            and p.get("percent", 0) < 100
        }
        books = [b for b in scanner.get_books() if b["id"] in in_prog_ids]
    else:
        books = scanner.get_books(shelf_filter=shelf)
    all_progress = tracker.get_all()

    # Enrich each book with reading progress, favorite status, and cover URL
    for b in books:
        prog = all_progress.get(b["id"])
        b["progress"] = prog if prog else {"page": 1, "total_pages": 0, "percent": 0}
        b["cover_url"] = f"/api/cover/{b['id']}"
        b["is_favorite"] = favorites_mgr.is_favorite(b["id"])

    # Filter by search query if provided
    if query:
        q = query.lower().strip()
        books = [b for b in books if q in b["title"].lower() or q in b["shelf_display"].lower()]

    # Sort
    if sort == "title_asc":
        books.sort(key=lambda x: x["title"].lower())
    elif sort == "title_desc":
        books.sort(key=lambda x: x["title"].lower(), reverse=True)
    elif sort == "size_desc":
        books.sort(key=lambda x: x["size_bytes"], reverse=True)
    elif sort == "recent":
        books.sort(key=lambda x: x["progress"].get("updated_at", ""), reverse=True)

    return {
        "books": books,
        "count": len(books),
    }

@app.get("/api/continue-reading")
def continue_reading():
    """Returns recently opened books that have reading progress."""
    recents = tracker.get_recent(limit=10)
    results = []
    for r in recents:
        b = scanner.find_book(r["book_id"])
        if b:
            b_copy = dict(b)
            b_copy["progress"] = {
                "page": r["page"],
                "total_pages": r["total_pages"],
                "percent": r["percent"],
                "updated_at": r["updated_at"]
            }
            b_copy["cover_url"] = f"/api/cover/{b['id']}"
            b_copy["is_favorite"] = favorites_mgr.is_favorite(b["id"])
            results.append(b_copy)
    return {"books": results}

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
def stream_pdf(book_id: str):
    """Streams the PDF file with byte-range support for fast in-browser rendering."""
    b = scanner.find_book(book_id)
    if not b or not os.path.exists(b["path"]):
        raise HTTPException(status_code=404, detail="PDF file not found")

    return FileResponse(
        b["path"],
        media_type="application/pdf",
        content_disposition_type="inline",
        filename=b["filename"]
    )

@app.post("/api/progress")
def save_progress(payload: ProgressPayload):
    """Saves the current reading page and zoom for a book."""
    record = tracker.set_progress(payload.book_id, payload.page, payload.total_pages, payload.zoom)
    return {"status": "ok", "progress": record}

@app.post("/api/book/zoom")
def save_zoom(payload: ZoomPayload):
    """Saves the preferred zoom level for a book."""
    record = tracker.set_zoom(payload.book_id, payload.zoom)
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
        total_pages = 1
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

@app.get("/api/favorites")
def get_favorites():
    """Returns list of favorite book IDs and favorite books enriched with progress and covers."""
    fav_ids = favorites_mgr.get_favorite_ids()
    books = []
    all_progress = tracker.get_all()
    for bid in fav_ids:
        b = scanner.find_book(bid)
        if b:
            b_copy = dict(b)
            prog = all_progress.get(bid)
            b_copy["progress"] = prog if prog else {"page": 1, "total_pages": 0, "percent": 0}
            b_copy["cover_url"] = f"/api/cover/{bid}"
            b_copy["is_favorite"] = True
            books.append(b_copy)
    return {
        "favorite_ids": fav_ids,
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
