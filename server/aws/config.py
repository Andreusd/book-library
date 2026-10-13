import os
import boto3
from typing import Any, Dict, List, Optional
from botocore.config import Config

AWS_REGION = os.environ.get("AWS_REGION", "us-east-1")
DYNAMODB_TABLE = os.environ.get("DYNAMODB_TABLE", "BookLibrary")
BOOKS_BUCKET = os.environ.get("BOOKS_BUCKET", "book-library-storage")
COVERS_PREFIX = os.environ.get("COVERS_PREFIX", "covers/")
BOOKS_PREFIX = os.environ.get("BOOKS_PREFIX", "books/")

_s3_client = None
_dynamodb_resource = None

def get_s3_client():
    global _s3_client
    if _s3_client is None:
        _s3_client = boto3.client("s3", region_name=AWS_REGION, config=Config(signature_version="s3v4"))
    return _s3_client

def get_dynamodb_table():
    global _dynamodb_resource
    if _dynamodb_resource is None:
        endpoint_url = os.environ.get("DYNAMODB_ENDPOINT_URL")
        dynamodb = boto3.resource("dynamodb", region_name=AWS_REGION, endpoint_url=endpoint_url)
        _dynamodb_resource = dynamodb.Table(DYNAMODB_TABLE)
    return _dynamodb_resource
