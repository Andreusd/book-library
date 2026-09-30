import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Search, X, BookOpen, 
  FolderOpen, PanelLeftClose, PanelLeftOpen,
  Settings, Heart, Bookmark, Maximize2, Minimize2, Library, Folder, Tag, Plus, Palette
} from 'lucide-react';

import Sidebar from './components/Sidebar';
import BookCard from './components/BookCard';
import ContinueReading from './components/ContinueReading';
import FavoriteBooks from './components/FavoriteBooks';
import LibraryFolders from './components/LibraryFolders';
import FolderCard from './components/FolderCard';
import TagCard from './components/TagCard';
import LibraryTags from './components/LibraryTags';
import AllBooks from './components/AllBooks';
import LibrarySelector from './components/LibrarySelector';
import Reader from './components/Reader';
import ShelfIcon from './components/ShelfIcon';
import ThemeMenu from './components/ThemeMenu';
import AppModals from './components/AppModals';
import { getTagColorConfig } from './utils/tagColors';
import { useI18n } from './i18n';
import { useFullscreen } from './hooks/useFullscreen';
import { useSettings } from './hooks/useSettings';
import { useBookModals } from './hooks/useBookModals';
import { useLibraryRouter } from './hooks/useLibraryRouter';
import { booksApi, foldersApi, librariesApi, tagsApi } from './api';

export default function App() {
  const { t } = useI18n();
  const { isFullscreen, toggleFullscreen } = useFullscreen();
  const {
    theme,
    setTheme,
    mode,
    setMode,
    showFileExtension,
    setShowFileExtension,
    sidebarOpen,
    toggleSidebar,
    setSidebarOpen,
    currentUser,
    setCurrentUser,
  } = useSettings();

  const modals = useBookModals();
  const { route, navigateToShelf: routerNavigateToShelf, navigateToBook, navigateToLibraries } = useLibraryRouter();

  const [shelves, setShelves] = useState([]);
  const [totalBooks, setTotalBooks] = useState(0);
  const [libraries, setLibraries] = useState([]);
  const [activeLibraryId, setActiveLibraryId] = useState(() => route.libraryId || '');
  const [selectedShelf, setSelectedShelf] = useState(() => route.shelfId);
  const [books, setBooks] = useState([]);
  const [continueReading, setContinueReading] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [favoriteIds, setFavoriteIds] = useState(new Set());
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [sortBy, setSortBy] = useState('title_asc');
  const [activeBook, setActiveBook] = useState(null);
  const [routeLoading, setRouteLoading] = useState(() => Boolean(route.bookId));

  const [prevRouteKey, setPrevRouteKey] = useState(() => `${route.libraryId || ''}_${route.shelfId || ''}_${route.bookId || ''}`);
  const currentRouteKey = `${route.libraryId || ''}_${route.shelfId || ''}_${route.bookId || ''}`;

  if (currentRouteKey !== prevRouteKey) {
    setPrevRouteKey(currentRouteKey);
    if (!route.libraryId && !route.bookId) {
      setActiveLibraryId('');
      setSelectedShelf(null);
      setActiveBook(null);
      setShelves([]);
      setBooks([]);
      setContinueReading([]);
      setFavorites([]);
      setFavoriteIds(new Set());
      setTags([]);
    } else {
      if (route.libraryId && route.libraryId !== activeLibraryId) {
        setActiveLibraryId(route.libraryId);
      }
      if (route.bookId) {
        if (!activeBook || activeBook.id !== route.bookId) {
          setRouteLoading(true);
        }
      } else {
        if (activeBook) {
          setActiveBook(null);
        }
        setSelectedShelf(route.shelfId);
        setSearchQuery('');
      }
    }
  }

  const bookParamsKey = `${activeLibraryId}_${selectedShelf}_${debouncedQuery}_${sortBy}`;
  const [prevBookParamsKey, setPrevBookParamsKey] = useState(bookParamsKey);
  if (bookParamsKey !== prevBookParamsKey) {
    setPrevBookParamsKey(bookParamsKey);
    if (activeLibraryId) {
      setLoading(true);
    }
  }

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
    librariesApi.getLibraries()
      .then(data => {
        setLibraries(data.libraries || []);
      })
      .catch(err => console.error('Failed to load libraries:', err));
  }, []);

  // Load Shelves & Totals
  const loadShelves = useCallback((libId) => {
    const targetLib = libId !== undefined ? libId : activeLibraryId;
    if (!targetLib) return;
    foldersApi.getFolders(targetLib)
      .then(data => {
        setShelves(data.shelves || data.folders || []);
        setTotalBooks(data.total_books || 0);
      })
      .catch(err => console.error('Failed to load shelves:', err));
  }, [activeLibraryId]);

  // Load Continue Reading
  const loadContinueReading = useCallback((libId) => {
    const targetLib = libId !== undefined ? libId : activeLibraryId;
    if (!targetLib) return;
    booksApi.getContinueReading(targetLib)
      .then(data => {
        setContinueReading(data.books || []);
      })
      .catch(err => console.error('Failed to load continue reading:', err));
  }, [activeLibraryId]);

  // Load Favorites
  const loadFavorites = useCallback((libId) => {
    const targetLib = libId !== undefined ? libId : activeLibraryId;
    if (!targetLib) return;
    booksApi.getFavorites(targetLib)
      .then(data => {
        setFavorites(data.books || []);
        setFavoriteIds(new Set(data.favorite_ids || []));
      })
      .catch(err => console.error('Failed to load favorites:', err));
  }, [activeLibraryId]);

  // Load Virtual Tags
  const loadTags = useCallback((libId) => {
    const targetLib = libId !== undefined ? libId : activeLibraryId;
    if (!targetLib) return;
    tagsApi.getTags(targetLib)
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
    if (!targetLib) return;
    const shelfToUse = targetShelf !== undefined ? targetShelf : selectedShelf;
    const params = {
      library_id: targetLib,
      sort: sortBy,
    };
    if (shelfToUse && shelfToUse.startsWith('tag:')) {
      params.tag = shelfToUse.slice(4);
    } else if (shelfToUse && shelfToUse !== 'folders' && shelfToUse !== 'tags' && shelfToUse !== 'all-books') {
      params.shelf = shelfToUse;
    }
    if (debouncedQuery && shelfToUse !== 'folders' && shelfToUse !== 'tags') {
      params.query = debouncedQuery;
    }

    booksApi.getBooks(params)
      .then(data => {
        setBooks(data.books || []);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load books:', err);
        setLoading(false);
      });
  }, [activeLibraryId, selectedShelf, debouncedQuery, sortBy]);

  // Handle User Change (persists to storage and reloads user-specific data)
  const handleUserChange = useCallback((newUsername) => {
    setCurrentUser(newUsername);
    if (activeLibraryId) {
      loadContinueReading(activeLibraryId);
      loadFavorites(activeLibraryId);
      loadTags(activeLibraryId);
      loadBooks(activeLibraryId);
    }
  }, [activeLibraryId, setCurrentUser, loadContinueReading, loadFavorites, loadTags, loadBooks]);

  // Select Library from selector screen
  const selectLibrary = useCallback((libraryId) => {
    setActiveLibraryId(libraryId);
    setSelectedShelf(null);
    setSearchQuery('');
    routerNavigateToShelf(null, libraryId);
    loadShelves(libraryId);
    loadBooks(libraryId, null);
    loadContinueReading(libraryId);
    loadFavorites(libraryId);
    loadTags(libraryId);
  }, [routerNavigateToShelf, loadShelves, loadBooks, loadContinueReading, loadFavorites, loadTags]);

  // Return to All Libraries selection screen
  const selectAllLibraries = useCallback(() => {
    setActiveLibraryId('');
    setSelectedShelf(null);
    setActiveBook(null);
    setSearchQuery('');
    navigateToLibraries();
    loadLibraries();
    loadTags('');
  }, [navigateToLibraries, loadLibraries, loadTags]);

  // Switch Active Library
  const switchLibrary = useCallback((libraryId) => {
    selectLibrary(libraryId);
  }, [selectLibrary]);

  // Toggle Favorite
  const handleToggleFavorite = useCallback((book) => {
    if (!book) return;
    booksApi.toggleFavorite(book.id)
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
  const navigateToShelf = useCallback((shelfId) => {
    setSelectedShelf(shelfId);
    setSearchQuery('');
    routerNavigateToShelf(shelfId, activeLibraryId);
  }, [activeLibraryId, routerNavigateToShelf]);

  // Open reader and update browser route
  const openReader = useCallback((book) => {
    if (!book) return;
    setActiveBook(book);
    const targetLib = activeLibraryId || book.library_id || 'default';
    if (!activeLibraryId && book.library_id) {
      setActiveLibraryId(book.library_id);
    }
    navigateToBook(book.id, targetLib);
  }, [activeLibraryId, navigateToBook]);

  // Close reader and return to current shelf route
  const closeReader = useCallback(() => {
    setActiveBook(null);
    routerNavigateToShelf(selectedShelf, activeLibraryId);
    loadContinueReading(activeLibraryId);
    loadFavorites(activeLibraryId);
  }, [selectedShelf, activeLibraryId, routerNavigateToShelf, loadContinueReading, loadFavorites]);

  // Synchronize route state with URL router
  useEffect(() => {
    if (!route.libraryId && !route.bookId) {
      loadLibraries();
      return;
    }

    if (route.bookId) {
      if (!activeBook || activeBook.id !== route.bookId) {
        booksApi.getBook(route.bookId)
          .then(book => {
            if (book && book.id) {
              setActiveBook(book);
              const targetLib = route.libraryId || book.library_id || 'default';
              if (!activeLibraryId) {
                setActiveLibraryId(targetLib);
              }
              setSelectedShelf(prev => prev || book.shelf || null);
            }
          })
          .catch(err => {
            console.error('Failed to load book from route:', err);
            setActiveBook(null);
            routerNavigateToShelf(selectedShelf, route.libraryId || activeLibraryId);
          })
          .finally(() => {
            setRouteLoading(false);
          });
      }
    } else {
      if (activeBook) {
        loadContinueReading(route.libraryId || activeLibraryId);
        loadFavorites(route.libraryId || activeLibraryId);
        loadTags(route.libraryId || activeLibraryId);
      }
    }
  }, [
    route.bookId,
    route.libraryId,
    activeBook,
    activeLibraryId,
    loadLibraries,
    routerNavigateToShelf,
    selectedShelf,
    loadContinueReading,
    loadFavorites,
    loadTags
  ]);

  useEffect(() => {
    loadLibraries();
  }, [loadLibraries]);

  useEffect(() => {
    if (activeLibraryId) {
      loadShelves(activeLibraryId);
      loadContinueReading(activeLibraryId);
      loadFavorites(activeLibraryId);
      loadTags(activeLibraryId);
    }
  }, [activeLibraryId, loadShelves, loadContinueReading, loadFavorites, loadTags]);

  useEffect(() => {
    if (activeLibraryId) {
      loadBooks(activeLibraryId, selectedShelf);
    }
  }, [activeLibraryId, selectedShelf, debouncedQuery, sortBy, loadBooks]);

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

  const handleOpenDetails = useCallback((book) => {
    modals.openDetailsModal(book);
  }, [modals]);

  // Mark status handler (not_started / completed)
  const handleMarkStatus = useCallback((book, status) => {
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

    booksApi.updateStatus(book.id, status)
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
  }, [handleProgressUpdate, loadContinueReading, loadBooks]);

  // Save renamed shelf
  const handleSaveShelfName = useCallback((shelfId, customName) => {
    foldersApi.renameFolder({ shelf_id: shelfId, custom_name: customName, library_id: activeLibraryId })
      .then(data => {
        if (data.status === 'ok') {
          setShelves(data.shelves || data.folders || []);
          modals.closeRenameModal();
          loadBooks();
        }
      })
      .catch(err => console.error('Failed to rename shelf:', err));
  }, [activeLibraryId, modals, loadBooks]);

  // Reset shelf name to original
  const handleResetShelfName = useCallback((shelf) => {
    handleSaveShelfName(shelf.id, '');
  }, [handleSaveShelfName]);

  // Save shelf icon
  const handleSaveShelfIcon = useCallback((shelfId, iconName) => {
    foldersApi.setFolderIcon({ shelf_id: shelfId, icon: iconName, library_id: activeLibraryId })
      .then(data => {
        if (data.status === 'ok') {
          setShelves(data.shelves || data.folders || []);
          modals.closeIconModal();
        }
      })
      .catch(err => console.error('Failed to save shelf icon:', err));
  }, [activeLibraryId, modals]);

  const handleLibraryChanged = useCallback((newActiveId) => {
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
  }, [activeLibraryId, loadLibraries, selectLibrary, loadShelves, loadBooks, loadContinueReading, loadFavorites, loadTags]);

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
    } else if (selectedShelf === 'tags') {
      document.title = `${t('tags')} - ${activeLibraryObj?.name || t('appTitle')}`;
    } else if (selectedShelf === 'all-books') {
      document.title = `${t('allBooksLibrary')} - ${activeLibraryObj?.name || t('appTitle')}`;
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

  // When no active library is selected or no user is set, display Library Selection screen
  if (!activeLibraryId || !currentUser) {
    return (
      <>
        <LibrarySelector
          libraries={libraries}
          onSelectLibrary={selectLibrary}
          onOpenSettings={() => modals.setSettingsOpen(true)}
          onAddNewLibrary={() => modals.setSettingsOpen(true)}
          currentUser={currentUser}
          onUserChange={handleUserChange}
        />

        <AppModals
          modals={modals}
          activeLibraryId={activeLibraryId}
          favoriteIds={favoriteIds}
          tags={tags}
          showFileExtension={showFileExtension}
          onToggleFileExtension={setShowFileExtension}
          onOpenReader={openReader}
          onToggleFavorite={handleToggleFavorite}
          onMarkStatus={handleMarkStatus}
          onSaveShelfName={handleSaveShelfName}
          onResetShelfName={handleResetShelfName}
          onSaveShelfIcon={handleSaveShelfIcon}
          onBookTagsUpdated={handleBookTagsUpdated}
          onTagsUpdated={() => loadTags(activeLibraryId)}
          onLibraryChanged={handleLibraryChanged}
          onNavigateToShelf={navigateToShelf}
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
        onShelfContextMenu={modals.openShelfContextMenu}
        isOpen={!activeBook && sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        libraries={libraries}
        activeLibraryId={activeLibraryId}
        onSwitchLibrary={switchLibrary}
        onSelectAllLibraries={selectAllLibraries}
        onOpenSettings={() => modals.setSettingsOpen(true)}
        tags={tags}
        onOpenTagManager={() => modals.openTagModal(null)}
        currentUser={currentUser}
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
                      ) : selectedShelf === 'all-books' ? (
                        <>
                          <BookOpen className="w-4 h-4 text-sky-400 shrink-0" />
                          <span>{t('allBooksLibrary')}</span>
                        </>
                      ) : selectedShelf === 'tags' ? (
                        <>
                          <Tag className="w-4 h-4 text-indigo-400 shrink-0" />
                          <span>{t('tags')}</span>
                        </>
                      ) : isTagFilter ? (
                        <>
                          <button
                            type="button"
                            onClick={() => navigateToShelf('tags')}
                            className="hover:text-indigo-400 transition-colors flex items-center gap-1 text-neutral-400 cursor-pointer"
                          >
                            <Tag className="w-3.5 h-3.5" />
                            <span>{t('tags')}</span>
                          </button>
                          <span className="text-neutral-600">/</span>
                          {currentTagObj ? (
                            <span className={`w-2.5 h-2.5 rounded-full ${getTagColorConfig(currentTagObj.color).dot} shrink-0`} />
                          ) : null}
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

            {/* Themes Menu */}
            <div className="relative">
              <button
                type="button"
                onClick={() => modals.setThemeMenuOpen(prev => !prev)}
                className={`p-1.5 rounded-lg border transition shadow-sm cursor-pointer ${
                  modals.themeMenuOpen 
                    ? 'bg-amber-500/15 border-amber-500/30 text-amber-400' 
                    : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-amber-400 hover:border-amber-500/30'
                }`}
                title={t('themes')}
                aria-label={t('themes')}
              >
                <Palette className="w-4 h-4" />
              </button>

              {modals.themeMenuOpen && (
                <ThemeMenu
                  currentTheme={theme}
                  currentMode={mode}
                  onSelectTheme={setTheme}
                  onSelectMode={setMode}
                  onClose={() => modals.setThemeMenuOpen(false)}
                />
              )}
            </div>

            {/* Settings Button */}
            <button
              onClick={() => modals.setSettingsOpen(true)}
              className="p-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-amber-400 hover:border-amber-500/30 transition shadow-sm cursor-pointer"
              title={t('settings')}
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Books Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto relative z-0">
          {/* Continue Reading Shelf */}
          {!selectedShelf && !debouncedQuery && continueReading.length > 0 && (
            <ContinueReading 
              books={continueReading} 
              onSelectBook={(book) => openReader(book)} 
              onOpenDetails={handleOpenDetails}
              onContextMenu={modals.openBookContextMenu}
              onViewAll={() => navigateToShelf('continue-reading')}
              onSelectTag={(tg) => navigateToShelf(`tag:${tg.id}`)}
              showFileExtension={showFileExtension}
            />
          )}

          {/* Favorite Books Shelf */}
          {!selectedShelf && !debouncedQuery && favorites.length > 0 && (
            <FavoriteBooks
              books={favorites}
              onSelectBook={(book) => openReader(book)}
              onOpenDetails={handleOpenDetails}
              onContextMenu={modals.openBookContextMenu}
              onToggleFavorite={handleToggleFavorite}
              onViewAll={() => navigateToShelf('favorites')}
              onSelectTag={(tg) => navigateToShelf(`tag:${tg.id}`)}
              showFileExtension={showFileExtension}
            />
          )}

          {/* Folders Carousel */}
          {!selectedShelf && !debouncedQuery && shelves.length > 0 && (
            <LibraryFolders
              folders={shelves}
              books={books}
              onSelectFolder={(folderId) => navigateToShelf(folderId)}
              onContextMenu={modals.openShelfContextMenu}
              onViewAll={() => navigateToShelf('folders')}
            />
          )}

          {/* Tags Carousel */}
          {!selectedShelf && !debouncedQuery && tags.length > 0 && (
            <LibraryTags
              tags={tags}
              books={books}
              onSelectTag={(tg) => navigateToShelf(`tag:${tg.id}`)}
              onViewAll={() => navigateToShelf('tags')}
              onOpenTagManager={() => modals.openTagModal(null)}
            />
          )}

          {/* Shelf Section Title & Count */}
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
                        : selectedShelf === 'all-books'
                          ? t('allBooksLibrary')
                          : selectedShelf === 'tags'
                            ? t('tags')
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
                          : selectedShelf === 'tags'
                            ? tags.filter(tg => tg.name.toLowerCase().includes(debouncedQuery.toLowerCase())).length
                            : books.length 
                      })
                    : selectedShelf === 'folders'
                      ? t('foldersCount', { count: shelves.length })
                      : selectedShelf === 'all-books'
                        ? t('allBooksCount', { count: totalBooks || books.length })
                        : selectedShelf === 'tags'
                          ? (tags.length === 1 ? (t('tagsCount_one') || '(1 tag)') : (t('tagsCount', { count: tags.length }) || `(${tags.length} tags)`))
                        : isTagFilter
                          ? t('booksTaggedCount', { count: books.length })
                          : t('booksInShelf', { count: books.length })}
                </p>
              </div>

              {selectedShelf === 'tags' && (
                <button
                  type="button"
                  onClick={() => modals.openTagModal(null)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 text-indigo-300 text-xs font-medium transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{t('manageTags')}</span>
                </button>
              )}
            </div>
          )}

          {/* Content: Folders Grid, Tags Grid, Loading Skeletons, AllBooks Carousel, or Books Grid */}
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
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5 sm:gap-6">
                  {displayFolders.map((folder) => (
                    <FolderCard
                      key={folder.id}
                      folder={folder}
                      books={books}
                      onSelectFolder={(folderId) => navigateToShelf(folderId)}
                      onContextMenu={modals.openShelfContextMenu}
                      className="w-full"
                    />
                  ))}
                </div>
              );
            })()
          ) : selectedShelf === 'tags' ? (
            (() => {
              const displayTags = debouncedQuery
                ? tags.filter(tg => tg.name.toLowerCase().includes(debouncedQuery.toLowerCase()))
                : tags;

              if (displayTags.length === 0) {
                return (
                  <div className="text-center py-20 flex flex-col items-center justify-center">
                    <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-4">
                      <Tag className="w-8 h-8 text-indigo-400" />
                    </div>
                    <h3 className="text-base font-semibold text-neutral-300">
                      {debouncedQuery ? t('noBooksFound') : (t('noTagsFound') || 'No tags found')}
                    </h3>
                    <p className="text-xs text-neutral-500 mt-1 max-w-sm">
                      {debouncedQuery ? t('noBooksDesc') : (t('noTagsDesc') || 'Create tags to organize and categorize your books across folders.')}
                    </p>
                    <button
                      type="button"
                      onClick={() => modals.openTagModal(null)}
                      className="mt-4 flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-500 text-white font-medium text-xs hover:bg-indigo-600 transition shadow-lg shadow-indigo-500/20 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>{t('createNewTag')}</span>
                    </button>
                  </div>
                );
              }

              return (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5 sm:gap-6">
                  {displayTags.map((tag) => (
                    <TagCard
                      key={tag.id}
                      tag={tag}
                      books={books}
                      onSelectTag={(tg) => navigateToShelf(`tag:${tg.id}`)}
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
                onOpenDetails={handleOpenDetails}
                onContextMenu={modals.openBookContextMenu}
                onToggleFavorite={handleToggleFavorite}
                onViewAll={() => navigateToShelf('all-books')}
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
                    onOpenDetails={handleOpenDetails}
                    onContextMenu={modals.openBookContextMenu}
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
                onClick={() => modals.setSettingsOpen(true)}
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

      {/* Embedded Fullscreen Reader */}
      {activeBook && (
        <Reader
          book={activeBook}
          isFavorite={favoriteIds.has(activeBook.id)}
          onClose={closeReader}
          onProgressUpdate={handleProgressUpdate}
          onToggleFavorite={handleToggleFavorite}
          showFileExtension={showFileExtension}
          theme={theme}
          onThemeChange={setTheme}
          mode={mode}
          onModeChange={setMode}
        />
      )}

      {/* Encapsulated Modals and Context Menus */}
      <AppModals
        modals={modals}
        activeLibraryId={activeLibraryId}
        favoriteIds={favoriteIds}
        tags={tags}
        showFileExtension={showFileExtension}
        onToggleFileExtension={setShowFileExtension}
        onOpenReader={openReader}
        onToggleFavorite={handleToggleFavorite}
        onMarkStatus={handleMarkStatus}
        onSaveShelfName={handleSaveShelfName}
        onResetShelfName={handleResetShelfName}
        onSaveShelfIcon={handleSaveShelfIcon}
        onBookTagsUpdated={handleBookTagsUpdated}
        onTagsUpdated={() => loadTags(activeLibraryId)}
        onLibraryChanged={handleLibraryChanged}
        onNavigateToShelf={navigateToShelf}
      />
    </div>
  );
}
