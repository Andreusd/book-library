import os
from typing import Optional
from fastapi import APIRouter, HTTPException, Query, Depends

from ..scanner import LibraryScanner
from ..covers import CoverManager
from ..deps import get_scanner, get_cover_mgr
from ..schemas import (
    AddLibraryPayload,
    UpdateLibraryPayload,
    SetActiveLibraryPayload,
    SettingsPayload,
    DisplaySettingsPayload,
    ValidatePathPayload,
)

router = APIRouter(tags=["libraries"])

@router.get("/api/libraries")
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

@router.post("/api/libraries")
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

@router.put("/api/libraries/{library_id}")
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

@router.delete("/api/libraries/{library_id}")
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

@router.post("/api/libraries/active")
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

@router.get("/api/settings")
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
        "book_animations": scanner.config_mgr.get_book_animations(),
    }

@router.post("/api/settings/display")
def update_display_settings(payload: DisplaySettingsPayload, scanner: LibraryScanner = Depends(get_scanner)):
    """Updates display preferences such as showing/hiding file extension tags or book animations."""
    res = {"status": "ok"}
    if payload.show_file_extension is not None:
        res["show_file_extension"] = scanner.config_mgr.set_show_file_extension(payload.show_file_extension)
    else:
        res["show_file_extension"] = scanner.config_mgr.get_show_file_extension()

    if payload.book_animations is not None:
        res["book_animations"] = scanner.config_mgr.set_book_animations(payload.book_animations)
    else:
        res["book_animations"] = scanner.config_mgr.get_book_animations()

    return res

@router.post("/api/settings/validate")
def validate_settings_path(payload: ValidatePathPayload, scanner: LibraryScanner = Depends(get_scanner)):
    """Validates a prospective book library folder path."""
    return scanner.config_mgr.validate_path(payload.path)

@router.post("/api/settings")
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
