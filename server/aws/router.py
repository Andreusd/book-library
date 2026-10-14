import os
from typing import Optional, List, Dict, Any
from pydantic import BaseModel
from fastapi import APIRouter, HTTPException, Depends, Query
from fastapi.responses import RedirectResponse

from .dynamo import DynamoDBManager
from .s3 import S3StorageManager
from .auth import get_current_user

router = APIRouter(prefix="/api", tags=["library-api"])

_dynamo_mgr = DynamoDBManager()
_s3_mgr = S3StorageManager()

# --- Schemas ---

class UploadRequestPayload(BaseModel):
    filename: str
    file_size: int
    format: str = "pdf"
    category: str = "General"
    sha256_hash: str

class RenameBookPayload(BaseModel):
    title: str
    category: Optional[str] = None

class SaveProgressPayload(BaseModel):
    book_id: Optional[str] = None
    page: int = 1
    total_pages: int = 0
    percent: float = 0.0
    cfi: Optional[str] = None
    status: str = "in_progress"
    zoom: float = 1.2
    invert_colors: bool = False

class ToggleFavoritePayload(BaseModel):
    book_id: str

class RenameFolderPayload(BaseModel):
    folder_id: Optional[str] = None
    shelf_id: Optional[str] = None
    custom_name: str
    library_id: Optional[str] = None

class SetFolderIconPayload(BaseModel):
    folder_id: Optional[str] = None
    shelf_id: Optional[str] = None
    icon: str
    library_id: Optional[str] = None


# --- Helper: format book for frontend ---

def format_book_item(b: Dict[str, Any], user_prog: Optional[Dict[str, Any]] = None, is_fav: bool = False) -> Dict[str, Any]:
    b_id = b["id"]
    title = b.get("title", "Untitled")
    file_size = int(b.get("file_size", 0))
    size_mb = round(file_size / (1024 * 1024), 1)
    size_str = f"{size_mb} MB" if size_mb >= 1 else f"{round(file_size / 1024)} KB"
    category = b.get("primary_category", "General")
    fmt = b.get("format", "pdf").lower()

    prog = user_prog.get(b_id, {"page": 1, "percent": 0, "total_pages": int(b.get("total_pages", 0))}) if user_prog else {"page": 1, "percent": 0, "total_pages": int(b.get("total_pages", 0))}

    return {
        "id": b_id,
        "title": title,
        "filename": b.get("original_filename", f"{title}.{fmt}"),
        "format": fmt,
        "size": file_size,
        "file_size": file_size,
        "size_formatted": size_str,
        "folder": category,
        "shelf": category,
        "folder_display": category,
        "shelf_display": category,
        "category": category,
        "categories": b.get("categories", [category]),
        "cover_url": f"/api/cover/{b_id}",
        "stream_url": f"/api/pdf/{b_id}" if fmt == "pdf" else f"/api/epub/{b_id}",
        "progress": prog,
        "is_favorite": is_fav,
        "tags": [],
        "created_at": b.get("created_at", 0)
    }


# ==========================================
# 1. LIBRARIES & SHELVES / FOLDERS
# ==========================================

@router.get("/libraries")
def list_libraries(library_id: Optional[str] = Query(None), user: str = Depends(get_current_user)):
    """Returns configured libraries list."""
    categories = _dynamo_mgr.get_categories("default")
    books = _dynamo_mgr.list_books("default")
    return {
        "libraries": [
            {
                "id": "default",
                "name": "Nuvem AWS (S3)",
                "path": "s3://uzi-library",
                "is_active": True,
                "folder_count": len(categories),
                "book_count": len(books),
                "valid": True,
                "sample_covers": []
            }
        ],
        "active_library_id": "default"
    }

@router.get("/folders")
@router.get("/shelves")
def list_folders(library_id: Optional[str] = Query(None), user: str = Depends(get_current_user)):
    """Returns categories as folders/shelves."""
    categories = _dynamo_mgr.get_categories(library_id or "default")
    total_books = sum(c["book_count"] for c in categories)
    folder_list = [
        {
            "id": c["name"],
            "name": c["name"],
            "folder_name": c["name"],
            "path": c["name"],
            "book_count": c["book_count"],
            "icon": "book"
        }
        for c in categories
    ]
    return {
        "folders": folder_list,
        "shelves": folder_list,
        "total_folders": len(folder_list),
        "total_shelves": len(folder_list),
        "total_books": total_books,
        "library_id": library_id or "default"
    }

@router.post("/folders/rename")
@router.post("/shelves/rename")
def rename_folder(payload: RenameFolderPayload, user: str = Depends(get_current_user)):
    return {"status": "ok", "name": payload.custom_name}

@router.post("/folders/icon")
@router.post("/shelves/icon")
def set_folder_icon(payload: SetFolderIconPayload, user: str = Depends(get_current_user)):
    return {"status": "ok", "icon": payload.icon}


# ==========================================
# 2. BOOKS & DETAILS
# ==========================================

@router.get("/books")
def list_books(
    shelf: Optional[str] = Query(None),
    folder: Optional[str] = Query(None),
    tag: Optional[str] = Query(None),
    library_id: Optional[str] = Query(None),
    query: Optional[str] = Query(None),
    sort: Optional[str] = Query("title_asc"),
    user: str = Depends(get_current_user)
):
    """Lists books from DynamoDB, optionally filtered by shelf/folder/category."""
    target_lib = library_id or "default"
    target_shelf = shelf or folder
    if target_shelf in ["all-books", "folders", "tags", "", None]:
        target_shelf = None

    books = _dynamo_mgr.list_books(library_id=target_lib, category=target_shelf)
    user_prog = _dynamo_mgr.get_all_progress(user)

    enriched = []
    for b in books:
        title = b.get("title", "")
        if query and query.lower() not in title.lower():
            continue

        is_fav = _dynamo_mgr.is_favorite(user, b["id"])
        item = format_book_item(b, user_prog=user_prog, is_fav=is_fav)
        enriched.append(item)

    # Sort
    if sort == "title_desc":
        enriched.sort(key=lambda x: x["title"].lower(), reverse=True)
    elif sort == "size_desc":
        enriched.sort(key=lambda x: x["size"], reverse=True)
    elif sort == "recent":
        enriched.sort(key=lambda x: x.get("created_at", 0), reverse=True)
    else:
        enriched.sort(key=lambda x: x["title"].lower())

    return {"books": enriched, "total": len(enriched)}

@router.get("/book/{book_id}")
def get_book(book_id: str, user: str = Depends(get_current_user)):
    """Returns single book details."""
    book = _dynamo_mgr.get_book(book_id)
    if not book:
        raise HTTPException(status_code=404, detail="Livro não encontrado")

    prog = _dynamo_mgr.get_progress(user, book_id)
    is_fav = _dynamo_mgr.is_favorite(user, book_id)
    res = format_book_item(book, user_prog={book_id: prog} if prog else None, is_fav=is_fav)
    res["annotations"] = []
    res["annotations_count"] = 0
    return res


# ==========================================
# 3. STREAMING & COVERS (S3 PRESIGNED REDIRECTS)
# ==========================================

@router.get("/pdf/{book_id}")
@router.get("/epub/{book_id}")
@router.get("/epub/{book_id}.epub")
@router.get("/book-file/{book_id}")
def stream_book_file(book_id: str, user: str = Depends(get_current_user)):
    """Generates S3 Presigned URL and redirects browser/reader directly to S3."""
    clean_id = book_id.removesuffix(".epub").removesuffix(".pdf")
    book = _dynamo_mgr.get_book(clean_id) or _dynamo_mgr.get_book(book_id)
    if not book:
        raise HTTPException(status_code=404, detail="Livro não encontrado")

    filename = book.get("original_filename", f"{book['title']}.{book.get('format', 'pdf')}")
    url = _s3_mgr.generate_download_url(s3_key=book["s3_key"], filename=filename)
    return RedirectResponse(url=url, status_code=307)

@router.get("/cover/{book_id}")
def get_cover_image(book_id: str):
    """Generates S3 Presigned URL for book cover and redirects."""
    book = _dynamo_mgr.get_book(book_id)
    if not book:
        raise HTTPException(status_code=404, detail="Capa não encontrada")

    cover_key = book.get("cover_key", f"covers/{book_id}.webp")
    url = _s3_mgr.generate_download_url(s3_key=cover_key)
    return RedirectResponse(url=url, status_code=307)


# ==========================================
# 4. PROGRESS & FAVORITES
# ==========================================

@router.post("/progress")
def save_progress(payload: SaveProgressPayload, user: str = Depends(get_current_user)):
    if not payload.book_id:
        raise HTTPException(status_code=400, detail="book_id is required")
    saved = _dynamo_mgr.save_progress(user, payload.book_id, payload.dict())
    return {"status": "ok", "progress": saved}

@router.get("/continue-reading")
def get_continue_reading(library_id: Optional[str] = Query(None), user: str = Depends(get_current_user)):
    all_prog = _dynamo_mgr.get_all_progress(user)
    results = []
    for b_id, prog in all_prog.items():
        if prog.get("percent", 0) > 0 and prog.get("status") == "in_progress":
            b = _dynamo_mgr.get_book(b_id, library_id or "default")
            if b:
                is_fav = _dynamo_mgr.is_favorite(user, b_id)
                results.append(format_book_item(b, user_prog={b_id: prog}, is_fav=is_fav))
    return {"books": results[:10]}

@router.get("/favorites")
def get_favorites(library_id: Optional[str] = Query(None), user: str = Depends(get_current_user)):
    books = _dynamo_mgr.list_books(library_id or "default")
    user_prog = _dynamo_mgr.get_all_progress(user)
    fav_books = []
    fav_ids = []
    for b in books:
        if _dynamo_mgr.is_favorite(user, b["id"]):
            fav_books.append(format_book_item(b, user_prog=user_prog, is_fav=True))
            fav_ids.append(b["id"])
    return {"books": fav_books, "favorite_ids": fav_ids}

@router.post("/favorites/toggle")
def toggle_favorite(payload: ToggleFavoritePayload, user: str = Depends(get_current_user)):
    is_fav = _dynamo_mgr.toggle_favorite(user, payload.book_id)
    return {"status": "ok", "is_favorite": is_fav}

@router.get("/tags")
def get_tags(library_id: Optional[str] = Query(None), user: str = Depends(get_current_user)):
    return {"tags": []}

@router.get("/settings")
def get_settings(library_id: Optional[str] = Query(None), user: str = Depends(get_current_user)):
    return {
        "library_path": "s3://uzi-library",
        "show_file_extension": False,
        "libraries": [
            {
                "id": "default",
                "name": "Nuvem AWS (S3)",
                "path": "s3://uzi-library"
            }
        ],
        "active_library_id": "default"
    }

@router.get("/users")
def get_users(user: str = Depends(get_current_user)):
    return {
        "users": [user],
        "active_user": user
    }


# ==========================================
# 5. AWS ADVANCED & MANAGEMENT ENDPOINTS
# ==========================================

@router.get("/aws/categories")
def get_aws_categories(user: str = Depends(get_current_user)):
    return {"categories": _dynamo_mgr.get_categories()}

@router.get("/aws/books")
def get_aws_books(category: Optional[str] = Query(None), user: str = Depends(get_current_user)):
    return list_books(shelf=category, user=user)

@router.post("/books/upload-request")
def request_upload(payload: UploadRequestPayload, user: str = Depends(get_current_user)):
    book_id = payload.sha256_hash.strip().lower()
    existing = _dynamo_mgr.get_book(book_id)
    if existing:
        return {
            "exists": True,
            "book": existing,
            "message": "Livro já cadastrado na biblioteca com este conteúdo binário."
        }

    content_type = "application/pdf" if payload.format.lower() == "pdf" else "application/epub+zip"
    upload_data = _s3_mgr.generate_upload_url(
        book_id=book_id,
        extension=payload.format,
        content_type=content_type
    )

    clean_title = os.path.splitext(payload.filename)[0].replace("_", " ").strip()
    _dynamo_mgr.save_book({
        "id": book_id,
        "title": clean_title,
        "original_filename": payload.filename,
        "format": payload.format.lower(),
        "file_size": payload.file_size,
        "primary_category": payload.category or "General",
        "categories": [payload.category or "General"],
        "s3_key": upload_data["s3_key"]
    })

    return {
        "exists": False,
        "book_id": book_id,
        "upload_url": upload_data["upload_url"],
        "s3_key": upload_data["s3_key"]
    }

@router.patch("/books/{book_id}")
def rename_book(book_id: str, payload: RenameBookPayload, user: str = Depends(get_current_user)):
    book = _dynamo_mgr.get_book(book_id)
    if not book:
        raise HTTPException(status_code=404, detail="Livro não encontrado")

    book["title"] = payload.title.strip()
    if payload.category:
        book["primary_category"] = payload.category.strip()
        if payload.category not in book.get("categories", []):
            book["categories"] = [payload.category]

    updated = _dynamo_mgr.save_book(book)
    return {"status": "ok", "book": updated}

@router.delete("/books/{book_id}")
def delete_book(book_id: str, user: str = Depends(get_current_user)):
    book = _dynamo_mgr.get_book(book_id)
    if not book:
        raise HTTPException(status_code=404, detail="Livro não encontrado")

    _s3_mgr.delete_book_files(book_id, file_format=book.get("format", "pdf"))
    _dynamo_mgr.delete_book(book_id)
    return {"status": "ok", "deleted_id": book_id}
