from fastapi import APIRouter, HTTPException, Depends
from ..users import UserManager
from ..deps import get_user_mgr, get_request_user
from ..schemas import UserPayload

router = APIRouter(prefix="/api/users", tags=["users"])

@router.get("")
def list_users(user_mgr: UserManager = Depends(get_user_mgr)):
    """Returns list of registered users sorted by recent activity."""
    return {"users": user_mgr.list_users()}

@router.post("")
def register_user(payload: UserPayload, user_mgr: UserManager = Depends(get_user_mgr)):
    """Registers or touches a user profile."""
    clean = payload.username.strip()
    if not clean:
        raise HTTPException(status_code=400, detail="Username cannot be empty")
    profile = user_mgr.touch_user(clean)
    return {"status": "ok", "user": profile, "users": user_mgr.list_users()}

@router.get("/current")
def get_current_user_profile(user: str = Depends(get_request_user), user_mgr: UserManager = Depends(get_user_mgr)):
    """Returns profile for the current requesting user."""
    profile = user_mgr.touch_user(user)
    return {"user": profile}

@router.delete("/{username}")
def delete_user(username: str, user_mgr: UserManager = Depends(get_user_mgr)):
    """Deletes a user profile and all their scoped data from disk."""
    clean = username.strip()
    if not clean:
        raise HTTPException(status_code=400, detail="Username cannot be empty")
    success = user_mgr.delete_user(clean)
    return {
        "status": "ok" if success else "not_found",
        "deleted": clean,
        "users": user_mgr.list_users()
    }
