import os
import json
import re
import shutil
import threading
from datetime import datetime
from typing import Dict, Any, List, Optional, Tuple

from .progress import ProgressTracker
from .favorites import FavoritesManager
from .annotations import AnnotationsManager
from .tags import TagsManager

CACHE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".cache"))
USERS_DIR = os.path.join(CACHE_DIR, "users")

class UserManager:
    """
    Manages multi-user isolation on disk under .cache/users/<user_slug>/.
    Usernames are case-insensitive.
    Provides user-scoped instances of:
      - ProgressTracker (tracking / reading progress)
      - FavoritesManager (book favorites)
      - AnnotationsManager (highlights & comments)
      - TagsManager (virtual tags & book tags)
    """

    def __init__(self, cache_dir: str = CACHE_DIR):
        self.cache_dir = cache_dir
        self.users_dir = os.path.join(self.cache_dir, "users")
        os.makedirs(self.users_dir, exist_ok=True)
        self._lock = threading.RLock()

        self._trackers: Dict[str, ProgressTracker] = {}
        self._favorites: Dict[str, FavoritesManager] = {}
        self._annotations: Dict[str, AnnotationsManager] = {}
        self._tags: Dict[str, TagsManager] = {}

    @staticmethod
    def normalize_username(username: Optional[str]) -> Tuple[str, str]:
        """
        Normalizes a username case-insensitively.
        Returns:
            slug: Lowercase filesystem-safe identifier (e.g. 'alex')
            display_name: The trimmed original username as typed
        """
        raw = (username or "").strip()
        if not raw:
            return "default", "Default"

        # Sanitize for safe filesystem directory naming
        slug = re.sub(r'[\/\\:*?"<>|\x00-\x1f]', '_', raw).strip(' ._-').lower()
        if not slug:
            slug = "default"
        return slug, raw

    def get_user_dir(self, slug: str) -> str:
        return os.path.join(self.users_dir, slug)

    def _ensure_user_initialized(self, slug: str, display_name: str) -> str:
        """Ensures the user directory exists and has a profile.json. Migrates legacy data on first user."""
        user_dir = self.get_user_dir(slug)
        is_new = not os.path.exists(user_dir)
        os.makedirs(user_dir, exist_ok=True)

        profile_path = os.path.join(user_dir, "profile.json")
        now = datetime.now().isoformat()

        if is_new or not os.path.exists(profile_path):
            profile = {
                "username": display_name,
                "slug": slug,
                "created_at": now,
                "last_active": now,
            }
            try:
                with open(profile_path, "w", encoding="utf-8") as f:
                    json.dump(profile, f, indent=2, ensure_ascii=False)
            except Exception as e:
                print(f"Error saving user profile: {e}")

            # Check if this is the very first user and legacy files exist in .cache/
            # If so, migrate legacy files so existing bookmarks/progress/comments are preserved
            self._migrate_legacy_data_to_user(user_dir)
        else:
            # Update last_active and preserve preferred display casing if provided
            try:
                with open(profile_path, "r", encoding="utf-8") as f:
                    profile = json.load(f)
                profile["last_active"] = now
                if display_name and display_name.lower() == slug:
                    profile["username"] = display_name
                with open(profile_path, "w", encoding="utf-8") as f:
                    json.dump(profile, f, indent=2, ensure_ascii=False)
            except Exception:
                pass

        return user_dir

    def _migrate_legacy_data_to_user(self, target_user_dir: str):
        """
        Migrates legacy .cache/progress.json, favorites.json, annotations.json, tags.json
        into the initial user directory ONLY if this is the very first user.
        """
        migration_marker = os.path.join(self.users_dir, ".migrated")
        if os.path.exists(migration_marker):
            return

        # Check if other users already exist
        if os.path.exists(self.users_dir):
            existing_users = [
                d for d in os.listdir(self.users_dir)
                if os.path.isdir(os.path.join(self.users_dir, d)) and os.path.abspath(os.path.join(self.users_dir, d)) != os.path.abspath(target_user_dir)
            ]
            if len(existing_users) > 0:
                # Other users already exist; mark migrated so new users start fresh
                try:
                    with open(migration_marker, "w") as f:
                        f.write(datetime.now().isoformat())
                except Exception:
                    pass
                return

        legacy_files = ["progress.json", "favorites.json", "annotations.json", "tags.json"]
        for fname in legacy_files:
            legacy_path = os.path.join(self.cache_dir, fname)
            dest_path = os.path.join(target_user_dir, fname)
            if os.path.exists(legacy_path) and not os.path.exists(dest_path):
                try:
                    shutil.copy2(legacy_path, dest_path)
                    print(f"Migrated legacy {fname} to initial user directory: {target_user_dir}")
                except Exception as e:
                    print(f"Could not migrate legacy {fname}: {e}")

        try:
            with open(migration_marker, "w") as f:
                f.write(datetime.now().isoformat())
        except Exception:
            pass

    def get_tracker(self, username: Optional[str]) -> ProgressTracker:
        slug, display = self.normalize_username(username)
        with self._lock:
            if slug not in self._trackers:
                user_dir = self._ensure_user_initialized(slug, display)
                data_path = os.path.join(user_dir, "progress.json")
                self._trackers[slug] = ProgressTracker(data_path=data_path)
            return self._trackers[slug]

    def get_favorites_mgr(self, username: Optional[str]) -> FavoritesManager:
        slug, display = self.normalize_username(username)
        with self._lock:
            if slug not in self._favorites:
                user_dir = self._ensure_user_initialized(slug, display)
                data_path = os.path.join(user_dir, "favorites.json")
                self._favorites[slug] = FavoritesManager(data_path=data_path)
            return self._favorites[slug]

    def get_annotations_mgr(self, username: Optional[str]) -> AnnotationsManager:
        slug, display = self.normalize_username(username)
        with self._lock:
            if slug not in self._annotations:
                user_dir = self._ensure_user_initialized(slug, display)
                data_path = os.path.join(user_dir, "annotations.json")
                self._annotations[slug] = AnnotationsManager(storage_path=data_path)
            return self._annotations[slug]

    def get_tags_mgr(self, username: Optional[str]) -> TagsManager:
        slug, display = self.normalize_username(username)
        with self._lock:
            if slug not in self._tags:
                user_dir = self._ensure_user_initialized(slug, display)
                data_path = os.path.join(user_dir, "tags.json")
                self._tags[slug] = TagsManager(data_path=data_path)
            return self._tags[slug]

    def touch_user(self, username: Optional[str]) -> Dict[str, Any]:
        """Registers or activates a user and returns their profile."""
        slug, display = self.normalize_username(username)
        with self._lock:
            self._ensure_user_initialized(slug, display)
            return self.get_user_profile(slug)

    def get_user_profile(self, username: Optional[str]) -> Dict[str, Any]:
        slug, display = self.normalize_username(username)
        user_dir = self.get_user_dir(slug)
        profile_path = os.path.join(user_dir, "profile.json")
        if os.path.exists(profile_path):
            try:
                with open(profile_path, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception:
                pass
        return {
            "username": display,
            "slug": slug,
            "created_at": datetime.now().isoformat(),
            "last_active": datetime.now().isoformat()
        }

    def list_users(self) -> List[Dict[str, Any]]:
        """Returns all configured user profiles, sorted by last_active descending."""
        with self._lock:
            users = []
            if not os.path.exists(self.users_dir):
                return users

            for entry in os.listdir(self.users_dir):
                user_dir = os.path.join(self.users_dir, entry)
                if not os.path.isdir(user_dir):
                    continue

                profile_path = os.path.join(user_dir, "profile.json")
                if os.path.exists(profile_path):
                    try:
                        with open(profile_path, "r", encoding="utf-8") as f:
                            users.append(json.load(f))
                            continue
                    except Exception:
                        pass

                # Fallback profile if profile.json missing
                users.append({
                    "username": entry.capitalize(),
                    "slug": entry,
                    "created_at": "",
                    "last_active": ""
                })

            users.sort(key=lambda u: u.get("last_active", "") or u.get("created_at", ""), reverse=True)
            return users

    def delete_user(self, username: Optional[str]) -> bool:
        """Deletes a user and all their scoped data from disk."""
        slug, _ = self.normalize_username(username)
        if not slug or slug in (".", "..", "users"):
            return False

        with self._lock:
            # Pop cached managers
            self._trackers.pop(slug, None)
            self._favorites.pop(slug, None)
            self._annotations.pop(slug, None)
            self._tags.pop(slug, None)

            user_dir = self.get_user_dir(slug)
            resolved = os.path.abspath(user_dir)
            if not resolved.startswith(os.path.abspath(self.users_dir)):
                return False

            if os.path.exists(resolved) and os.path.isdir(resolved):
                shutil.rmtree(resolved, ignore_errors=True)
                return True
            return False

