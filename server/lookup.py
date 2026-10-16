import os
import re
import json
import html
import threading
import urllib.request
import urllib.parse
from typing import Dict, Any, Optional, List
from .database import get_db, Database

CACHE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".cache"))
LOOKUPS_CACHE_FILE = os.path.join(CACHE_DIR, "library.db")

USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
WIKTIONARY_AGENT = "UziLibrary/1.0 (https://github.com/Andreusd/uzi-library; contact@uzilibrary.local)"

def clean_html(raw_html: str) -> str:
    """Removes HTML tags and unescapes HTML entities from text."""
    if not raw_html:
        return ""
    clean = re.sub(r'<[^>]+>', '', raw_html)
    clean = html.unescape(clean)
    clean = re.sub(r'\s+', ' ', clean).strip()
    return clean

def sanitize_word(raw_word: str) -> str:
    """Cleans punctuation and extra symbols around a word."""
    if not raw_word:
        return ""
    w = raw_word.strip()
    w = re.sub(r'^[^\w\u00C0-\u017F]+|[^\w\u00C0-\u017F]+$', '', w)
    return w.lower()

class LookupManager:
    """Provides definition and translation services with persistent caching in SQLite."""

    def __init__(self, cache_file: str = LOOKUPS_CACHE_FILE, db: Optional[Database] = None):
        self.cache_file = cache_file
        self.db = db or get_db(cache_file)
        self._lock = threading.RLock()

    def define_word(self, word: str, lang: str = "en") -> Dict[str, Any]:
        """
        Looks up a word definition using Wiktionary, Free Dictionary API, and Datamuse fallback.
        Results are cached in SQLite.
        """
        clean_word = sanitize_word(word)
        if not clean_word:
            return {"error": "empty_word", "word": word, "entries": []}

        cache_key = f"{lang.lower()}:{clean_word}"
        with self._lock:
            cached = self.db.get_lookup("definition", cache_key)
            if cached:
                return cached

        result = self._fetch_definition(clean_word, lang)
        if result and result.get("entries"):
            with self._lock:
                self.db.set_lookup("definition", cache_key, result)

        return result

    def _fetch_definition(self, word: str, lang: str) -> Dict[str, Any]:
        # 1. Try Wiktionary REST API (Multilingual support: en, pt, es, fr, etc.)
        try:
            wiktionary_url = f"https://en.wiktionary.org/api/rest_v1/page/definition/{urllib.parse.quote(word)}"
            req = urllib.request.Request(wiktionary_url, headers={"User-Agent": WIKTIONARY_AGENT})
            with urllib.request.urlopen(req, timeout=6) as res:
                if res.status == 200:
                    raw_data = json.loads(res.read().decode("utf-8"))
                    entries = []
                    available_langs = list(raw_data.keys())
                    target_keys = [lang.lower()] if lang.lower() in raw_data else (['en'] if 'en' in raw_data else available_langs[:1])
                    
                    for key in target_keys:
                        for section in raw_data.get(key, []):
                            pos = section.get("partOfSpeech", "General").capitalize()
                            defs = []
                            examples = []
                            for d in section.get("definitions", []):
                                clean_def = clean_html(d.get("definition", ""))
                                if clean_def and clean_def not in defs:
                                    defs.append(clean_def)
                                for ex in d.get("examples", []):
                                    clean_ex = clean_html(ex) if isinstance(ex, str) else clean_html(ex.get("example", ""))
                                    if clean_ex and clean_ex not in examples:
                                        examples.append(clean_ex)
                            if defs:
                                entries.append({
                                    "partOfSpeech": pos,
                                    "definitions": defs[:4],
                                    "examples": examples[:2]
                                })

                    if entries:
                        return {
                            "word": word,
                            "language": lang,
                            "entries": entries,
                            "source": "Wiktionary"
                        }
        except Exception:
            pass

        # 2. Try Free Dictionary API (English primary)
        try:
            url = f"https://api.dictionaryapi.dev/api/v2/entries/en/{urllib.parse.quote(word)}"
            req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
            with urllib.request.urlopen(req, timeout=6) as res:
                if res.status == 200:
                    data = json.loads(res.read().decode("utf-8"))
                    if isinstance(data, list) and len(data) > 0:
                        entry = data[0]
                        entries = []
                        phonetic = entry.get("phonetic", "")
                        for m in entry.get("meanings", []):
                            pos = m.get("partOfSpeech", "General").capitalize()
                            defs = []
                            examples = []
                            for d in m.get("definitions", []):
                                d_text = d.get("definition", "")
                                if d_text and d_text not in defs:
                                    defs.append(d_text)
                                ex = d.get("example", "")
                                if ex and ex not in examples:
                                    examples.append(ex)
                            if defs:
                                entries.append({
                                    "partOfSpeech": pos,
                                    "definitions": defs[:4],
                                    "examples": examples[:2]
                                })
                        if entries:
                            res_dict = {
                                "word": word,
                                "language": lang,
                                "entries": entries,
                                "source": "FreeDictionaryAPI"
                            }
                            if phonetic:
                                res_dict["phonetic"] = phonetic
                            return res_dict
        except Exception:
            pass

        # 3. Fallback: Datamuse API (definition hints)
        try:
            url = f"https://api.datamuse.com/words?sp={urllib.parse.quote(word)}&md=d&max=1"
            req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
            with urllib.request.urlopen(req, timeout=5) as res:
                if res.status == 200:
                    data = json.loads(res.read().decode("utf-8"))
                    if isinstance(data, list) and len(data) > 0:
                        item = data[0]
                        raw_defs = item.get("defs", [])
                        if raw_defs:
                            pos_map = {"n": "Noun", "v": "Verb", "adj": "Adjective", "adv": "Adverb", "u": "General"}
                            entries = []
                            for raw_def in raw_defs:
                                parts = raw_def.split("\t", 1)
                                if len(parts) == 2:
                                    tag, d_text = parts
                                    pos = pos_map.get(tag, tag.upper())
                                else:
                                    pos = "General"
                                    d_text = raw_def
                                entries.append({
                                    "partOfSpeech": pos,
                                    "definitions": [d_text],
                                    "examples": []
                                })
                            return {
                                "word": word,
                                "language": lang,
                                "entries": entries[:3],
                                "source": "Datamuse"
                            }
        except Exception:
            pass

        return {
            "word": word,
            "language": lang,
            "entries": [],
            "error": "not_found"
        }

    def translate_text(self, text: str, target_lang: str = "pt", source_lang: str = "auto") -> Dict[str, Any]:
        """Translates text between languages with SQLite persistent caching."""
        clean_text = (text or "").strip()
        if not clean_text:
            return {"error": "empty_text", "translated_text": "", "original_text": ""}

        cache_key = f"{source_lang.lower()}:{target_lang.lower()}:{clean_text[:120]}"
        with self._lock:
            cached = self.db.get_lookup("translation", cache_key)
            if cached:
                return cached

        result = self._fetch_translation(clean_text, target_lang, source_lang)
        if result and not result.get("error"):
            with self._lock:
                self.db.set_lookup("translation", cache_key, result)

        return result

    def _fetch_translation(self, text: str, target_lang: str, source_lang: str) -> Dict[str, Any]:
        # 1. Google Translate via dict-chrome-ex client
        try:
            encoded = urllib.parse.quote(text)
            url = f"https://clients5.google.com/translate_a/t?client=dict-chrome-ex&sl={source_lang}&tl={target_lang}&q={encoded}"
            req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
            with urllib.request.urlopen(req, timeout=6) as res:
                if res.status == 200:
                    raw = res.read().decode("utf-8")
                    data = json.loads(raw)
                    if isinstance(data, list) and len(data) > 0:
                        first = data[0]
                        if isinstance(first, list) and len(first) > 0:
                            trans = first[0]
                            detected = first[1] if len(first) > 1 else source_lang
                            return {
                                "original_text": text,
                                "translated_text": trans,
                                "source_lang": detected,
                                "target_lang": target_lang,
                                "source": "Google"
                            }
        except Exception:
            pass

        # 2. Fallback: MyMemory API
        try:
            src = "en" if source_lang == "auto" else source_lang
            encoded = urllib.parse.quote(text)
            url = f"https://api.mymemory.translated.net/get?q={encoded}&langpair={src}|{target_lang}"
            req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
            with urllib.request.urlopen(req, timeout=6) as res:
                if res.status == 200:
                    raw = res.read().decode("utf-8")
                    data = json.loads(raw)
                    resp_data = data.get("responseData", {})
                    trans = resp_data.get("translatedText")
                    if trans:
                        return {
                            "original_text": text,
                            "translated_text": trans,
                            "source_lang": src,
                            "target_lang": target_lang,
                            "source": "MyMemory"
                        }
        except Exception:
            pass

        return {
            "original_text": text,
            "translated_text": "",
            "source_lang": source_lang,
            "target_lang": target_lang,
            "error": "translation_failed"
        }
