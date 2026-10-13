import os
import time
from typing import Dict, Any, List, Optional
from boto3.dynamodb.conditions import Key, Attr
from .config import get_dynamodb_table, get_s3_client, BOOKS_BUCKET, BOOKS_PREFIX, COVERS_PREFIX

class DynamoDBManager:
    """
    Manages persistent book library data using Amazon DynamoDB (Single-Table Design).
    
    PK: LIB#<library_id> | SK: BOOK#<book_id>
    GSI1_PK: CATEGORY#<category> | GSI1_SK: TITLE#<title>
    PK: USER#<username>   | SK: PROGRESS#<book_id>
    PK: USER#<username>   | SK: FAVORITE#<book_id>
    PK: USER#<username>   | SK: ANNOTATION#<annot_id>
    PK: USER#<username>   | SK: TAG#<tag_id>
    """

    def __init__(self, table=None):
        self._table = table

    @property
    def table(self):
        if self._table is None:
            self._table = get_dynamodb_table()
        return self._table

    # --- BOOKS & CATEGORIES ---

    def list_books(self, library_id: str = "default", category: Optional[str] = None) -> List[Dict[str, Any]]:
        """Lists books in a library, optionally filtered by category using GSI1."""
        if category:
            resp = self.table.query(
                IndexName="GSI1",
                KeyConditionExpression=Key("GSI1_PK").eq(f"CATEGORY#{category}")
            )
            items = resp.get("Items", [])
            return [it for it in items if it.get("library_id") == library_id]
        else:
            resp = self.table.query(
                KeyConditionExpression=Key("PK").eq(f"LIB#{library_id}") & Key("SK").begins_with("BOOK#")
            )
            return resp.get("Items", [])

    def get_book(self, book_id: str, library_id: str = "default") -> Optional[Dict[str, Any]]:
        """Retrieves a single book metadata item."""
        resp = self.table.get_item(
            Key={
                "PK": f"LIB#{library_id}",
                "SK": f"BOOK#{book_id}"
            }
        )
        return resp.get("Item")

    def save_book(self, book_data: Dict[str, Any], library_id: str = "default") -> Dict[str, Any]:
        """Saves or updates book metadata."""
        book_id = book_data["id"]
        category = book_data.get("primary_category", "General")
        title = book_data.get("title", "Untitled")

        item = {
            "PK": f"LIB#{library_id}",
            "SK": f"BOOK#{book_id}",
            "GSI1_PK": f"CATEGORY#{category}",
            "GSI1_SK": f"TITLE#{title.lower()}",
            "library_id": library_id,
            "id": book_id,
            "title": title,
            "original_filename": book_data.get("original_filename", ""),
            "format": book_data.get("format", "pdf"),
            "file_size": book_data.get("file_size", 0),
            "primary_category": category,
            "categories": book_data.get("categories", [category]),
            "s3_key": book_data.get("s3_key", f"{BOOKS_PREFIX}{book_id}.{book_data.get('format', 'pdf')}"),
            "cover_key": book_data.get("cover_key", f"{COVERS_PREFIX}{book_id}.webp"),
            "total_pages": book_data.get("total_pages", 0),
            "created_at": book_data.get("created_at", int(time.time())),
            "updated_at": int(time.time())
        }
        self.table.put_item(Item=item)
        return item

    def delete_book(self, book_id: str, library_id: str = "default") -> bool:
        """Deletes book metadata record from DynamoDB."""
        self.table.delete_item(
            Key={
                "PK": f"LIB#{library_id}",
                "SK": f"BOOK#{book_id}"
            }
        )
        return True

    def get_categories(self, library_id: str = "default") -> List[Dict[str, Any]]:
        """Aggregates all categories and counts within a library."""
        books = self.list_books(library_id=library_id)
        cat_counts: Dict[str, int] = {}
        for b in books:
            cat = b.get("primary_category", "General")
            cat_counts[cat] = cat_counts.get(cat, 0) + 1

        return [
            {"id": cat.lower().replace(" ", "-"), "name": cat, "book_count": count}
            for cat, count in sorted(cat_counts.items())
        ]

    # --- READING PROGRESS ---

    def get_progress(self, user: str, book_id: str) -> Optional[Dict[str, Any]]:
        resp = self.table.get_item(
            Key={
                "PK": f"USER#{user}",
                "SK": f"PROGRESS#{book_id}"
            }
        )
        return resp.get("Item")

    def get_all_progress(self, user: str) -> Dict[str, Dict[str, Any]]:
        resp = self.table.query(
            KeyConditionExpression=Key("PK").eq(f"USER#{user}") & Key("SK").begins_with("PROGRESS#")
        )
        return {item["book_id"]: item for item in resp.get("Items", [])}

    def save_progress(self, user: str, book_id: str, progress_data: Dict[str, Any]) -> Dict[str, Any]:
        item = {
            "PK": f"USER#{user}",
            "SK": f"PROGRESS#{book_id}",
            "book_id": book_id,
            "page": progress_data.get("page", 1),
            "total_pages": progress_data.get("total_pages", 0),
            "percent": progress_data.get("percent", 0),
            "cfi": progress_data.get("cfi"),
            "status": progress_data.get("status", "in_progress"),
            "zoom": progress_data.get("zoom", 1.2),
            "invert_colors": progress_data.get("invert_colors", False),
            "updated_at": int(time.time())
        }
        self.table.put_item(Item=item)
        return item

    # --- FAVORITES ---

    def is_favorite(self, user: str, book_id: str) -> bool:
        resp = self.table.get_item(
            Key={
                "PK": f"USER#{user}",
                "SK": f"FAVORITE#{book_id}"
            }
        )
        return "Item" in resp

    def toggle_favorite(self, user: str, book_id: str) -> bool:
        if self.is_favorite(user, book_id):
            self.table.delete_item(
                Key={
                    "PK": f"USER#{user}",
                    "SK": f"FAVORITE#{book_id}"
                }
            )
            return False
        else:
            self.table.put_item(
                Item={
                    "PK": f"USER#{user}",
                    "SK": f"FAVORITE#{book_id}",
                    "book_id": book_id,
                    "created_at": int(time.time())
                }
            )
            return True

    # --- ANNOTATIONS ---

    def get_annotations(self, user: str, book_id: Optional[str] = None) -> List[Dict[str, Any]]:
        resp = self.table.query(
            KeyConditionExpression=Key("PK").eq(f"USER#{user}") & Key("SK").begins_with("ANNOTATION#")
        )
        items = resp.get("Items", [])
        if book_id:
            items = [it for it in items if it.get("book_id") == book_id]
        return items

    def save_annotation(self, user: str, annotation_data: Dict[str, Any]) -> Dict[str, Any]:
        annot_id = annotation_data["id"]
        item = {
            "PK": f"USER#{user}",
            "SK": f"ANNOTATION#{annot_id}",
            "id": annot_id,
            "book_id": annotation_data["book_id"],
            "text": annotation_data.get("text", ""),
            "comment": annotation_data.get("comment", ""),
            "color": annotation_data.get("color", "yellow"),
            "cfi_range": annotation_data.get("cfi_range"),
            "page": annotation_data.get("page"),
            "created_at": annotation_data.get("created_at", int(time.time()))
        }
        self.table.put_item(Item=item)
        return item

    def delete_annotation(self, user: str, annot_id: str) -> bool:
        self.table.delete_item(
            Key={
                "PK": f"USER#{user}",
                "SK": f"ANNOTATION#{annot_id}"
            }
        )
        return True
