import os
import json

ALLOWED_EMAILS = [
    email.strip().lower() 
    for email in os.environ.get("ALLOWED_EMAILS", "").split(",") 
    if email.strip()
]

def handler(event, context):
    """
    Cognito Pre-Sign-up Lambda Trigger.
    Enforces a strict email whitelist. Only authorized users can register or log in.
    """
    user_attrs = event.get("request", {}).get("userAttributes", {})
    email = user_attrs.get("email", "").strip().lower()

    print(f"Validating pre-sign-up for email: {email}")

    # If whitelist is configured, enforce membership
    if ALLOWED_EMAILS:
        if email not in ALLOWED_EMAILS:
            print(f"Access DENIED for {email}. Not in whitelist: {ALLOWED_EMAILS}")
            raise Exception(f"Acesso não autorizado para o email {email}. Contate o administrador.")

    # Auto-confirm user when coming from trusted external identity providers (Google)
    event["response"]["autoConfirmUser"] = True
    event["response"]["autoVerifyEmail"] = True
    return event
