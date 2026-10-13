import os
from typing import Optional
from fastapi import Request, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

security = HTTPBearer(auto_error=False)

def get_current_user(request: Request, creds: Optional[HTTPAuthorizationCredentials] = Depends(security)) -> str:
    """
    Extracts authenticated user email from:
    1. API Gateway HTTP API Cognito JWT authorizer claims (production AWS Lambda)
    2. Bearer token / X-User header (local dev / testing)
    """
    # 1. Check API Gateway request context injected by Cognito JWT Authorizer
    scope = request.scope
    req_ctx = scope.get("aws.event", {}).get("requestContext", {})
    jwt_claims = req_ctx.get("authorizer", {}).get("jwt", {}).get("claims", {})
    user_email = jwt_claims.get("email") or jwt_claims.get("username")
    if user_email:
        return user_email.lower().strip()

    # 2. Check header or query param for local development
    x_user = request.headers.get("x-user") or request.headers.get("X-User")
    if not x_user:
        x_user = request.query_params.get("user")

    if x_user:
        return x_user.lower().strip()

    # In strict AWS environment without claims, raise 401
    if os.environ.get("AWS_LAMBDA_FUNCTION_NAME"):
        raise HTTPException(status_code=401, detail="Unauthorized: valid Cognito JWT required")

    return "default"
