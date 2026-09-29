from typing import Optional
from fastapi import APIRouter, HTTPException, Query, Depends

from ..lookup import LookupManager
from ..deps import get_lookup_mgr
from ..schemas import TranslatePayload

router = APIRouter(tags=["lookup"])

@router.get("/api/lookup/define")
def define_word(
    word: str = Query(..., description="Word to define"),
    lang: Optional[str] = Query("en", description="Target language code for definitions"),
    lookup_mgr: LookupManager = Depends(get_lookup_mgr)
):
    """Returns definitions, parts of speech, and examples for a word."""
    if not word.strip():
        raise HTTPException(status_code=400, detail="Word parameter cannot be empty")
    return lookup_mgr.define_word(word.strip(), lang=lang or "en")

@router.post("/api/lookup/translate")
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

@router.get("/api/lookup/translate")
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
