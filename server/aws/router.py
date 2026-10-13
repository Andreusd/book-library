import os
import hashlib
from typing import Optional, List, Dict, Any
from pydantic import BaseModel
from fastapi import APIRouter, HTTPException, Depends, Query

from .dynamo import DynamoDBManager
from .s3 import S3StorageManager
from .auth import get_current_user

router = APIRouter(prefix="/api/aws", tags=["aws-books"])

_dynamo_mgr = DynamoDBManager()
_s3_mgr = S3StorageManager()

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
    page: int = 1
    total_pages: int = 0
    percent: float = 0.0
    cfi: Optional[str] = None
    status: str = "in_progress"
    zoom: float = 1.2
    invert_colors: bool = False

@router.get("/categories")
def get_categories(user: str = Depends(get_current_user)):
    """Returns all categories with book counts from DynamoDB."""
    return {"categories": _dynamo_mgr.get_categories()}

@router.get("/books")
def list_books(
    category: Optional[str] = Query(None),
    user: str = Depends(get_current_user)
):
    """Lists books from DynamoDB enriched with presigned URLs and user progress."""
    books = _dynamo_mgr.list_books(category=category)
    user_prog = _dynamo_mgr.get_all_progress(user)

    enriched = []
    for b in books:
        b_id = b["id"]
        item = dict(b)
        item["progress"] = user_prog.get(b_id, {"page": 1, "percent": 0, "total_pages": b.get("total_pages", 0)})
        item["is_favorite"] = _dynamo_mgr.is_favorite(user, b_id)
        # Generate presigned cover URL
        item["cover_url"] = _s3_mgr.generate_download_url(b.get("cover_key", f"covers/{b_id}.webp"))
        enriched.append(item)

    return {"books": enriched, "total": len(enriched)}

@router.get("/books/{book_id}")
def get_book_details(book_id: str, user: str = Depends(get_current_user)):
    """Returns single book metadata with streaming/reading URL."""
    book = _dynamo_mgr.get_book(book_id)
    if not book:
        raise HTTPException(status_code=404, detail="Livro não encontrado")

    item = dict(book)
    item["progress"] = _dynamo_mgr.get_progress(user, book_id) or {"page": 1, "percent": 0}
    item["is_favorite"] = _dynamo_mgr.is_favorite(user, book_id)
    item["stream_url"] = _s3_mgr.generate_download_url(book["s3_key"], filename=f"{book['title']}.{book['format']}")
    item["cover_url"] = _s3_mgr.generate_download_url(book.get("cover_key", f"covers/{book_id}.webp"))
    return item

@router.post("/books/upload-request")
def request_upload(payload: UploadRequestPayload, user: str = Depends(get_current_user)):
    """
    Step 1 of upload: Validates book uniqueness by SHA-256 hash
    and generates an S3 Presigned PUT URL for direct browser-to-S3 upload.
    """
    book_id = payload.sha256_hash.strip().lower()

    # Check if book already exists (deduplication)
    existing = _dynamo_mgr.get_book(book_id)
    if existing:
        return {
            "exists": True,
            "book": existing,
            "message": "Livro já cadastrado na biblioteca com este conteúdo binário."
        }

    # Generate Presigned PUT URL
    content_type = "application/pdf" if payload.format.lower() == "pdf" else "application/epub+zip"
    upload_data = _s3_mgr.generate_upload_url(
        book_id=book_id,
        extension=payload.format,
        content_type=content_type
    )

    # Pre-register metadata in DynamoDB
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
def rename_or_recategorize_book(
    book_id: str,
    payload: RenameBookPayload,
    user: str = Depends(get_current_user)
):
    """Zero-cost rename and recategorization in DynamoDB without modifying S3 files."""
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
    """Atomically deletes book from DynamoDB and S3."""
    book = _dynamo_mgr.get_book(book_id)
    if not book:
        raise HTTPException(status_code=404, detail="Livro não encontrado")

    # Delete from S3
    _s3_mgr.delete_book_files(book_id, file_format=book.get("format", "pdf"))
    # Delete from DynamoDB
    _dynamo_mgr.delete_book(book_id)

    return {"status": "ok", "deleted_id": book_id}

@router.post("/books/{book_id}/progress")
def save_reading_progress(
    book_id: str,
    payload: SaveProgressPayload,
    user: str = Depends(get_current_user)
):
    """Saves user reading progress in DynamoDB."""
    saved = _dynamo_mgr.save_progress(user, book_id, payload.dict())
    return {"status": "ok", "progress": saved}

@router.post("/books/{book_id}/favorite")
def toggle_favorite_book(book_id: str, user: str = Depends(get_current_user)):
    """Toggles favorite status in DynamoDB."""
    is_fav = _dynamo_mgr.toggle_favorite(user, book_id)
    return {"status": "ok", "is_favorite": is_fav}
