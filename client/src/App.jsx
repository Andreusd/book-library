import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Search, SlidersHorizontal, Menu, X, BookOpen, 
  ArrowUpDown, FolderOpen, RefreshCw, PanelLeftClose, PanelLeftOpen,
  Settings, Heart, Bookmark, Home, Maximize2, Minimize2, Library, Folder, Tag
} from 'lucide-react';

import Sidebar from './components/Sidebar';
import BookCard from './components/BookCard';
import ContinueReading from './components/ContinueReading';
import FavoriteBooks from './components/FavoriteBooks';
import LibraryFolders from './components/LibraryFolders';
import FolderCard from './components/FolderCard';
import AllBooks from './components/AllBooks';
import LibrarySelector from './components/LibrarySelector';
import Reader from './components/Reader';
import ContextMenu from './components/ContextMenu';
import ShelfContextMenu from './components/ShelfContextMenu';
import ShelfRenameModal from './components/ShelfRenameModal';
import ShelfIconModal from './components/ShelfIconModal';
import ShelfIcon from './components/ShelfIcon';
import SettingsModal from './components/SettingsModal';
import TagManagerModal from './components/TagManagerModal';
import { getTagColorConfig } from './utils/tagColors';
import { useI18n } from './i18n';

// Helper to extract view & route information from URL
// Scoped routes: /:libraryId, /:libraryId/folder/:id, /:libraryId/continue-reading, /:libraryId/favorites, /:libraryId/book/:id
// Root / -> view: 'select-library'
function parseRoute() {
  if (typeof window === 'undefined') {
    return { view: 'select-library', libraryId: null, shelfId: null, bookId: null };
  }

  let rawPath = window.location.pathname;
  if (window.location.hash && window.location.hash.startsWith('#/')) {
    rawPath = window.location.hash.slice(1);
  }

  // Split path into clean segments
  const segments = rawPath.split('/').filter(Boolean).map(s => decodeURIComponent(s));

  // 1. Root / -> Select Library view
  if (segments.length === 0) {
    return { view: 'select-library', libraryId: null, shelfId: null, bookId: null };
  }

  // 2. Legacy direct paths without library prefix (for backward compatibility)
  if (segments[0] === 'book' && segments[1]) {
    return { view: 'book', libraryId: null, shelfId: null, bookId: segments[1] };
  }
  if (segments[0] === 'continue-reading') {
    return { view: 'continue-reading', libraryId: null, shelfId: 'continue-reading', bookId: null };
  }
  if (segments[0] === 'favorites') {
    return { view: 'favorites', libraryId: null, shelfId: 'favorites', bookId: null };
  }
  if (segments[0] === 'folders' || segments[0] === 'shelves') {
    return { view: 'folders', libraryId: null, shelfId: 'folders', bookId: null };
  }
  if ((segments[0] === 'folder' || segments[0] === 'shelf') && segments[1]) {
    return { view: 'folder', libraryId: null, shelfId: segments[1], bookId: null };
  }
  if (segments[0] === 'tag' && segments[1]) {
    return { view: 'tag', libraryId: null, shelfId: `tag:${segments[1]}`, bookId: null };
  }

  // 3. Library-scoped routes:
  // Support both /:libraryId and /library/:libraryId
  let libId = segments[0];
  let rest = segments.slice(1);
  if (libId === 'library' && rest.length > 0) {
    libId = rest[0];
    rest = rest.slice(1);
  }

  // /:libraryId
  if (rest.length === 0) {
    return { view: 'home', libraryId: libId, shelfId: null, bookId: null };
  }

  // /:libraryId/book/:bookId
  if (rest[0] === 'book' && rest[1]) {
    return { view: 'book', libraryId: libId, shelfId: null, bookId: rest[1] };
  }

  // /:libraryId/continue-reading
  if (rest[0] === 'continue-reading') {
    return { view: 'continue-reading', libraryId: libId, shelfId: 'continue-reading', bookId: null };
  }

  // /:libraryId/favorites
  if (rest[0] === 'favorites') {
    return { view: 'favorites', libraryId: libId, shelfId: 'favorites', bookId: null };
  }

  // /:libraryId/folders or /:libraryId/shelves
  if (rest[0] === 'folders' || rest[0] === 'shelves') {
    return { view: 'folders', libraryId: libId, shelfId: 'folders', bookId: null };
  }

  // /:libraryId/folder/:folderId or /:libraryId/shelf/:folderId
  if ((rest[0] === 'folder' || rest[0] === 'shelf') && rest[1]) {
    return { view: 'folder', libraryId: libId, shelfId: rest[1], bookId: null };
  }

  // /:libraryId/tag/:tagId
  if (rest[0] === 'tag' && rest[1]) {
    return { view: 'tag', libraryId: libId, shelfId: `tag:${rest[1]}`, bookId: null };
  }

  return { view: 'home', libraryId: libId, shelfId: null, bookId: null };
}

function getPathForShelf(shelfId, libraryId) {
  if (!libraryId) return '/';
  const base = `/${encodeURIComponent(libraryId)}`;
  if (!shelfId) return base;
  if (shelfId === 'continue-reading') return `${base}/continue-reading`;
  if (shelfId === 'favorites') return `${base}/favorites`;
  if (shelfId === 'folders' || shelfId === 'shelves') return `${base}/folders`;
  if (shelfId.startsWith('tag:')) return `${base}/tag/${encodeURIComponent(shelfId.slice(4))}`;
  return `${base}/folder/${encodeURIComponent(shelfId)}`;
}
const getPathForFolder = getPathForShelf;

function getPathForBook(bookId, libraryId) {
  if (!libraryId) return `/book/${encodeURIComponent(bookId)}`;
  return `/${encodeURIComponent(libraryId)}/book/${encodeURIComponent(bookId)}`;
}

export default function App() {
  const initialRoute = parseRoute();
  const { t } = useI18n();
  const [shelves, setShelves] = useState([]);
  const [totalBooks, setTotalBooks] = useState(0);
  const [libraries, setLibraries] = useState([]);
  const [activeLibraryId, setActiveLibraryId] = useState(() => initialRoute.libraryId || '');
  const [selectedShelf, setSelectedShelf] = useState(() => initialRoute.shelfId);
  const [books, setBooks] = useState([]);
  const [continueReading, setContinueReading] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [favoriteIds, setFavoriteIds] = useState(new Set());
  const [tags, setTags] = useState([]);
  const [tagModal, setTagModal] = useState({ isOpen: false, book: null });
  const [loading, setLoading] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showFileExtension, setShowFileExtension] = useState(() => {
    try {
      const saved = localStorage.getItem('show_file_extension');
      return saved !== null ? saved === 'true' : true;
    } catch (e) {
      return true;
    }
  });

  const handleToggleFileExtension = useCallback((enabled) => {
    setShowFileExtension(enabled);
    try {
      localStorage.setItem('show_file_extension', String(enabled));
    } catch (e) {}
  }, []);

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [sortBy, setSortBy] = useState('title_asc');
  const [activeBook, setActiveBook] = useState(null);
  const [routeLoading, setRouteLoading] = useState(() => Boolean(initialRoute.bookId));
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

  const [isFullscreen, setIsFullscreen] = useState(() => {
    return typeof document !== 'undefined' ? Boolean(document.fullscreenElement) : false;
  });

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => console.log(err));
    } else {
      document.exitFullscreen().catch(err => console.log(err));
    }
  }, []);

  const [contextMenu, setContextMenu] = useState({ isOpen: false, x: 0, y: 0, book: null });
  const [shelfContextMenu, setShelfContextMenu] = useState({ isOpen: false, x: 0, y: 0, shelf: null });
  const [renameModal, setRenameModal] = useState({ isOpen: false, shelf: null });
  const [iconModal, setIconModal] = useState({ isOpen: false, shelf: null });

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

  // Load Libraries
  const loadLibraries = useCallback(() => {
    fetch('/api/libraries')
      .then(res => res.json())
      .then(data => {
        setLibraries(data.libraries || []);
      })
      .catch(err => console.error('Failed to load libraries:', err));

    fetch('/api/settings')
      .then(res => res.json())
      .then(data => {
        if (data && data.show_file_extension !== undefined) {
          const localSaved = localStorage.getItem('show_file_extension');
          if (localSaved === null) {
            setShowFileExtension(data.show_file_extension);
            localStorage.setItem('show_file_extension', String(data.show_file_extension));
          }
        }
      })
      .catch(() => {});
  }, []);

  // Load Shelves & Totals
  const loadShelves = useCallback((libId) => {
    const targetLib = libId !== undefined ? libId : activeLibraryId;
    if (!targetLib) {
      setShelves([]);
      setTotalBooks(0);
      return;
    }
    const url = `/api/shelves?library_id=${encodeURIComponent(targetLib)}`;
    fetch(url)
      .then(res => res.json())
      .then(data => {
        setShelves(data.shelves || []);
        setTotalBooks(data.total_books || 0);
      })
      .catch(err => console.error('Failed to load shelves:', err));
  }, [activeLibraryId]);

  // Load Continue Reading
  const loadContinueReading = useCallback((libId) => {
    const targetLib = libId !== undefined ? libId : activeLibraryId;
    if (!targetLib) {
      setContinueReading([]);
      return;
    }
    const url = `/api/continue-reading?library_id=${encodeURIComponent(targetLib)}`;
    fetch(url)
      .then(res => res.json())
      .then(data => {
        setContinueReading(data.books || []);
      })
      .catch(err => console.error('Failed to load continue reading:', err));
  }, [activeLibraryId]);

  // Load Favorites
  const loadFavorites = useCallback((libId) => {
    const targetLib = libId !== undefined ? libId : activeLibraryId;
    if (!targetLib) {
      setFavorites([]);
      setFavoriteIds(new Set());
      return;
    }
    const url = `/api/favorites?library_id=${encodeURIComponent(targetLib)}`;
    fetch(url)
      .then(res => res.json())
      .then(data => {
        setFavorites(data.books || []);
        setFavoriteIds(new Set(data.favorite_ids || []));
      })
      .catch(err => console.error('Failed to load favorites:', err));
  }, [activeLibraryId]);

  // Load Virtual Tags
  const loadTags = useCallback((libId) => {
    const targetLib = libId !== undefined ? libId : activeLibraryId;
    const url = targetLib 
      ? `/api/tags?library_id=${encodeURIComponent(targetLib)}` 
      : '/api/tags';
    fetch(url)
      .then(res => res.json())
      .then(data => {
        setTags(data.tags || []);
      })
      .catch(err => console.error('Failed to load tags:', err));
  }, [activeLibraryId]);

  // Handle Book Tags Updated from Modal
  const handleBookTagsUpdated = useCallback((bookId, updatedTags) => {
    setBooks(prev => prev.map(b => b.id === bookId ? { ...b, tags: updatedTags } : b));
    setContinueReading(prev => prev.map(b => b.id === bookId ? { ...b, tags: updatedTags } : b));
    setFavorites(prev => prev.map(b => b.id === bookId ? { ...b, tags: updatedTags } : b));
    setActiveBook(prev => (prev && prev.id === bookId ? { ...prev, tags: updatedTags } : prev));
  }, []);

  // Load Books
  const loadBooks = useCallback((libId, targetShelf) => {
    const targetLib = libId !== undefined ? libId : activeLibraryId;
    if (!targetLib) {
      setBooks([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const shelfToUse = targetShelf !== undefined ? targetShelf : selectedShelf;
    const params = new URLSearchParams();
    params.append('library_id', targetLib);
    if (shelfToUse && shelfToUse.startsWith('tag:')) {
      params.append('tag', shelfToUse.slice(4));
    } else if (shelfToUse && shelfToUse !== 'folders') {
      params.append('shelf', shelfToUse);
    }
    if (debouncedQuery && shelfToUse !== 'folders') params.append('query', debouncedQuery);
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
  }, [activeLibraryId, selectedShelf, debouncedQuery, sortBy]);

  // Select Library from selector screen
  const selectLibrary = useCallback((libraryId) => {
    setActiveLibraryId(libraryId);
    setSelectedShelf(null);
    setSearchQuery('');
    const targetPath = `/${encodeURIComponent(libraryId)}`;
    if (window.location.pathname !== targetPath) {
      window.history.pushState({ libraryId, shelfId: null }, '', targetPath);
    }
    loadShelves(libraryId);
    loadBooks(libraryId, null);
    loadContinueReading(libraryId);
    loadFavorites(libraryId);
    loadTags(libraryId);
  }, [loadShelves, loadBooks, loadContinueReading, loadFavorites, loadTags]);

  // Return to All Libraries selection screen
  const selectAllLibraries = useCallback(() => {
    setActiveLibraryId('');
    setSelectedShelf(null);
    setActiveBook(null);
    setSearchQuery('');
    if (window.location.pathname !== '/') {
      window.history.pushState(null, '', '/');
    }
    loadLibraries();
    loadTags('');
  }, [loadLibraries, loadTags]);

  // Switch Active Library
  const switchLibrary = useCallback((libraryId) => {
    selectLibrary(libraryId);
  }, [selectLibrary]);

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
        setBooks(prev => {
          const updated = prev.map(b => b.id === book.id ? { ...b, is_favorite: data.is_favorite } : b);
          if (selectedShelf === 'favorites') {
            return updated.filter(b => b.is_favorite);
          }
          if (selectedShelf && selectedShelf !== 'continue-reading') {
            return [...updated].sort((a, b) => {
              const aFav = nextIds.has(a.id) ? 0 : 1;
              const bFav = nextIds.has(b.id) ? 0 : 1;
              return aFav - bFav;
            });
          }
          return updated;
        });
        setContinueReading(prev => prev.map(b => b.id === book.id ? { ...b, is_favorite: data.is_favorite } : b));
        loadFavorites(activeLibraryId);
      }
    })
    .catch(err => console.error('Failed to toggle favorite:', err));
  }, [loadFavorites, selectedShelf, activeLibraryId]);

  // Navigate to shelf and update browser URL
  const navigateToShelf = useCallback((shelfId, replace = false) => {
    setSelectedShelf(shelfId);
    setSearchQuery('');
    const targetPath = getPathForShelf(shelfId, activeLibraryId);
    if (window.location.pathname !== targetPath) {
      if (replace) {
        window.history.replaceState({ libraryId: activeLibraryId, shelfId }, '', targetPath);
      } else {
        window.history.pushState({ libraryId: activeLibraryId, shelfId }, '', targetPath);
      }
    }
  }, [activeLibraryId]);

  // Open reader and update browser route to /:libraryId/book/:id
  const openReader = useCallback((book) => {
    if (!book) return;
    setActiveBook(book);
    const targetLib = activeLibraryId || book.library_id || 'default';
    if (!activeLibraryId && book.library_id) {
      setActiveLibraryId(book.library_id);
    }
    const targetPath = getPathForBook(book.id, targetLib);
    if (window.location.pathname !== targetPath) {
      window.history.pushState({ bookId: book.id, libraryId: targetLib, shelfId: selectedShelf }, '', targetPath);
    }
  }, [activeLibraryId, selectedShelf]);

  // Close reader and return to current shelf route
  const closeReader = useCallback(() => {
    setActiveBook(null);
    const targetPath = getPathForShelf(selectedShelf, activeLibraryId);
    if (window.location.pathname !== targetPath) {
      window.history.pushState({ libraryId: activeLibraryId, shelfId: selectedShelf }, '', targetPath);
    }
    loadContinueReading(activeLibraryId);
    loadFavorites(activeLibraryId);
  }, [selectedShelf, activeLibraryId, loadContinueReading, loadFavorites]);

  // Handle browser Back and Forward navigation (popstate)
  useEffect(() => {
    const handlePopState = () => {
      const route = parseRoute();
      if (!route.libraryId && !route.bookId) {
        setActiveLibraryId('');
        setSelectedShelf(null);
        setActiveBook(null);
        loadLibraries();
        return;
      }

      if (route.libraryId && route.libraryId !== activeLibraryId) {
        setActiveLibraryId(route.libraryId);
      }

      if (route.bookId) {
        if (!activeBook || activeBook.id !== route.bookId) {
          fetch(`/api/book/${encodeURIComponent(route.bookId)}`)
            .then(res => {
              if (!res.ok) throw new Error('Book not found');
              return res.json();
            })
            .then(book => {
              if (book && book.id) {
                setActiveBook(book);
                if (book.library_id && !route.libraryId) {
                  setActiveLibraryId(book.library_id);
                }
              }
            })
            .catch(() => {
              setActiveBook(null);
              window.history.replaceState(null, '', getPathForShelf(selectedShelf, route.libraryId || activeLibraryId));
            });
        }
      } else {
        if (activeBook) {
          setActiveBook(null);
          loadContinueReading(route.libraryId || activeLibraryId);
          loadFavorites(route.libraryId || activeLibraryId);
          loadTags(route.libraryId || activeLibraryId);
        }
        setSelectedShelf(route.shelfId);
        setSearchQuery('');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [activeBook, selectedShelf, activeLibraryId, loadLibraries, loadContinueReading, loadFavorites, loadTags]);

  // Load book directly from route on initial page load / reload
  useEffect(() => {
    const route = parseRoute();
    if (route.bookId) {
      fetch(`/api/book/${encodeURIComponent(route.bookId)}`)
        .then(res => {
          if (!res.ok) throw new Error('Book not found');
          return res.json();
        })
        .then(book => {
          if (book && book.id) {
            const targetLib = route.libraryId || book.library_id || 'default';
            setActiveLibraryId(targetLib);
            setActiveBook(book);
            setSelectedShelf(prev => prev || book.shelf || null);
            window.history.replaceState({ bookId: book.id, libraryId: targetLib }, '', getPathForBook(book.id, targetLib));
          }
        })
        .catch(err => {
          console.error('Failed to load book from route:', err);
          window.history.replaceState(null, '', route.libraryId ? getPathForShelf(route.shelfId, route.libraryId) : '/');
        })
        .finally(() => {
          setRouteLoading(false);
        });
    } else {
      setRouteLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLibraries();
  }, [loadLibraries]);

  useEffect(() => {
    loadShelves();
    loadContinueReading();
    loadFavorites();
    loadTags();
  }, [activeLibraryId, loadShelves, loadContinueReading, loadFavorites, loadTags]);

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
        ((newProgress.page || 1) <= 1 && !newProgress.cfi && (newProgress.percent || 0) <= 0.5) || 
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
        status: 'not_started',
        cfi: null
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

  // Save shelf icon
  const handleSaveShelfIcon = (shelfId, iconName) => {
    fetch('/api/shelves/icon', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shelf_id: shelfId, icon: iconName })
    })
    .then(res => res.json())
    .then(data => {
      if (data.status === 'ok') {
        setShelves(data.shelves);
        setIconModal({ isOpen: false, shelf: null });
      }
    })
    .catch(err => console.error('Failed to save shelf icon:', err));
  };

  // Find active shelf or tag metadata
  const currentShelfObj = shelves.find(s => s.id === selectedShelf);
  const isTagFilter = selectedShelf && selectedShelf.startsWith('tag:');
  const activeTagId = isTagFilter ? selectedShelf.slice(4) : null;
  const currentTagObj = isTagFilter ? tags.find(t => t.id === activeTagId) : null;
  const activeLibraryObj = libraries.find(l => l.id === activeLibraryId);

  // Dynamic Browser Tab Title
  useEffect(() => {
    if (activeBook) {
      document.title = `${activeBook.title} - ${t('appTitle')}`;
    } else if (selectedShelf === 'continue-reading') {
      document.title = `${t('continueReading')} - ${activeLibraryObj?.name || t('appTitle')}`;
    } else if (selectedShelf === 'favorites') {
      document.title = `${t('favorites')} - ${activeLibraryObj?.name || t('appTitle')}`;
    } else if (selectedShelf === 'folders') {
      document.title = `${t('folders')} - ${activeLibraryObj?.name || t('appTitle')}`;
    } else if (isTagFilter && currentTagObj) {
      document.title = `${currentTagObj.name} - ${activeLibraryObj?.name || t('appTitle')}`;
    } else if (currentShelfObj) {
      document.title = `${currentShelfObj.name} - ${activeLibraryObj?.name || t('appTitle')}`;
    } else if (activeLibraryObj) {
      document.title = `${activeLibraryObj.name} - ${t('appTitle')}`;
    } else {
      document.title = `${t('selectLibraryTitle')} - ${t('appTitle')}`;
    }
  }, [activeBook, selectedShelf, currentShelfObj, isTagFilter, currentTagObj, activeLibraryObj, t]);

  // When no active library is selected (e.g. root /), display Library Selection screen
  if (!activeLibraryId) {
    return (
      <>
        <LibrarySelector
          libraries={libraries}
          onSelectLibrary={selectLibrary}
          onOpenSettings={() => setSettingsOpen(true)}
          onAddNewLibrary={() => setSettingsOpen(true)}
        />

        <SettingsModal
          isOpen={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          showFileExtension={showFileExtension}
          onToggleFileExtension={handleToggleFileExtension}
          onLibraryChanged={(newActiveId) => {
            loadLibraries();
            if (newActiveId) {
              selectLibrary(newActiveId);
            }
          }}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col lg:flex-row">
      {/* Sidebar */}
      <Sidebar
        shelves={shelves}
        totalBooks={totalBooks}
        favoriteCount={favorites.length}
        continueReadingCount={continueReading.length}
        selectedShelf={selectedShelf}
        onSelectShelf={(id) => {
          navigateToShelf(id);
          if (window.innerWidth < 1024) {
            setSidebarOpen(false);
          }
        }}
        onShelfContextMenu={handleShelfContextMenu}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        libraries={libraries}
        activeLibraryId={activeLibraryId}
        onSwitchLibrary={switchLibrary}
        onSelectAllLibraries={selectAllLibraries}
        onOpenSettings={() => setSettingsOpen(true)}
        tags={tags}
        onOpenTagManager={() => setTagModal({ isOpen: true, book: null })}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 transition-all duration-300">
        {/* Top Navigation Bar */}
        <header className="h-16 px-4 sm:px-6 bg-neutral-900/90 backdrop-blur-md border-b border-neutral-800 sticky top-0 z-30 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <button
              onClick={toggleSidebar}
              className={`p-2 rounded-lg transition-colors border ${
                sidebarOpen 
                  ? 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800' 
                  : 'bg-amber-500/15 border-amber-500/30 text-amber-400 hover:bg-amber-500/25'
              }`}
              title={sidebarOpen ? t('collapseSidebar') : t('expandSidebar')}
            >
              {sidebarOpen ? <PanelLeftClose className="w-5 h-5" /> : <PanelLeftOpen className="w-5 h-5" />}
            </button>

            {/* Breadcrumb / Current Shelf Title */}
            <div className="min-w-0">
              <nav aria-label="Breadcrumb" className="text-sm sm:text-base font-bold text-neutral-100 truncate flex items-center gap-1.5">
                <button
                  onClick={selectAllLibraries}
                  className="flex items-center gap-1.5 text-neutral-400 hover:text-amber-400 transition-colors cursor-pointer shrink-0"
                  title={t('allLibraries')}
                >
                  <Library className="w-4 h-4 shrink-0 text-amber-500" />
                  <span className="hidden sm:inline font-medium text-xs sm:text-sm">{t('backToLibraries')}</span>
                </button>
                <span className="text-neutral-600">/</span>

                <button
                  onClick={() => navigateToShelf(null)}
                  className={`flex items-center gap-1.5 hover:text-amber-400 transition-colors cursor-pointer truncate ${
                    !selectedShelf ? 'text-neutral-100' : 'text-neutral-400'
                  }`}
                  title={activeLibraryObj?.name || activeLibraryId}
                >
                  <span className="font-semibold text-xs sm:text-sm truncate">
                    {activeLibraryObj?.name || t('allBooks')}
                  </span>
                </button>

                {selectedShelf && (
                  <>
                    <span className="text-neutral-600">/</span>
                    <span className="truncate flex items-center gap-1.5 text-neutral-100 text-xs sm:text-sm">
                      {selectedShelf === 'continue-reading' ? (
                        <>
                          <Bookmark className="w-4 h-4 text-emerald-500 fill-emerald-500 shrink-0" />
                          <span>{t('continueReading')}</span>
                        </>
                      ) : selectedShelf === 'favorites' ? (
                        <>
                          <Heart className="w-4 h-4 text-rose-500 fill-rose-500 shrink-0" />
                          <span>{t('favorites')}</span>
                        </>
                      ) : selectedShelf === 'folders' ? (
                        <>
                          <Folder className="w-4 h-4 text-amber-500 fill-amber-500 shrink-0" />
                          <span>{t('folders')}</span>
                        </>
                      ) : isTagFilter ? (
                        <>
                          {currentTagObj ? (
                            <span className={`w-2.5 h-2.5 rounded-full ${getTagColorConfig(currentTagObj.color).dot} shrink-0`} />
                          ) : (
                            <Tag className="w-4 h-4 text-amber-500 shrink-0" />
                          )}
                          <span>{currentTagObj ? currentTagObj.name : t('tagFilter')}</span>
                        </>
                      ) : (
                        <>
                          {currentShelfObj ? (
                            <ShelfIcon icon={currentShelfObj.icon} className="w-4 h-4 text-amber-500 shrink-0" />
                          ) : null}
                          <span>{currentShelfObj ? currentShelfObj.name : selectedShelf}</span>
                        </>
                      )}
                    </span>
                  </>
                )}
              </nav>
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

          {/* Sort Selector, Fullscreen & Settings Buttons */}
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

            {/* Toggle Fullscreen Button */}
            <button
              onClick={toggleFullscreen}
              className="p-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-amber-400 hover:border-amber-500/30 transition shadow-sm cursor-pointer"
              title={t('fullscreenTitle')}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            {/* Settings Button */}
            <button
              onClick={() => setSettingsOpen(true)}
              className="p-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-amber-400 hover:border-amber-500/30 transition shadow-sm cursor-pointer"
              title={t('settings')}
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Books Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto relative z-0">
          {/* Continue Reading Shelf (only displayed when browsing all books without active search) */}
          {!selectedShelf && !debouncedQuery && continueReading.length > 0 && (
            <ContinueReading 
              books={continueReading} 
              onSelectBook={(book) => openReader(book)} 
              onContextMenu={handleContextMenu}
              onViewAll={() => navigateToShelf('continue-reading')}
              onSelectTag={(tg) => navigateToShelf(`tag:${tg.id}`)}
              showFileExtension={showFileExtension}
            />
          )}

          {/* Favorite Books Shelf (displayed below Continue Reading) */}
          {!selectedShelf && !debouncedQuery && favorites.length > 0 && (
            <FavoriteBooks
              books={favorites}
              onSelectBook={(book) => openReader(book)}
              onContextMenu={handleContextMenu}
              onToggleFavorite={handleToggleFavorite}
              onViewAll={() => navigateToShelf('favorites')}
              onSelectTag={(tg) => navigateToShelf(`tag:${tg.id}`)}
              showFileExtension={showFileExtension}
            />
          )}

          {/* Folders (displayed when browsing all books without active search) */}
          {!selectedShelf && !debouncedQuery && shelves.length > 0 && (
            <LibraryFolders
              folders={shelves}
              books={books}
              onSelectFolder={(folderId) => navigateToShelf(folderId)}
              onContextMenu={handleShelfContextMenu}
              onViewAll={() => navigateToShelf('folders')}
            />
          )}

          {/* Shelf Section Title & Count (displayed when browsing a specific folder, shelf, or search query) */}
          {(selectedShelf || debouncedQuery) && (
            <div className="flex items-center justify-between mb-6 pb-2 border-b border-neutral-800">
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-neutral-100 tracking-tight flex items-center gap-2">
                  {selectedShelf === 'continue-reading'
                    ? t('continueReading')
                    : selectedShelf === 'favorites' 
                      ? t('favorites') 
                      : selectedShelf === 'folders'
                        ? t('folders')
                        : isTagFilter && currentTagObj
                          ? (
                            <>
                              <span className={`w-3 h-3 rounded-full ${getTagColorConfig(currentTagObj.color).dot} shrink-0`} />
                              <span>{currentTagObj.name}</span>
                            </>
                          )
                          : currentShelfObj 
                            ? currentShelfObj.name 
                            : t('allBooksLibrary')}
                </h2>
                <p className="text-xs text-neutral-400 mt-0.5">
                  {debouncedQuery 
                    ? t('searchResults', { 
                        query: debouncedQuery, 
                        count: selectedShelf === 'folders'
                          ? shelves.filter(s => s.name.toLowerCase().includes(debouncedQuery.toLowerCase())).length
                          : books.length 
                      })
                    : selectedShelf === 'folders'
                      ? t('foldersCount', { count: shelves.length })
                      : isTagFilter
                        ? t('booksTaggedCount', { count: books.length })
                        : t('booksInShelf', { count: books.length })}
                </p>
              </div>
            </div>
          )}

          {/* Content: Dedicated Folders Page Grid, Loading Skeletons, AllBooks Carousel, or Books Grid */}
          {selectedShelf === 'folders' ? (
            (() => {
              const displayFolders = debouncedQuery
                ? shelves.filter(s => s.name.toLowerCase().includes(debouncedQuery.toLowerCase()))
                : shelves;

              if (displayFolders.length === 0) {
                return (
                  <div className="text-center py-20 flex flex-col items-center justify-center">
                    <div className="w-16 h-16 rounded-2xl bg-neutral-900 flex items-center justify-center text-neutral-600 mb-4">
                      <Folder className="w-8 h-8 text-neutral-600" />
                    </div>
                    <h3 className="text-base font-semibold text-neutral-300">{t('noBooksFound')}</h3>
                    <p className="text-xs text-neutral-500 mt-1 max-w-sm">
                      {t('noBooksDesc')}
                    </p>
                  </div>
                );
              }

              return (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-5">
                  {displayFolders.map((folder) => (
                    <FolderCard
                      key={folder.id}
                      folder={folder}
                      books={books}
                      onSelectFolder={(folderId) => navigateToShelf(folderId)}
                      onContextMenu={handleShelfContextMenu}
                      className="w-full"
                    />
                  ))}
                </div>
              );
            })()
          ) : loading ? (
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
            !selectedShelf && !debouncedQuery ? (
              <AllBooks
                books={books}
                favoriteIds={favoriteIds}
                onSelectBook={(selected) => openReader(selected)}
                onContextMenu={handleContextMenu}
                onToggleFavorite={handleToggleFavorite}
                onSelectTag={(tg) => navigateToShelf(`tag:${tg.id}`)}
                showFileExtension={showFileExtension}
              />
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5 sm:gap-6">
                {books.map((book) => (
                  <BookCard
                    key={book.id}
                    book={book}
                    isFavorite={favoriteIds.has(book.id)}
                    onSelectBook={(selected) => openReader(selected)}
                    onContextMenu={handleContextMenu}
                    onToggleFavorite={handleToggleFavorite}
                    onSelectTag={(tg) => navigateToShelf(`tag:${tg.id}`)}
                    showFileExtension={showFileExtension}
                  />
                ))}
              </div>
            )
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
          showFileExtension={showFileExtension}
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
          onManageTags={(book) => setTagModal({ isOpen: true, book })}
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
          onOpenIconModal={(shelf) => setIconModal({ isOpen: true, shelf: shelf })}
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

      {/* Shelf Icon Picker Modal */}
      <ShelfIconModal
        shelf={iconModal.shelf}
        isOpen={iconModal.isOpen}
        onClose={() => setIconModal({ isOpen: false, shelf: null })}
        onSave={handleSaveShelfIcon}
      />

      {/* Virtual Tag Manager Modal */}
      <TagManagerModal
        isOpen={tagModal.isOpen}
        onClose={() => setTagModal({ isOpen: false, book: null })}
        book={tagModal.book}
        tags={tags}
        onTagsUpdated={() => loadTags(activeLibraryId)}
        onBookTagsUpdated={handleBookTagsUpdated}
      />

      {/* Library Settings Modal */}
      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        showFileExtension={showFileExtension}
        onToggleFileExtension={handleToggleFileExtension}
        onLibraryChanged={(newActiveId) => {
          loadLibraries();
          if (newActiveId && newActiveId !== activeLibraryId) {
            selectLibrary(newActiveId);
          } else if (activeLibraryId) {
            loadShelves(activeLibraryId);
            loadBooks(activeLibraryId);
            loadContinueReading(activeLibraryId);
            loadFavorites(activeLibraryId);
            loadTags(activeLibraryId);
          }
        }}
      />
    </div>
  );
}
