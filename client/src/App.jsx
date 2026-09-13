import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Search, SlidersHorizontal, Menu, X, BookOpen, 
  ArrowUpDown, FolderOpen, RefreshCw, PanelLeftClose, PanelLeftOpen,
  Settings 
} from 'lucide-react';

import Sidebar from './components/Sidebar';
import BookCard from './components/BookCard';
import ContinueReading from './components/ContinueReading';
import FavoriteBooks from './components/FavoriteBooks';
import Reader from './components/Reader';
import ContextMenu from './components/ContextMenu';
import ShelfContextMenu from './components/ShelfContextMenu';
import ShelfRenameModal from './components/ShelfRenameModal';
import SettingsModal from './components/SettingsModal';
import LanguageSelector from './components/LanguageSelector';
import { useI18n } from './i18n';

// Helper to extract book ID from URL route (/book/:id, #/book/:id, ?book=:id)
function getBookIdFromRoute() {
  if (typeof window === 'undefined') return null;
  const pathMatch = window.location.pathname.match(/\/book\/([^/?#]+)/);
  if (pathMatch && pathMatch[1]) {
    return decodeURIComponent(pathMatch[1]);
  }
  const hashMatch = window.location.hash.match(/#\/?book\/([^/?#]+)/);
  if (hashMatch && hashMatch[1]) {
    return decodeURIComponent(hashMatch[1]);
  }
  const searchParams = new URLSearchParams(window.location.search);
  const qBook = searchParams.get('book');
  if (qBook) {
    return qBook;
  }
  return null;
}

export default function App() {
  const { t } = useI18n();
  const [shelves, setShelves] = useState([]);
  const [totalBooks, setTotalBooks] = useState(0);
  const [selectedShelf, setSelectedShelf] = useState(null);
  const [books, setBooks] = useState([]);
  const [continueReading, setContinueReading] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [favoriteIds, setFavoriteIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [sortBy, setSortBy] = useState('title_asc');
  const [activeBook, setActiveBook] = useState(null);
  const [routeLoading, setRouteLoading] = useState(() => Boolean(getBookIdFromRoute()));
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    try {
      const saved = localStorage.getItem('sidebar_open');
      if (saved !== null) {
        return saved === 'true';
      }
    } catch (e) {}
    return typeof window !== 'undefined' ? window.innerWidth >= 1024 : true;
  });

  const toggleSidebar = useCallback(() => {
    setSidebarOpen(prev => {
      const next = !prev;
      try {
        localStorage.setItem('sidebar_open', String(next));
      } catch (e) {}
      return next;
    });
  }, []);

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
      if (activeBook) return;

      if ((e.ctrlKey || e.metaKey) && (e.key === 'b' || e.key === 'B')) {
        e.preventDefault();
        toggleSidebar();
      } else if (e.key === '/' && document.activeElement !== searchInputRef.current) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeBook, toggleSidebar]);

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

  // Load Favorites
  const loadFavorites = useCallback(() => {
    fetch('/api/favorites')
      .then(res => res.json())
      .then(data => {
        setFavorites(data.books || []);
        setFavoriteIds(new Set(data.favorite_ids || []));
      })
      .catch(err => console.error('Failed to load favorites:', err));
  }, []);

  // Toggle Favorite
  const handleToggleFavorite = useCallback((book) => {
    if (!book) return;
    fetch('/api/favorites/toggle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ book_id: book.id })
    })
    .then(res => res.json())
    .then(data => {
      if (data.status === 'ok') {
        const nextIds = new Set(data.favorite_ids || []);
        setFavoriteIds(nextIds);
        setBooks(prev => prev.map(b => b.id === book.id ? { ...b, is_favorite: data.is_favorite } : b));
        setContinueReading(prev => prev.map(b => b.id === book.id ? { ...b, is_favorite: data.is_favorite } : b));
        loadFavorites();
      }
    })
    .catch(err => console.error('Failed to toggle favorite:', err));
  }, [loadFavorites]);

  // Open reader and update browser route to /book/:id
  const openReader = useCallback((book) => {
    if (!book) return;
    setActiveBook(book);
    const targetPath = `/book/${encodeURIComponent(book.id)}`;
    if (window.location.pathname !== targetPath) {
      window.history.pushState({ bookId: book.id }, '', targetPath);
    }
  }, []);

  // Close reader and reset route to /
  const closeReader = useCallback(() => {
    setActiveBook(null);
    if (window.location.pathname.startsWith('/book/') || window.location.search.includes('book=') || window.location.hash.includes('book/')) {
      window.history.pushState(null, '', '/');
    }
    loadContinueReading();
    loadFavorites();
  }, [loadContinueReading, loadFavorites]);

  // Handle browser Back and Forward navigation (popstate)
  useEffect(() => {
    const handlePopState = () => {
      const bookId = getBookIdFromRoute();
      if (bookId) {
        if (!activeBook || activeBook.id !== bookId) {
          fetch(`/api/book/${encodeURIComponent(bookId)}`)
            .then(res => {
              if (!res.ok) throw new Error('Book not found');
              return res.json();
            })
            .then(book => {
              if (book && book.id) setActiveBook(book);
            })
            .catch(() => {
              setActiveBook(null);
              window.history.replaceState(null, '', '/');
            });
        }
      } else {
        if (activeBook) {
          setActiveBook(null);
          loadContinueReading();
          loadFavorites();
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [activeBook, loadContinueReading, loadFavorites]);

  // Load book directly from route on initial page load / reload
  useEffect(() => {
    const initialBookId = getBookIdFromRoute();
    if (initialBookId) {
      fetch(`/api/book/${encodeURIComponent(initialBookId)}`)
        .then(res => {
          if (!res.ok) throw new Error('Book not found');
          return res.json();
        })
        .then(book => {
          if (book && book.id) {
            setActiveBook(book);
          }
        })
        .catch(err => {
          console.error('Failed to load book from route:', err);
          window.history.replaceState(null, '', '/');
        })
        .finally(() => {
          setRouteLoading(false);
        });
    } else {
      setRouteLoading(false);
    }
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
    loadFavorites();
  }, [loadShelves, loadContinueReading, loadFavorites]);

  useEffect(() => {
    loadBooks();
  }, [loadBooks]);

  // Handle book progress update from Reader or status change
  const handleProgressUpdate = useCallback((bookId, newProgress) => {
    setBooks(prev => prev.map(b => (b.id === bookId ? { ...b, progress: newProgress } : b)));
    setContinueReading(prev => {
      const isNotReading = !newProgress || 
        newProgress.status === 'not_started' || 
        newProgress.status === 'completed' || 
        (newProgress.page || 1) <= 1 || 
        (newProgress.percent || 0) >= 100;

      if (isNotReading) {
        return prev.filter(b => b.id !== bookId);
      }
      return prev.map(b => (b.id === bookId ? { ...b, progress: newProgress } : b));
    });
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
    // Instant optimistic update
    if (status === 'not_started') {
      const resetProgress = {
        page: 1,
        total_pages: book.progress?.total_pages || 1,
        percent: 0,
        status: 'not_started'
      };
      handleProgressUpdate(book.id, resetProgress);
    } else if (status === 'completed') {
      const totalPages = book.progress?.total_pages || 1;
      const completedProgress = {
        page: totalPages,
        total_pages: totalPages,
        percent: 100,
        status: 'completed'
      };
      handleProgressUpdate(book.id, completedProgress);
    }

    fetch('/api/book/status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ book_id: book.id, status: status })
    })
    .then(res => res.json())
    .then(data => {
      if (data.status === 'ok') {
        handleProgressUpdate(book.id, data.progress);
        loadContinueReading();
      }
    })
    .catch(err => {
      console.error('Failed to update book status:', err);
      loadContinueReading();
      loadBooks();
    });
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
    } else if (selectedShelf === 'favorites') {
      document.title = `${t('favorites')} - ${t('appTitle')}`;
    } else if (currentShelfObj) {
      document.title = `${currentShelfObj.name} - ${t('appTitle')}`;
    } else {
      document.title = t('appTitle');
    }
  }, [activeBook, selectedShelf, currentShelfObj, t]);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col lg:flex-row">
      {/* Sidebar */}
      <Sidebar
        shelves={shelves}
        totalBooks={totalBooks}
        favoriteCount={favorites.length}
        selectedShelf={selectedShelf}
        onSelectShelf={(id) => {
          setSelectedShelf(id);
          setSearchQuery('');
          if (window.innerWidth < 1024) {
            setSidebarOpen(false);
          }
        }}
        onShelfContextMenu={handleShelfContextMenu}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 transition-all duration-300">
        {/* Top Navigation Bar */}
        <header className="h-16 px-4 sm:px-6 bg-neutral-925/80 backdrop-blur-md border-b border-neutral-850 sticky top-0 z-20 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <button
              onClick={toggleSidebar}
              className={`p-2 rounded-lg transition-colors border ${
                sidebarOpen 
                  ? 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-100 hover:bg-neutral-850' 
                  : 'bg-amber-500/15 border-amber-500/30 text-amber-400 hover:bg-amber-500/25'
              }`}
              title={sidebarOpen ? t('collapseSidebar') : t('expandSidebar')}
            >
              {sidebarOpen ? <PanelLeftClose className="w-5 h-5" /> : <PanelLeftOpen className="w-5 h-5" />}
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

            {/* Settings Button */}
            <button
              onClick={() => setSettingsOpen(true)}
              className="p-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-amber-400 hover:border-amber-500/30 transition shadow-sm"
              title={t('settings')}
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Books Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {/* Continue Reading Shelf (only displayed when browsing all books without active search) */}
          {!selectedShelf && !debouncedQuery && continueReading.length > 0 && (
            <ContinueReading 
              books={continueReading} 
              onSelectBook={(book) => openReader(book)} 
              onContextMenu={handleContextMenu}
            />
          )}

          {/* Favorite Books Shelf (displayed below Continue Reading) */}
          {!selectedShelf && !debouncedQuery && favorites.length > 0 && (
            <FavoriteBooks
              books={favorites}
              onSelectBook={(book) => openReader(book)}
              onContextMenu={handleContextMenu}
              onToggleFavorite={handleToggleFavorite}
            />
          )}

          {/* Shelf Section Title & Count */}
          <div className="flex items-center justify-between mb-6 pb-2 border-b border-neutral-850">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-neutral-100 tracking-tight">
                {selectedShelf === 'favorites' 
                  ? t('favorites') 
                  : currentShelfObj 
                    ? currentShelfObj.name 
                    : t('fullLibrary')}
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
                  isFavorite={favoriteIds.has(book.id)}
                  onSelectBook={(selected) => openReader(selected)}
                  onContextMenu={handleContextMenu}
                  onToggleFavorite={handleToggleFavorite}
                />
              ))}
            </div>
          ) : totalBooks === 0 && !debouncedQuery ? (
            <div className="text-center py-20 flex flex-col items-center justify-center max-w-md mx-auto">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-4 shadow-lg shadow-amber-500/10">
                <FolderOpen className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-neutral-100">{t('setupPromptTitle')}</h3>
              <p className="text-xs text-neutral-400 mt-2 mb-6 leading-relaxed">
                {t('setupPromptDesc')}
              </p>
              <button
                onClick={() => setSettingsOpen(true)}
                className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold rounded-xl inline-flex items-center gap-2 shadow-xl shadow-amber-500/20 transition cursor-pointer"
              >
                <Settings className="w-4 h-4" />
                <span>{t('configureLibrary')}</span>
              </button>
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

      {/* Route Loading Fullscreen State */}
      {routeLoading && !activeBook && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-neutral-950 text-neutral-400 gap-3 select-none">
          <div className="w-9 h-9 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium text-neutral-300">{t('loadingBook')}</p>
        </div>
      )}

      {/* Embedded Fullscreen PDF Reader */}
      {activeBook && (
        <Reader
          book={activeBook}
          isFavorite={favoriteIds.has(activeBook.id)}
          onClose={closeReader}
          onProgressUpdate={handleProgressUpdate}
          onToggleFavorite={handleToggleFavorite}
        />
      )}

      {/* Custom Context Menu on Right Click (Books) */}
      {contextMenu.isOpen && contextMenu.book && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          book={contextMenu.book}
          isFavorite={favoriteIds.has(contextMenu.book.id)}
          onClose={() => setContextMenu({ isOpen: false, x: 0, y: 0, book: null })}
          onOpenReader={(book) => openReader(book)}
          onMarkStatus={handleMarkStatus}
          onToggleFavorite={handleToggleFavorite}
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

      {/* Library Settings Modal */}
      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onSaved={() => {
          loadShelves();
          loadBooks();
          loadContinueReading();
        }}
      />
    </div>
  );
}
