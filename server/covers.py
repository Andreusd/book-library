import os
import io
import threading
import pypdfium2 as pdfium
from PIL import Image, ImageDraw, ImageFont
from typing import Optional

CACHE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".cache", "covers"))

class CoverManager:
    def __init__(self, cache_dir: str = CACHE_DIR):
        self.cache_dir = cache_dir
        os.makedirs(self.cache_dir, exist_ok=True)
        self._lock = threading.RLock()

    def get_cover_path(self, book_id: str) -> str:
        """Returns the file path for the cached cover image."""
        return os.path.join(self.cache_dir, f"{book_id}.webp")

    def has_cover(self, book_id: str) -> bool:
        """Checks if a cached cover exists and is non-empty."""
        path = self.get_cover_path(book_id)
        return os.path.exists(path) and os.path.getsize(path) > 0

    def generate_cover(self, pdf_path: str, book_id: str, title: str = "") -> str:
        """
        Renders the first page of the PDF as a high quality WebP thumbnail.
        If the file cannot be rendered, generates a clean fallback book cover.
        """
        out_path = self.get_cover_path(book_id)
        if self.has_cover(book_id):
            return out_path

        with self._lock:
            if self.has_cover(book_id):
                return out_path

            try:
                # Open PDF and render first page
                pdf = pdfium.PdfDocument(pdf_path)
                if len(pdf) > 0:
                    page = pdf[0]
                    # Scale 1.5 gives crisp ~450-600px width on standard 72 DPI PDF
                    image = page.render(scale=1.5).to_pil()
                    image.save(out_path, "WEBP", quality=85)
                    pdf.close()
                    return out_path
                pdf.close()
            except Exception as e:
                print(f"Error rendering cover for {pdf_path}: {e}")

            # Fallback placeholder cover
            self._create_fallback_cover(out_path, title or book_id)
            return out_path

    def _create_fallback_cover(self, out_path: str, title: str):
        """Creates a stylized placeholder book cover if PDF rendering fails."""
        width, height = 400, 600
        img = Image.new("RGB", (width, height), color="#1e293b")
        draw = ImageDraw.Draw(img)

        # Draw decorative spine
        draw.rectangle([0, 0, 20, height], fill="#0f172a")

        # Draw book title snippet
        words = title[:60].split()
        lines = []
        current_line = []
        for w in words:
            current_line.append(w)
            if len(" ".join(current_line)) > 18:
                lines.append(" ".join(current_line))
                current_line = []
        if current_line:
            lines.append(" ".join(current_line))

        text = "\n".join(lines[:4])
        draw.multiline_text((40, 80), text, fill="#f8fafc", spacing=8)
        draw.text((40, height - 60), "PDF BOOK", fill="#94a3b8")

        img.save(out_path, "WEBP", quality=80)

    def pre_cache_all(self, books: list):
        """Background thread worker to pre-render all covers."""
        def worker():
            for b in books:
                try:
                    if not self.has_cover(b["id"]):
                        self.generate_cover(b["path"], b["id"], b["title"])
                except Exception as e:
                    print(f"Background pre-cache error on {b.get('title')}: {e}")

        t = threading.Thread(target=worker, daemon=True)
        t.start()
