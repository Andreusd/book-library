import os
import json
import base64
from typing import Optional
from fastapi import Request, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

security = HTTPBearer(auto_error=False)

ALLOWED_EMAILS = {"andreuzielsd@gmail.com"}

def decode_jwt_claims(token: str) -> dict:
    """Decodes JWT payload without verifying signature (for claims extraction)."""
    try:
        parts = token.split(".")
        if len(parts) == 3:
            payload_b64 = parts[1]
            rem = len(payload_b64) % 4
            if rem > 0:
                payload_b64 += "=" * (4 - rem)
            payload_json = base64.urlsafe_b64decode(payload_b64).decode("utf-8")
            return json.loads(payload_json)
    except Exception:
        pass
    return {}

def get_current_user(request: Request, creds: Optional[HTTPAuthorizationCredentials] = Depends(security)) -> str:
    """
    Extracts and validates authenticated user email from:
    1. API Gateway HTTP API Cognito JWT authorizer claims
    2. Bearer id_token in Authorization header
    3. X-User header
    """
    user_email = None

    # 1. Check API Gateway request context injected by Cognito JWT Authorizer
    scope = request.scope
    req_ctx = scope.get("aws.event", {}).get("requestContext", {})
    jwt_claims = req_ctx.get("authorizer", {}).get("jwt", {}).get("claims", {})
    if jwt_claims:
        user_email = jwt_claims.get("email") or jwt_claims.get("username")

    # 2. Check Bearer token in Authorization header
    if not user_email:
        auth_header = request.headers.get("authorization") or request.headers.get("Authorization")
        if auth_header and auth_header.lower().startswith("bearer "):
            token = auth_header[7:].strip()
            claims = decode_jwt_claims(token)
            user_email = claims.get("email") or claims.get("username") or claims.get("cognito:username")

    # 3. Check X-User header or query parameter
    if not user_email:
        user_email = request.headers.get("x-user") or request.headers.get("X-User") or request.query_params.get("user")

    if user_email:
        clean_email = user_email.lower().strip()
        if clean_email in ALLOWED_EMAILS:
            return clean_email
        else:
            raise HTTPException(status_code=403, detail=f"Access denied for user '{clean_email}'")

    # In strict AWS environment without credentials, raise 401
    if os.environ.get("AWS_LAMBDA_FUNCTION_NAME"):
        raise HTTPException(status_code=401, detail="Unauthorized: valid login required")

    return "andreuzielsd@gmail.com"
