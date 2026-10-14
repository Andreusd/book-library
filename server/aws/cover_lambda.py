import os
import io
import json
import urllib.parse
import boto3
import pypdfium2 as pdfium
from PIL import Image

s3_client = boto3.client("s3")
dynamodb = boto3.resource("dynamodb")
table_name = os.environ.get("DYNAMODB_TABLE", "UziLibrary")
table = dynamodb.Table(table_name)
COVERS_PREFIX = os.environ.get("COVERS_PREFIX", "covers/")

def handler(event, context):
    """
    S3 ObjectCreated Event Trigger.
    Extracts the first page from newly uploaded PDF/EPUB books,
    converts to WebP, uploads to s3://<bucket>/covers/{hash}.webp,
    and updates the DynamoDB book record.
    """
    records = event.get("Records", [])
    for rec in records:
        bucket = rec["s3"]["bucket"]["name"]
        raw_key = rec["s3"]["object"]["key"]
        key = urllib.parse.unquote_plus(raw_key)

        # Only process keys in books/
        if not key.startswith("books/"):
            continue

        filename = os.path.basename(key)
        book_id, ext = os.path.splitext(filename)
        ext = ext.lower().lstrip(".")

        print(f"Processing cover for book: {book_id} (format: {ext})")

        try:
            # Download file into memory or tempfile
            response = s3_client.get_object(Bucket=bucket, Key=key)
            file_bytes = response["Body"].read()

            cover_bytes = None
            total_pages = 0

            if ext == "pdf":
                pdf = pdfium.PdfDocument(file_bytes)
                total_pages = len(pdf)
                if total_pages > 0:
                    page = pdf[0]
                    # Render high-res thumbnail (DPI multiplier)
                    pil_image = page.render(scale=2.0).to_pil()
                    img_byte_arr = io.BytesIO()
                    pil_image.save(img_byte_arr, format="WEBP", quality=85)
                    cover_bytes = img_byte_arr.getvalue()
                pdf.close()
            elif ext == "epub":
                # For EPUBs, extract embedded cover or fallback
                # Optional: use zipfile to extract cover image
                pass

            if cover_bytes:
                cover_key = f"{COVERS_PREFIX}{book_id}.webp"
                s3_client.put_object(
                    Bucket=bucket,
                    Key=cover_key,
                    Body=cover_bytes,
                    ContentType="image/webp",
                    CacheControl="public, max-age=31536000"
                )
                print(f"Uploaded cover to s3://{bucket}/{cover_key}")

                # Update DynamoDB record with cover_key and total_pages
                table.update_item(
                    Key={"PK": "LIB#default", "SK": f"BOOK#{book_id}"},
                    UpdateExpression="SET cover_key = :c, total_pages = :p",
                    ExpressionAttributeValues={
                        ":c": cover_key,
                        ":p": total_pages
                    }
                )

        except Exception as e:
            print(f"Error processing cover for {key}: {e}")

    return {"status": "ok"}
