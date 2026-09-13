# 📚 Digital Library / Biblioteca Digital

A modern, fast, responsive, and lightweight web application to organize, browse, and read your personal collection of PDF books.

---

## 🚀 Quick Start / Como Executar

### Windows (Quick Launch)
Double click:
```cmd
run.bat
```

### Terminal
```bash
python -m uvicorn server.main:app --host 127.0.0.1 --port 8000
```
Open your browser at: **[http://127.0.0.1:8000](http://127.0.0.1:8000)**

---

## ⚙️ Library Folder Configuration / Configuração da Pasta de Livros

You can point the application to **any folder on your computer** where your PDF books are stored:
1. Click the **⚙️ Settings** button in the top navigation bar.
2. Enter your books directory path (e.g. `D:\Books`, `C:\Users\You\Documents\Books`, or `/home/user/books`).
3. The app will validate the directory live and display the number of detected books and shelves.
4. Click **Save & Rescan**—your library will load and persist across sessions in `.cache/config.json`.

Alternatively, configure the path via environment variable:
```bash
export BOOK_LIBRARY_PATH="/path/to/your/books"
```

> [!NOTE]
> **Source Folder Safety (100% Read-Only)**:
> The application will **never** alter, write to, or delete your source book files. All generated covers, virtual shelf aliases, and reading progress records are stored locally in the isolated `.cache/` folder.

---

## ✨ Features / Recursos

* **Customizable & Portable Library**: Point to any folder of PDFs on any machine; works with categorized subfolders or direct PDFs.
* **Explorer-Fidelity WebP Covers**: Automatically extracts high-resolution page-1 thumbnails using Google PDFium (`pypdfium2`).
* **Virtual Shelf Renaming**: Right-click any shelf in the sidebar to give it a custom display name without altering the filesystem.
* **Embedded Fullscreen PDF Reader**:
  * **Text Selection & Copy**: Highlight and copy text directly from the PDF page (`Ctrl + C`).
  * **Interactive Links**: Clickable Table of Contents destinations jump to chapters; external links open safely in a new tab.
  * **Per-Book Zoom Memory**: Remembers your preferred zoom factor for each book.
  * **Ctrl + Wheel Smooth Zoom**: Zoom seamlessly inside the viewer without scaling the browser page.
  * **Night Mode**: Instant high-contrast dark reading mode.
* **Reading Progress & "Continue Reading"**:
  * Tracks current page and reading percentage.
  * Books advance to the *Continue Reading* shelf only after reading beyond page 1 (covers don't mark books as started).
  * Right-click any book to *Mark as Not Started* (instantly removes from Continue Reading) or *Mark as Completed*.
* **Bilingual UI (EN / PT)**: Switch between English and Portuguese with a single click in the header.
* **Responsive Toggleable Sidebar**: Smooth sidebar collapse with `Ctrl + B` and backdrop overlay on mobile.
* **Instant Global Search & Sorting**: Press `/` to search titles in real time, or sort by name, file size, or recent reading.

---

## ⌨️ Keyboard Shortcuts / Atalhos do Teclado

| Key / Tecla | Action / Ação |
| :--- | :--- |
| `/` | Focus search bar / Focar na barra de busca |
| `Ctrl + B` | Toggle sidebar / Alternar menu lateral |
| `Right Arrow` / `Space` / `Page Down` | Next page in reader / Próxima página no leitor |
| `Left Arrow` / `Page Up` | Previous page in reader / Página anterior no leitor |
| `Up Arrow` / `Down Arrow` | Scroll page up/down (pure scrolling) / Rolar página para cima/baixo (rolagem suave) |
| `Trackpad 2-Finger Swipe (Left / Right)` | Flip to Next / Previous page / Virar para Próxima / Anterior |
| `+` / `-` | Zoom in / Zoom out |
| `Ctrl + Scroll Wheel` | PDF smooth zoom / Zoom suave do PDF |
| `Esc` | Close reader & return to library / Voltar à estante |

---

## 🛠️ Tech Stack

* **Backend**: Python 3.10+, FastAPI, Uvicorn, PyPDFium2, Pillow.
* **Frontend**: React 19, Vite, Tailwind CSS v4, Lucide React, PDF.js.
