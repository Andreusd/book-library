#!/usr/bin/env python3
"""
Book Library - Local to AWS S3 & DynamoDB Migration Script.
Scans local books, calculates binary SHA-256 hashes, uploads to S3,
and populates the DynamoDB Single-Table.
"""
import os
import sys
import hashlib
import mimetypes
import boto3

BOOK_EXTENSIONS = ('.pdf', '.epub')

def compute_sha256(filepath: str) -> str:
    """Calculates SHA-256 binary hash in chunks."""
    sha = hashlib.sha256()
    with open(filepath, 'rb') as f:
        while chunk := f.read(65536):
            sha.update(chunk)
    return sha.hexdigest()

def migrate_library(local_dir: str, bucket_name: str, table_name: str, region: str = "us-east-1"):
    if not os.path.isdir(local_dir):
        print(f"Erro: Diretorio local '{local_dir}' nao encontrado.")
        sys.exit(1)

    s3 = boto3.client("s3", region_name=region)
    dynamodb = boto3.resource("dynamodb", region_name=region)
    table = dynamodb.Table(table_name)

    print(f"Iniciando varredura em: {local_dir}")
    print(f"Destino S3: s3://{bucket_name}/books/")
    print(f"Destino DynamoDB: {table_name}\n")

    migrated_count = 0
    skipped_count = 0

    for root, _, files in os.walk(local_dir):
        rel_folder = os.path.relpath(root, local_dir)
        category = "General" if rel_folder == "." else rel_folder.replace("-", " ").replace("_", " ")

        for filename in files:
            ext = os.path.splitext(filename)[1].lower()
            if ext not in BOOK_EXTENSIONS:
                continue

            full_path = os.path.join(root, filename)
            file_size = os.path.getsize(full_path)
            book_hash = compute_sha256(full_path)
            s3_key = f"books/{book_hash}{ext}"
            clean_title = os.path.splitext(filename)[0].replace("_", " ").strip()

            print(f"-> [{category}] {clean_title} ({ext})")
            print(f"   SHA-256: {book_hash}")

            # Check if book exists in DynamoDB
            resp = table.get_item(Key={"PK": "LIB#default", "SK": f"BOOK#{book_hash}"})
            if "Item" in resp:
                print(f"   [JA EXISTE] Pulando upload de {clean_title}...")
                skipped_count += 1
                continue

            # Upload to S3
            content_type = "application/pdf" if ext == ".pdf" else "application/epub+zip"
            with open(full_path, "rb") as f:
                s3.put_object(
                    Bucket=bucket_name,
                    Key=s3_key,
                    Body=f,
                    ContentType=content_type
                )
            print(f"   [OK S3] Upload concluido para s3://{bucket_name}/{s3_key}")

            # Register in DynamoDB
            table.put_item(
                Item={
                    "PK": "LIB#default",
                    "SK": f"BOOK#{book_hash}",
                    "GSI1_PK": f"CATEGORY#{category}",
                    "GSI1_SK": f"TITLE#{clean_title.lower()}",
                    "id": book_hash,
                    "title": clean_title,
                    "original_filename": filename,
                    "format": ext.lstrip("."),
                    "file_size": file_size,
                    "primary_category": category,
                    "categories": [category],
                    "s3_key": s3_key,
                    "cover_key": f"covers/{book_hash}.webp"
                }
            )
            print(f"   [OK DynamoDB] Metadados persistidos.")
            migrated_count += 1

    print("\n==========================================")
    print(f"Migracao concluida!")
    print(f"Novos livros migrados: {migrated_count}")
    print(f"Livros ja existentes: {skipped_count}")
    print("==========================================")

if __name__ == "__main__":
    if len(sys.argv) < 4:
        print("Uso: python migrate_to_aws.py <pasta_livros> <bucket_s3> <tabela_dynamodb> [regiao]")
        sys.exit(1)

    books_dir = sys.argv[1]
    bucket = sys.argv[2]
    tbl = sys.argv[3]
    reg = sys.argv[4] if len(sys.argv) > 4 else "us-east-1"

    migrate_library(books_dir, bucket, tbl, reg)
