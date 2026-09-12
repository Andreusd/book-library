import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Search, SlidersHorizontal, Menu, X, BookOpen, 
  ArrowUpDown, FolderOpen, RefreshCw 
} from 'lucide-react';

import Sidebar from './components/Sidebar';
import BookCard from './components/BookCard';
import ContinueReading from './components/ContinueReading';
import Reader from './components/Reader';
import ContextMenu from './components/ContextMenu';
import ShelfContextMenu from './components/ShelfContextMenu';
import ShelfRenameModal from './components/ShelfRenameModal';
import LanguageSelector from './components/LanguageSelector';
import { useI18n } from './i18n';

export default function App() {
  const { t } = useI18n();
  const [shelves, setShelves] = useState([]);
  const [totalBooks, setTotalBooks] = useState(0);
  const [selectedShelf, setSelectedShelf] = useState(null);
  const [books, setBooks] = useState([]);
  const [continueReading, setContinueReading] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [sortBy, setSortBy] = useState('title_asc');
  const [activeBook, setActiveBook] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState({ isOpen: false, x: 0, y: 0, book: null });
  const [shelfContextMenu, setShelfContextMenu] = useState({ isOpen: false, x: 0, y: 0, shelf: null });
  const [renameModal, setRenameModal] = useState({ isOpen: false, shelf: null });

  const searchInputRef = useRef(null);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Global Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === '/' && document.activeElement !== searchInputRef.current && !activeBook) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeBook]);

  // Load Shelves & Totals
  const loadShelves = useCallback(() => {
    fetch('/api/shelves')
      .then(res => res.json())
      .then(data => {
        setShelves(data.shelves || []);
        setTotalBooks(data.total_books || 0);
      })
      .catch(err => console.error('Failed to load shelves:', err));
  }, []);

  // Load Continue Reading
  const loadContinueReading = useCallback(() => {
    fetch('/api/continue-reading')
      .then(res => res.json())
      .then(data => {
        setContinueReading(data.books || []);
      })
      .catch(err => console.error('Failed to load continue reading:', err));
  }, []);

  // Load Books
  const loadBooks = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (selectedShelf) params.append('shelf', selectedShelf);
    if (debouncedQuery) params.append('query', debouncedQuery);
    if (sortBy) params.append('sort', sortBy);

    fetch(`/api/books?${params.toString()}`)
      .then(res => res.json())
      .then(data => {
        setBooks(data.books || []);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load books:', err);
        setLoading(false);
      });
  }, [selectedShelf, debouncedQuery, sortBy]);

  useEffect(() => {
    loadShelves();
    loadContinueReading();
  }, [loadShelves, loadContinueReading]);

  useEffect(() => {
    loadBooks();
  }, [loadBooks]);

  // Handle book progress update from Reader
  const handleProgressUpdate = useCallback((bookId, newProgress) => {
    setBooks(prev => prev.map(b => (b.id === bookId ? { ...b, progress: newProgress } : b)));
  }, []);

  // Right-click context menu handler
  const handleContextMenu = (e, book) => {
    setContextMenu({
      isOpen: true,
      x: e.clientX,
      y: e.clientY,
      book: book
    });
  };

  // Mark status handler (not_started / completed)
  const handleMarkStatus = (book, status) => {
    fetch('/api/book/status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ book_id: book.id, status: status })
    })
    .then(res => res.json())
    .then(data => {
      if (data.status === 'ok') {
        handleProgressUpdate(book.id, data.progress);
      }
    })
    .catch(err => console.error('Failed to update book status:', err));
  };

  // Open in system viewer
  const handleOpenSystem = (book) => {
    fetch('/api/open-system', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ book_id: book.id })
    }).catch(err => console.error('Failed to open system viewer:', err));
  };

  // Shelf right-click context menu handler
  const handleShelfContextMenu = (e, shelf) => {
    setShelfContextMenu({
      isOpen: true,
      x: e.clientX,
      y: e.clientY,
      shelf: shelf
    });
  };

  // Save renamed shelf
  const handleSaveShelfName = (shelfId, customName) => {
    fetch('/api/shelves/rename', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shelf_id: shelfId, custom_name: customName })
    })
    .then(res => res.json())
    .then(data => {
      if (data.status === 'ok') {
        setShelves(data.shelves);
        setRenameModal({ isOpen: false, shelf: null });
        loadBooks();
      }
    })
    .catch(err => console.error('Failed to rename shelf:', err));
  };

  // Reset shelf name to original
  const handleResetShelfName = (shelf) => {
    handleSaveShelfName(shelf.id, '');
  };

  // Find active shelf metadata
  const currentShelfObj = shelves.find(s => s.id === selectedShelf);

  // Dynamic Browser Tab Title
  useEffect(() => {
    if (activeBook) {
      document.title = `${activeBook.title} - ${t('appTitle')}`;
    } else if (currentShelfObj) {
      document.title = `${currentShelfObj.name} - ${t('appTitle')}`;
    } else {
      document.title = t('appTitle');
    }
  }, [activeBook, currentShelfObj, t]);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col lg:flex-row">
      {/* Sidebar */}
      <Sidebar
        shelves={shelves}
        totalBooks={totalBooks}
        selectedShelf={selectedShelf}
        onSelectShelf={(id) => {
          setSelectedShelf(id);
          setSearchQuery('');
        }}
        onShelfContextMenu={handleShelfContextMenu}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navigation Bar */}
        <header className="h-16 px-4 sm:px-6 bg-neutral-925/80 backdrop-blur-md border-b border-neutral-850 sticky top-0 z-20 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-lg bg-neutral-850 text-neutral-300 hover:text-white lg:hidden"
              title="Abrir menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Breadcrumb / Current Shelf Title */}
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold text-neutral-100 truncate flex items-center gap-2">
                <FolderOpen className="w-4 h-4 text-amber-500 shrink-0" />
                <span>{currentShelfObj ? currentShelfObj.name : t('allShelves')}</span>
              </h2>
            </div>
          </div>

          {/* Search Bar */}
          <div className="flex-1 max-w-md mx-2">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder={t('searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-9 py-2 text-xs sm:text-sm bg-neutral-900 border border-neutral-800 rounded-xl text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50 transition shadow-inner"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Sort Selector & Language Selector */}
          <div className="flex items-center gap-2.5">
            <div className="relative flex items-center">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-neutral-900 border border-neutral-800 text-neutral-300 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-amber-500/60 cursor-pointer"
              >
                <option value="title_asc">{t('sortNameAsc')}</option>
                <option value="title_desc">{t('sortNameDesc')}</option>
                <option value="size_desc">{t('sortSizeDesc')}</option>
                <option value="recent">{t('sortRecent')}</option>
              </select>
            </div>

            <LanguageSelector />
          </div>
        </header>

        {/* Books Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {/* Continue Reading Shelf (only displayed when browsing all books without active search) */}
          {!selectedShelf && !debouncedQuery && continueReading.length > 0 && (
            <ContinueReading 
              books={continueReading} 
              onSelectBook={(book) => setActiveBook(book)} 
              onContextMenu={handleContextMenu}
            />
          )}

          {/* Shelf Section Title & Count */}
          <div className="flex items-center justify-between mb-6 pb-2 border-b border-neutral-850">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-neutral-100 tracking-tight">
                {currentShelfObj ? currentShelfObj.name : t('fullLibrary')}
              </h2>
              <p className="text-xs text-neutral-400 mt-0.5">
                {debouncedQuery 
                  ? t('searchResults', { query: debouncedQuery, count: books.length })
                  : t('booksInShelf', { count: books.length })}
              </p>
            </div>
          </div>

          {/* Book Cards Grid */}
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5 sm:gap-6">
              {[...Array(12)].map((_, i) => (
                <div key={i} className="flex flex-col gap-2">
                  <div className="w-full aspect-[1/1.45] bg-neutral-900 rounded-md animate-pulse" />
                  <div className="h-3.5 bg-neutral-900 rounded w-3/4 animate-pulse" />
                  <div className="h-3 bg-neutral-900 rounded w-1/2 animate-pulse" />
                </div>
              ))}
            </div>
          ) : books.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5 sm:gap-6">
              {books.map((book) => (
                <BookCard
                  key={book.id}
                  book={book}
                  onSelectBook={(selected) => setActiveBook(selected)}
                  onContextMenu={handleContextMenu}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-20 flex flex-col items-center justify-center">
              <div className="w-16 h-16 rounded-2xl bg-neutral-900 flex items-center justify-center text-neutral-600 mb-4">
                <BookOpen className="w-8 h-8" />
              </div>
              <h3 className="text-base font-semibold text-neutral-300">{t('noBooksFound')}</h3>
              <p className="text-xs text-neutral-500 mt-1 max-w-sm">
                {t('noBooksDesc')}
              </p>
              {debouncedQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="mt-4 px-3 py-1.5 text-xs rounded-lg bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 transition"
                >
                  {t('clearSearch')}
                </button>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Embedded Fullscreen PDF Reader */}
      {activeBook && (
        <Reader
          book={activeBook}
          onClose={() => {
            setActiveBook(null);
            loadContinueReading();
          }}
          onProgressUpdate={handleProgressUpdate}
        />
      )}

      {/* Custom Context Menu on Right Click (Books) */}
      {contextMenu.isOpen && contextMenu.book && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          book={contextMenu.book}
          onClose={() => setContextMenu({ isOpen: false, x: 0, y: 0, book: null })}
          onOpenReader={(book) => setActiveBook(book)}
          onOpenSystem={handleOpenSystem}
          onMarkStatus={handleMarkStatus}
        />
      )}

      {/* Shelf Context Menu on Right Click (Sidebar) */}
      {shelfContextMenu.isOpen && shelfContextMenu.shelf && (
        <ShelfContextMenu
          x={shelfContextMenu.x}
          y={shelfContextMenu.y}
          shelf={shelfContextMenu.shelf}
          onClose={() => setShelfContextMenu({ isOpen: false, x: 0, y: 0, shelf: null })}
          onOpenRename={(shelf) => setRenameModal({ isOpen: true, shelf: shelf })}
          onResetName={handleResetShelfName}
        />
      )}

      {/* Shelf Virtual Rename Modal */}
      <ShelfRenameModal
        shelf={renameModal.shelf}
        isOpen={renameModal.isOpen}
        onClose={() => setRenameModal({ isOpen: false, shelf: null })}
        onSave={handleSaveShelfName}
      />
    </div>
  );
}
