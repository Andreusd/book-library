import os
from typing import Dict, Any, Optional
from .config import get_s3_client, BOOKS_BUCKET, BOOKS_PREFIX, COVERS_PREFIX

class S3StorageManager:
    """Manages S3 Presigned URLs for zero-cost client streaming and direct uploads."""

    def __init__(self, bucket_name: str = BOOKS_BUCKET):
        self.bucket = bucket_name

    def generate_upload_url(
        self,
        book_id: str,
        extension: str,
        content_type: str = "application/pdf",
        expires_in: int = 900
    ) -> Dict[str, Any]:
        """Generates a Presigned PUT URL allowing the browser to upload directly to S3."""
        clean_ext = extension.lstrip(".")
        s3_key = f"{BOOKS_PREFIX}{book_id}.{clean_ext}"
        client = get_s3_client()

        url = client.generate_presigned_url(
            "put_object",
            Params={
                "Bucket": self.bucket,
                "Key": s3_key,
                "ContentType": content_type
            },
            ExpiresIn=expires_in
        )
        return {
            "upload_url": url,
            "s3_key": s3_key,
            "book_id": book_id,
            "expires_in": expires_in
        }

    def generate_download_url(
        self,
        s3_key: str,
        filename: Optional[str] = None,
        as_attachment: bool = False,
        expires_in: int = 3600
    ) -> str:
        """Generates a Presigned GET URL for streaming/downloading files."""
        client = get_s3_client()
        params: Dict[str, Any] = {
            "Bucket": self.bucket,
            "Key": s3_key
        }

        if filename:
            disposition = "attachment" if as_attachment else "inline"
            params["ResponseContentDisposition"] = f'{disposition}; filename="{filename}"'

        return client.generate_presigned_url(
            "get_object",
            Params=params,
            ExpiresIn=expires_in
        )

    def delete_book_files(self, book_id: str, file_format: str = "pdf") -> bool:
        """Atomically deletes the book and its WebP cover from S3."""
        client = get_s3_client()
        objects = [
            {"Key": f"{BOOKS_PREFIX}{book_id}.{file_format}"},
            {"Key": f"{COVERS_PREFIX}{book_id}.webp"}
        ]
        try:
            client.delete_objects(
                Bucket=self.bucket,
                Delete={"Objects": objects, "Quiet": True}
            )
            return True
        except Exception as e:
            print(f"Error deleting S3 objects for {book_id}: {e}")
            return False
