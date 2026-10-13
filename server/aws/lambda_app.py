"""
AWS Lambda entrypoint adapter using Mangum for FastAPI.
"""
from mangum import Mangum
from ..main import app

# Wrap FastAPI ASGI application into AWS Lambda handler
handler = Mangum(app, lifespan="off")
