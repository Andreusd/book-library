import os
import re
import json
import html
import threading
import urllib.request
import urllib.parse
from typing import Dict, Any, Optional, List

CACHE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".cache"))
LOOKUPS_CACHE_FILE = os.path.join(CACHE_DIR, "lookups.json")

USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
WIKTIONARY_AGENT = "DigitalLibrary/1.0 (https://github.com/Andreusd/book-library; contact@digitallibrary.local)"

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
    # Strip common enclosing punctuation
    w = re.sub(r'^[^\w\u00C0-\u017F]+|[^\w\u00C0-\u017F]+$', '', w)
    return w.lower()

class LookupManager:
    """Provides definition and translation services with persistent caching."""

    def __init__(self, cache_file: str = LOOKUPS_CACHE_FILE):
        self.cache_file = cache_file
        self._lock = threading.RLock()
        self._cache = self._load_cache()

    def _load_cache(self) -> Dict[str, Any]:
        if os.path.exists(self.cache_file):
            try:
                with open(self.cache_file, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception as e:
                print(f"Error loading lookups cache: {e}")
        return {"definitions": {}, "translations": {}}

    def _save_cache(self):
        os.makedirs(os.path.dirname(self.cache_file), exist_ok=True)
        try:
            with open(self.cache_file, "w", encoding="utf-8") as f:
                json.dump(self._cache, f, indent=2, ensure_ascii=False)
        except Exception as e:
            print(f"Error saving lookups cache: {e}")

    def define_word(self, word: str, lang: str = "en") -> Dict[str, Any]:
        """
        Looks up a word definition using Wiktionary, Free Dictionary API, and Datamuse fallback.
        Results are cached locally.
        """
        clean_word = sanitize_word(word)
        if not clean_word:
            return {"error": "empty_word", "word": word, "entries": []}

        cache_key = f"{lang.lower()}:{clean_word}"
        with self._lock:
            cached = self._cache.get("definitions", {}).get(cache_key)
            if cached:
                return cached

        result = self._fetch_definition(clean_word, lang)
        if result and result.get("entries"):
            with self._lock:
                if "definitions" not in self._cache:
                    self._cache["definitions"] = {}
                self._cache["definitions"][cache_key] = result
                self._save_cache()

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
                    # Check requested lang first, then 'en', then whatever is available
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
                            "source": "Wiktionary",
                            "entries": entries
                        }
        except Exception as e:
            # Fall through to Datamuse or FreeDict
            pass

        # 2. Try Datamuse API (fast, reliable English definitions)
        try:
            datamuse_url = f"https://api.datamuse.com/words?sp={urllib.parse.quote(word)}&md=dp&max=1"
            req = urllib.request.Request(datamuse_url, headers={"User-Agent": USER_AGENT})
            with urllib.request.urlopen(req, timeout=5) as res:
                if res.status == 200:
                    dm_data = json.loads(res.read().decode("utf-8"))
                    if dm_data and isinstance(dm_data, list) and len(dm_data) > 0:
                        first = dm_data[0]
                        defs_raw = first.get("defs", [])
                        pos_map = {"n": "Noun", "v": "Verb", "adj": "Adjective", "adv": "Adverb", "u": "General"}
                        grouped: Dict[str, List[str]] = {}
                        for d in defs_raw:
                            parts = d.split("\t", 1)
                            p_key = parts[0].strip() if len(parts) > 1 else "u"
                            d_text = parts[1].strip() if len(parts) > 1 else parts[0].strip()
                            pos_name = pos_map.get(p_key, "General")
                            if pos_name not in grouped:
                                grouped[pos_name] = []
                            grouped[pos_name].append(d_text)

                        entries = [{"partOfSpeech": p, "definitions": ds[:3], "examples": []} for p, ds in grouped.items()]
                        if entries:
                            return {
                                "word": word,
                                "language": "en",
                                "source": "Datamuse",
                                "entries": entries
                            }
        except Exception:
            pass

        return {
            "word": word,
            "language": lang,
            "source": "none",
            "entries": []
        }

    def translate_text(self, text: str, target_lang: str = "pt", source_lang: str = "auto") -> Dict[str, Any]:
        """
        Translates text using Google Translate (dict-chrome-ex client) with fallback to MyMemory.
        Results are cached locally.
        """
        clean_text = text.strip()
        if not clean_text:
            return {"error": "empty_text", "translated_text": "", "source_lang": source_lang, "target_lang": target_lang}

        target_lang = target_lang.lower().strip()
        source_lang = source_lang.lower().strip() or "auto"
        cache_key = f"{source_lang}->{target_lang}:{clean_text}"

        with self._lock:
            cached = self._cache.get("translations", {}).get(cache_key)
            if cached:
                return cached

        result = self._fetch_translation(clean_text, target_lang, source_lang)
        if result and result.get("translated_text"):
            with self._lock:
                if "translations" not in self._cache:
                    self._cache["translations"] = {}
                self._cache["translations"][cache_key] = result
                self._save_cache()

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
                    # Expected format: [["Translated text", "detected_lang"]]
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
        except Exception as e:
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
