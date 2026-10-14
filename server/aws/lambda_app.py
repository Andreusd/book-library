"""
Serverless FastAPI Application for AWS Lambda (DynamoDB & S3 Native).
Does not initialize local filesystem scanning or disk cache.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from mangum import Mangum
from .router import router as aws_router

app = FastAPI(title="Uzi Library AWS API")

# Allow CORS for CloudFront and local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount pure AWS Serverless Router
app.include_router(aws_router)

# Root healthcheck
@app.get("/api/health")
def healthcheck():
    return {"status": "ok", "mode": "aws-serverless"}

# AWS Lambda Handler
handler = Mangum(app, lifespan="off")
