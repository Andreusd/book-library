#!/usr/bin/env python3
"""
Uzi Library - Local to AWS S3 & DynamoDB Migration Script.
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

def migrate_library(local_dir: str, bucket_name: str, table_name: str, region: str = "us-east-1", explicit_category: str = None):
    if not os.path.isdir(local_dir):
        print(f"Erro: Diretorio local '{local_dir}' nao encontrado.")
        sys.exit(1)

    s3 = boto3.client("s3", region_name=region)
    dynamodb = boto3.resource("dynamodb", region_name=region)
    table = dynamodb.Table(table_name)

    folder_category = explicit_category or os.path.basename(os.path.abspath(local_dir)).replace("-", " ").replace("_", " ")

    print(f"Iniciando varredura em: {local_dir}")
    print(f"Categoria padrao: {folder_category}")
    print(f"Destino S3: s3://{bucket_name}/books/")
    print(f"Destino DynamoDB: {table_name}\n")

    migrated_count = 0
    updated_count = 0
    skipped_count = 0

    for root, _, files in os.walk(local_dir):
        rel_folder = os.path.relpath(root, local_dir)
        category = folder_category if rel_folder == "." else rel_folder.replace("-", " ").replace("_", " ")

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
                existing_item = resp["Item"]
                if existing_item.get("primary_category") != category:
                    print(f"   [ATUALIZANDO CATEGORIA] De '{existing_item.get('primary_category')}' para '{category}'...")
                    table.update_item(
                        Key={"PK": "LIB#default", "SK": f"BOOK#{book_hash}"},
                        UpdateExpression="SET GSI1_PK = :cat_pk, primary_category = :cat, categories = :cats",
                        ExpressionAttributeValues={
                            ":cat_pk": f"CATEGORY#{category}",
                            ":cat": category,
                            ":cats": [category]
                        }
                    )
                    updated_count += 1
                else:
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
    print(f"Livros com categoria atualizada: {updated_count}")
    print(f"Livros ja existentes ignorados: {skipped_count}")
    print("==========================================")

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Migrate local books to AWS S3 & DynamoDB")
    parser.add_argument("books_dir", help="Path to local books directory")
    parser.add_argument("bucket", help="S3 Bucket name")
    parser.add_argument("table", help="DynamoDB Table name")
    parser.add_argument("--region", default="us-east-1", help="AWS Region (default: us-east-1)")
    parser.add_argument("--category", default=None, help="Explicit category override")

    args = parser.parse_args()
    migrate_library(args.books_dir, args.bucket, args.table, args.region, args.category)
