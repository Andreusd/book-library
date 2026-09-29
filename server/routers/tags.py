from typing import Optional
from fastapi import APIRouter, HTTPException, Query, Depends

from ..scanner import LibraryScanner
from ..users import UserManager
from ..deps import (
    get_scanner,
    get_user_mgr,
    get_request_user,
)
from ..schemas import (
    CreateTagPayload,
    UpdateTagPayload,
    SetBookTagsPayload,
    ToggleBookTagPayload,
    AnnotationPayload,
    UpdateAnnotationPayload,
)

router = APIRouter(tags=["tags"])

# --- Virtual Tags & Custom Collections API ---

@router.get("/api/tags")
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

@router.post("/api/tags")
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

@router.put("/api/tags/{tag_id}")
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

@router.delete("/api/tags/{tag_id}")
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

@router.get("/api/books/{book_id}/tags")
def get_book_tags(
    book_id: str,
    user: str = Depends(get_request_user),
    user_mgr: UserManager = Depends(get_user_mgr)
):
    """Returns the tags assigned to a book."""
    tags_mgr = user_mgr.get_tags_mgr(user)
    return {"tags": tags_mgr.get_book_tags(book_id)}

@router.post("/api/books/{book_id}/tags")
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

@router.post("/api/books/{book_id}/tags/toggle")
def toggle_book_tag(
    book_id: str,
    payload: ToggleBookTagPayload,
    user: str = Depends(get_request_user),
    scanner: LibraryScanner = Depends(get_scanner),
    user_mgr: UserManager = Depends(get_user_mgr)
):
    """Touches or toggles a tag on a book."""
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

# --- Annotations API ---

@router.get("/api/annotations/{book_id}")
def get_annotations(
    book_id: str,
    user: str = Depends(get_request_user),
    user_mgr: UserManager = Depends(get_user_mgr)
):
    """Returns all highlights and comments for a book."""
    annotations_mgr = user_mgr.get_annotations_mgr(user)
    return {"annotations": annotations_mgr.get_annotations(book_id)}

@router.post("/api/annotations")
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

@router.put("/api/annotations/{book_id}/{annotation_id}")
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

@router.delete("/api/annotations/{book_id}/{annotation_id}")
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
