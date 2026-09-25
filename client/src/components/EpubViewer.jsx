import React, { useState, useEffect, useRef, useCallback } from 'react';
import ePub from 'epubjs';
import { 
  ArrowLeft, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, 
  Maximize2, Minimize2, Moon, Sun, ListTree,
  Heart, X, BookOpen,
  PanelTopClose, PanelTopOpen, Palette
} from 'lucide-react';
import { useI18n } from '../i18n';

export default function EpubViewer({
  book,
  onClose,
  onProgressUpdate,
  onToggleFavorite,
  isFavorite
}) {
  const { t } = useI18n();
  const viewerRef = useRef(null);
  const bookRef = useRef(null);
  const renditionRef = useRef(null);
  const tocRef = useRef([]);
  const saveTimeoutRef = useRef(null);

  const [favState, setFavState] = useState(isFavorite !== undefined ? isFavorite : Boolean(book.is_favorite));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toc, setToc] = useState([]);
  const [tocOpen, setTocOpen] = useState(false);
  const [tocSearch, setTocSearch] = useState('');
  
  // Helpers to get initial CFI and percent from props or localStorage
  const getInitialCfi = () => {
    if (book.progress?.cfi && typeof book.progress.cfi === 'string' && book.progress.cfi.trim() !== '') {
      return book.progress.cfi.trim();
    }
    try {
      const local = localStorage.getItem(`book_cfi_${book.id}`);
      if (local && typeof local === 'string' && local.trim() !== '') {
        return local.trim();
      }
    } catch (e) {}
    return null;
  };

  const getInitialPercent = () => {
    if (book.progress?.percent !== undefined && book.progress.percent !== null) {
      const p = parseFloat(book.progress.percent);
      if (!isNaN(p) && p >= 0 && p <= 100) return p;
    }
    try {
      const local = localStorage.getItem(`book_percent_${book.id}`);
      if (local !== null) {
        const p = parseFloat(local);
        if (!isNaN(p) && p >= 0 && p <= 100) return p;
      }
    } catch (e) {}
    return 0;
  };

  const initialCfiRef = useRef(getInitialCfi());
  const initialPercentRef = useRef(getInitialPercent());
  const isInitialRelocationRef = useRef(true);

  // Reading location & chapter
  const [locationInfo, setLocationInfo] = useState({
    cfi: initialCfiRef.current,
    percentage: Math.round(initialPercentRef.current),
    chapter: ''
  });

  // Trackpad & Touch gesture refs
  const lastSwipeTimeRef = useRef(0);
  const accumulatedDeltaXRef = useRef(0);
  const clearSwipeTimerRef = useRef(null);
  const lastWheelTimeRef = useRef(0);
  const touchStartXRef = useRef(0);
  const touchStartYRef = useRef(0);
  const touchStartTimeRef = useRef(0);

  // Preferences: Font Size
  const [fontSize, setFontSize] = useState(() => {
    try {
      const saved = localStorage.getItem(`book_font_size_${book.id}`);
      if (saved) {
        const val = parseInt(saved, 10);
        if (!isNaN(val) && val >= 70 && val <= 250) return val;
      }
    } catch (e) {}
    return 100;
  });

  // Preferences: Theme ('dark' | 'light' | 'sepia')
  const [theme, setTheme] = useState(() => {
    try {
      const saved = localStorage.getItem(`book_theme_${book.id}`);
      if (saved && ['dark', 'light', 'sepia'].includes(saved)) return saved;
      const savedInvert = localStorage.getItem(`book_invert_${book.id}`);
      if (savedInvert === 'true') return 'dark';
    } catch (e) {}
    if (book.progress?.invert_colors) return 'dark';
    return 'dark'; // default dark mode matching Digital Library aesthetics
  });

  // Header Auto-hide & Fullscreen
  const [headerVisible, setHeaderVisible] = useState(true);
  const [headerPinned, setHeaderPinned] = useState(() => {
    try {
      const saved = localStorage.getItem('reader_header_pinned');
      return saved !== null ? saved === 'true' : true;
    } catch (e) {
      return true;
    }
  });
  const hideTimerRef = useRef(null);

  const [isFullscreen, setIsFullscreen] = useState(() => {
    return typeof document !== 'undefined' ? Boolean(document.fullscreenElement) : false;
  });

  // Keep favorite state synchronized with prop
  useEffect(() => {
    if (isFavorite !== undefined) {
      setFavState(isFavorite);
    }
  }, [isFavorite]);

  // Fullscreen change handler
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  // Header auto-hide logic
  const resetHideTimer = useCallback(() => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    setHeaderVisible(true);
    if (!headerPinned && !tocOpen) {
      hideTimerRef.current = setTimeout(() => {
        setHeaderVisible(false);
      }, 4000);
    }
  }, [headerPinned, tocOpen]);

  const handleMouseMove = useCallback((e) => {
    if (e.clientY < 80) {
      setHeaderVisible(true);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    } else if (!headerPinned && !tocOpen) {
      resetHideTimer();
    }
  }, [headerPinned, tocOpen, resetHideTimer]);

  useEffect(() => {
    if (!headerPinned && !tocOpen) {
      resetHideTimer();
    } else {
      setHeaderVisible(true);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    }
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [headerPinned, tocOpen, resetHideTimer]);

  // Debounced API progress saving
  const saveProgressDebounced = useCallback((cfi, percent) => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

    saveTimeoutRef.current = setTimeout(() => {
      const payload = {
        book_id: book.id,
        page: Math.max(1, Math.round((percent / 100) * 100)),
        total_pages: 100,
        percent: percent,
        cfi: cfi,
        invert_colors: theme === 'dark'
      };

      fetch('/api/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      .then(res => res.json())
      .then(data => {
        if (data.status === 'ok' && onProgressUpdate) {
          onProgressUpdate(book.id, data.progress);
        }
      })
      .catch(err => console.error('Failed to save EPUB progress:', err));
    }, 1000);
  }, [book.id, theme, onProgressUpdate]);

  // Gesture handling: Two-finger trackpad swipe & Wheel flip
  const handleNativeWheel = useCallback((e) => {
    const absX = Math.abs(e.deltaX);
    const absY = Math.abs(e.deltaY);

    // 1. Two-finger horizontal trackpad swipe to flip pages
    if (absX > absY && absX > 2) {
      if (e.cancelable) e.preventDefault();

      const now = Date.now();
      if (now - lastSwipeTimeRef.current > 350) {
        accumulatedDeltaXRef.current += e.deltaX;

        if (clearSwipeTimerRef.current) clearTimeout(clearSwipeTimerRef.current);
        clearSwipeTimerRef.current = setTimeout(() => {
          accumulatedDeltaXRef.current = 0;
        }, 150);

        if (Math.abs(accumulatedDeltaXRef.current) > 28) {
          lastSwipeTimeRef.current = now;
          const dir = accumulatedDeltaXRef.current;
          accumulatedDeltaXRef.current = 0;
          if (dir > 0) {
            renditionRef.current?.next();
          } else {
            renditionRef.current?.prev();
          }
        }
      }
      return;
    }

    // 2. Vertical wheel flip
    if (absY > 35) {
      const now = Date.now();
      if (now - lastWheelTimeRef.current > 450) {
        lastWheelTimeRef.current = now;
        if (e.deltaY > 0) {
          renditionRef.current?.next();
        } else {
          renditionRef.current?.prev();
        }
      }
    }
  }, []);

  // Gesture handling: Touch swipe
  const handleTouchStart = useCallback((e) => {
    if (e.touches && e.touches.length === 1) {
      touchStartXRef.current = e.touches[0].clientX;
      touchStartYRef.current = e.touches[0].clientY;
      touchStartTimeRef.current = Date.now();
    }
  }, []);

  const handleTouchEnd = useCallback((e) => {
    if (!touchStartXRef.current || !e.changedTouches || e.changedTouches.length === 0) return;
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const diffX = touchEndX - touchStartXRef.current;
    const diffY = touchEndY - touchStartYRef.current;
    const duration = Date.now() - touchStartTimeRef.current;

    // Horizontal swipe: diffX > 40px, mostly horizontal, under 600ms
    if (Math.abs(diffX) > 40 && Math.abs(diffX) > Math.abs(diffY) * 1.3 && duration < 600) {
      if (diffX < 0) {
        renditionRef.current?.next();
      } else {
        renditionRef.current?.prev();
      }
    }
    touchStartXRef.current = 0;
    touchStartYRef.current = 0;
  }, []);

  // Window gesture listeners
  useEffect(() => {
    const onWheel = (e) => handleNativeWheel(e);
    const onTouchStart = (e) => handleTouchStart(e);
    const onTouchEnd = (e) => handleTouchEnd(e);

    window.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchend', onTouchEnd, { passive: true });

    return () => {
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [handleNativeWheel, handleTouchStart, handleTouchEnd]);

  // Safe close with progress flush
  const handleClose = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    const cfi = locationInfo.cfi;
    const percent = locationInfo.percentage;
    if (cfi) {
      try {
        fetch('/api/progress', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            book_id: book.id,
            page: Math.max(1, Math.round((percent / 100) * 100)),
            total_pages: 100,
            percent: percent,
            cfi: cfi,
            invert_colors: theme === 'dark'
          }),
          keepalive: true
        }).catch(() => {});
      } catch (e) {}
    }
    onClose();
  }, [book.id, locationInfo.cfi, locationInfo.percentage, theme, onClose]);

  // Helper to find chapter label in nested TOC
  const findChapterLabel = useCallback((items, href) => {
    if (!items || !href) return '';
    const cleanHref = href.split('#')[0];
    for (const item of items) {
      const itemClean = (item.href || '').split('#')[0];
      if (itemClean === cleanHref || item.href === href) {
        return item.label ? item.label.trim() : '';
      }
      if (item.subitems && item.subitems.length) {
        const sub = findChapterLabel(item.subitems, href);
        if (sub) return sub;
      }
    }
    return '';
  }, []);

  // Initialize EPUB.js Book and Rendition
  useEffect(() => {
    let isCancelled = false;
    setLoading(true);
    setError(null);

    async function initEpub() {
      try {
        const bookUrl = `/api/epub/${encodeURIComponent(book.id)}.epub`;
        const res = await fetch(bookUrl);
        if (!res.ok) {
          throw new Error(`Failed to load book file (HTTP ${res.status})`);
        }
        const arrayBuffer = await res.arrayBuffer();
        if (isCancelled) return;

        const epubBook = ePub(arrayBuffer);
        bookRef.current = epubBook;

        if (!viewerRef.current || isCancelled) return;

        // Clear any previous rendered children
        viewerRef.current.innerHTML = '';

        // Create rendition
        const rendition = epubBook.renderTo(viewerRef.current, {
          width: '100%',
          height: '100%',
          flow: 'paginated',
          spread: 'auto'
        });
        renditionRef.current = rendition;

        // Define themes
        rendition.themes.register('dark', {
          body: {
            background: '#121212 !important',
            color: '#e2e8f0 !important',
            'font-family': 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important',
            'line-height': '1.8 !important',
            padding: '0 24px !important',
            'font-weight': '400 !important'
          },
          'p, div, span, li, blockquote': {
            color: '#e2e8f0 !important'
          },
          'h1, h2, h3, h4, h5, h6': {
            color: '#f8fafc !important',
            'font-weight': '600 !important'
          },
          a: {
            color: '#fbbf24 !important',
            'text-decoration': 'underline'
          },
          img: {
            'max-width': '100% !important',
            height: 'auto !important'
          }
        });

        rendition.themes.register('light', {
          body: {
            background: '#ffffff !important',
            color: '#1e293b !important',
            'font-family': 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important',
            'line-height': '1.8 !important',
            padding: '0 24px !important',
            'font-weight': '400 !important'
          },
          'p, div, span, li, blockquote': {
            color: '#1e293b !important'
          },
          'h1, h2, h3, h4, h5, h6': {
            color: '#0f172a !important',
            'font-weight': '600 !important'
          },
          a: {
            color: '#d97706 !important',
            'text-decoration': 'underline'
          },
          img: {
            'max-width': '100% !important',
            height: 'auto !important'
          }
        });

        rendition.themes.register('sepia', {
          body: {
            background: '#fbf0d9 !important',
            color: '#433422 !important',
            'font-family': 'Georgia, serif !important',
            'line-height': '1.8 !important',
            padding: '0 24px !important',
            'font-weight': '400 !important'
          },
          'p, div, span, li, blockquote': {
            color: '#433422 !important'
          },
          'h1, h2, h3, h4, h5, h6': {
            color: '#292014 !important',
            'font-weight': '600 !important'
          },
          a: {
            color: '#b45309 !important',
            'text-decoration': 'underline'
          },
          img: {
            'max-width': '100% !important',
            height: 'auto !important'
          }
        });

        // Apply active theme & font size
        rendition.themes.select(theme);
        rendition.themes.fontSize(`${fontSize}%`);

        // Initial display
        const startCfi = initialCfiRef.current;
        try {
          if (startCfi) {
            await rendition.display(startCfi);
          } else {
            await rendition.display();
          }
        } catch (displayErr) {
          console.warn('Initial CFI display failed, falling back to beginning:', displayErr);
          try {
            await rendition.display();
          } catch (e) {}
        }

        if (!isCancelled) {
          setLoading(false);
        }

        // Generate location numbers in background for accurate percent tracking
        epubBook.ready.then(() => {
          return epubBook.locations.generate(1000);
        }).then(() => {
          if (isCancelled) return;
          // If no initial CFI but saved percentage > 0, jump to that percentage
          if (!startCfi && initialPercentRef.current > 0 && isInitialRelocationRef.current) {
            try {
              const targetCfi = epubBook.locations.cfiFromPercentage(initialPercentRef.current / 100);
              if (targetCfi) {
                rendition.display(targetCfi);
              }
            } catch (e) {
              console.warn('Locations percent jump notice:', e);
            }
          }

          if (rendition.currentLocation()?.start?.cfi) {
            const cfi = rendition.currentLocation().start.cfi;
            const pct = Math.round(epubBook.locations.percentageFromCfi(cfi) * 100);
            setLocationInfo(prev => ({ ...prev, percentage: pct }));
          }
        }).catch(e => {
          console.warn('Locations generation notice:', e);
        });

        // Load Table of Contents
        epubBook.loaded.navigation.then(nav => {
          if (!isCancelled) {
            const items = nav.toc || [];
            setToc(items);
            tocRef.current = items;
          }
        }).catch(e => {
          console.warn('Navigation TOC notice:', e);
        });

        // Register content hooks so swipe gestures and mouse movements inside the iframe work
        rendition.hooks.content.register((contents) => {
          const win = contents.window;
          const doc = contents.document;
          if (win) {
            win.addEventListener('wheel', handleNativeWheel, { passive: false });
            win.addEventListener('touchstart', handleTouchStart, { passive: true });
            win.addEventListener('touchend', handleTouchEnd, { passive: true });
          }
          if (doc) {
            doc.addEventListener('mousemove', (e) => {
              if (e.clientY < 80) {
                setHeaderVisible(true);
              }
            });
          }
        });

        // Handle Location changes
        rendition.on('relocated', (location) => {
          if (isCancelled || !location || !location.start) return;
          const cfi = location.start.cfi;
          let pct = 0;

          if (epubBook.locations && epubBook.locations.length()) {
            pct = Math.round(epubBook.locations.percentageFromCfi(cfi) * 100);
          } else if (location.start.percentage !== undefined) {
            pct = Math.round(location.start.percentage * 100);
          } else {
            pct = initialPercentRef.current || 0;
          }

          const chapterName = findChapterLabel(tocRef.current, location.start.href);

          setLocationInfo({
            cfi: cfi,
            percentage: Math.min(100, Math.max(0, pct)),
            chapter: chapterName
          });

          // Synchronously persist location so it is never lost on refresh / closing tab
          try {
            localStorage.setItem(`book_cfi_${book.id}`, cfi);
            localStorage.setItem(`book_percent_${book.id}`, String(pct));
          } catch (e) {}

          // Prevent initial relocation on mount from overwriting saved progress before locations are generated
          if (isInitialRelocationRef.current) {
            isInitialRelocationRef.current = false;
            return;
          }

          saveProgressDebounced(cfi, pct);
        });

        // Iframe key listeners for smooth reading controls
        rendition.on('keydown', (e) => {
          if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
            e.preventDefault();
            rendition.next();
          } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
            e.preventDefault();
            rendition.prev();
          } else if (e.key === 'Escape') {
            handleClose();
          }
        });

      } catch (err) {
        if (!isCancelled) {
          console.error('Failed to load EPUB:', err);
          setError(err.message || 'Failed to render EPUB file.');
          setLoading(false);
        }
      }
    }

    initEpub();

    return () => {
      isCancelled = true;
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      if (clearSwipeTimerRef.current) clearTimeout(clearSwipeTimerRef.current);
      try {
        if (renditionRef.current) renditionRef.current.destroy();
        if (bookRef.current) bookRef.current.destroy();
      } catch (e) {}
    };
  }, [book.id]);

  // Window-level keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;

      if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        e.preventDefault();
        renditionRef.current?.next();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        renditionRef.current?.prev();
      } else if (e.key === 'Escape') {
        handleClose();
      } else if (e.key === 'f' || e.key === 'F') {
        toggleFullscreen();
      } else if (e.key === 'm' || e.key === 'M') {
        cycleTheme();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Handle Theme Change
  const applyTheme = (newTheme) => {
    setTheme(newTheme);
    try {
      localStorage.setItem(`book_theme_${book.id}`, newTheme);
      localStorage.setItem(`book_invert_${book.id}`, String(newTheme === 'dark'));
    } catch (e) {}

    if (renditionRef.current) {
      renditionRef.current.themes.select(newTheme);
    }

    // Save night mode preference to server
    fetch('/api/book/night-mode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        book_id: book.id,
        invert_colors: newTheme === 'dark'
      })
    }).catch(e => console.error('Failed to save night mode:', e));
  };

  const cycleTheme = () => {
    const themes = ['dark', 'light', 'sepia'];
    const nextIdx = (themes.indexOf(theme) + 1) % themes.length;
    applyTheme(themes[nextIdx]);
  };

  // Handle Font Size Changes
  const changeFontSize = (delta) => {
    setFontSize(prev => {
      const next = Math.max(70, Math.min(220, prev + delta));
      try {
        localStorage.setItem(`book_font_size_${book.id}`, String(next));
      } catch (e) {}
      if (renditionRef.current) {
        renditionRef.current.themes.fontSize(`${next}%`);
      }
      return next;
    });
  };

  const resetFontSize = () => {
    setFontSize(100);
    try {
      localStorage.setItem(`book_font_size_${book.id}`, '100');
    } catch (e) {}
    if (renditionRef.current) {
      renditionRef.current.themes.fontSize('100%');
    }
  };

  // Navigate to chapter from TOC
  const handleSelectChapter = (href) => {
    if (renditionRef.current && href) {
      renditionRef.current.display(href);
      setTocOpen(false);
    }
  };

  // Toggle favorite
  const handleFavToggle = () => {
    const nextFav = !favState;
    setFavState(nextFav);
    if (onToggleFavorite) onToggleFavorite(book);
  };

  // Filter TOC items by search
  const filterTocItems = (items, query) => {
    if (!query) return items;
    const lower = query.toLowerCase();
    const result = [];
    for (const item of items) {
      const matchSelf = item.label && item.label.toLowerCase().includes(lower);
      const matchingSub = item.subitems ? filterTocItems(item.subitems, query) : [];
      if (matchSelf || matchingSub.length > 0) {
        result.push({
          ...item,
          subitems: matchingSub
        });
      }
    }
    return result;
  };

  const filteredToc = filterTocItems(toc, tocSearch);

  // Recursive TOC Tree Renderer
  const renderTocList = (items, depth = 0) => {
    if (!items || !items.length) return null;
    return (
      <ul className={`space-y-0.5 ${depth > 0 ? 'ml-3 border-l border-neutral-800/80 pl-2' : ''}`}>
        {items.map((item, idx) => (
          <li key={item.id || `${item.href}-${idx}`}>
            <button
              onClick={() => handleSelectChapter(item.href)}
              className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs hover:bg-neutral-800 text-neutral-300 hover:text-amber-400 transition-colors truncate block group cursor-pointer"
              title={item.label}
            >
              <span className="truncate">{item.label ? item.label.trim() : `Chapter ${idx + 1}`}</span>
            </button>
            {item.subitems && item.subitems.length > 0 && renderTocList(item.subitems, depth + 1)}
          </li>
        ))}
      </ul>
    );
  };

  // Background styling according to theme
  const viewerBgClass = theme === 'dark' 
    ? 'bg-[#121212]' 
    : theme === 'sepia' 
    ? 'bg-[#fbf0d9]' 
    : 'bg-[#ffffff]';

  return (
    <div 
      onMouseMove={handleMouseMove}
      className={`fixed inset-0 z-50 flex flex-col ${viewerBgClass} text-neutral-200 select-none overflow-hidden transition-colors duration-300`}
    >
      {/* Top Header Bar */}
      <header 
        className={`fixed top-0 inset-x-0 z-40 bg-neutral-950/95 backdrop-blur-md border-b border-neutral-800/80 px-4 py-2 flex items-center justify-between transition-all duration-300 ${
          headerVisible ? 'translate-y-0 opacity-100 shadow-xl' : '-translate-y-full opacity-0 pointer-events-none'
        }`}
      >
        {/* Left: Back & Book Title */}
        <div className="flex items-center gap-3 min-w-0 max-w-[35%]">
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg hover:bg-neutral-800 text-neutral-300 hover:text-white transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer"
            title={t('backToLibraryTitle')}
          >
            <ArrowLeft className="w-4 h-4 text-amber-500" />
            <span className="text-xs font-medium hidden sm:inline">{t('backToLibrary')}</span>
          </button>

          <div className="min-w-0">
            <h1 className="text-xs font-semibold text-neutral-100 truncate" title={book.title}>
              {book.title}
            </h1>
            <div className="flex items-center gap-1.5 text-[10px] text-neutral-400 truncate">
              {book.author && <span className="text-amber-400 font-medium truncate">{book.author}</span>}
              {book.author && <span>•</span>}
              <span className="truncate">{book.shelf_display || book.folder_display}</span>
              <span className="px-1 py-0.2 text-[8px] font-bold rounded bg-indigo-950 text-indigo-300 border border-indigo-500/40 uppercase">
                EPUB
              </span>
            </div>
          </div>
        </div>

        {/* Center: Chapter / Page Navigation Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => renditionRef.current?.prev()}
            className="p-1.5 rounded-lg bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 text-neutral-300 hover:text-white transition-colors cursor-pointer"
            title={t('prevPageTitle')}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-1.5 px-3 py-1 bg-neutral-900 border border-neutral-800 rounded-lg text-xs font-mono text-neutral-300 min-w-[130px] justify-center text-center">
            {locationInfo.chapter ? (
              <span className="truncate max-w-[140px] text-[11px]" title={locationInfo.chapter}>
                {locationInfo.chapter}
              </span>
            ) : (
              <span>Reading</span>
            )}
            <span className="text-neutral-500">•</span>
            <span className="font-semibold text-amber-400">{locationInfo.percentage}%</span>
          </div>

          <button
            onClick={() => renditionRef.current?.next()}
            className="p-1.5 rounded-lg bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 text-neutral-300 hover:text-white transition-colors cursor-pointer"
            title={t('nextPageTitle')}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Right: Actions (TOC, Font Scaling, Theme, Fullscreen) */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Table of Contents Button */}
          <button
            onClick={() => setTocOpen(!tocOpen)}
            className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
              tocOpen 
                ? 'bg-amber-500/20 border-amber-500/50 text-amber-400' 
                : 'bg-neutral-900 border-neutral-800 text-neutral-300 hover:bg-neutral-800 hover:text-white'
            }`}
            title={t('tableOfContents')}
          >
            <ListTree className="w-4 h-4" />
          </button>

          {/* Font Size Adjustments */}
          <div className="flex items-center bg-neutral-900 border border-neutral-800 rounded-lg p-0.5">
            <button
              onClick={() => changeFontSize(-10)}
              className="p-1 hover:bg-neutral-800 rounded text-neutral-400 hover:text-white transition cursor-pointer"
              title="Decrease Font Size (-)"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={resetFontSize}
              className="px-1.5 text-[11px] font-mono text-neutral-300 hover:text-amber-400 transition cursor-pointer"
              title="Reset Font Size"
            >
              {fontSize}%
            </button>
            <button
              onClick={() => changeFontSize(10)}
              className="p-1 hover:bg-neutral-800 rounded text-neutral-400 hover:text-white transition cursor-pointer"
              title="Increase Font Size (+)"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Reading Theme Picker (Dark, Light, Sepia) */}
          <div className="flex items-center bg-neutral-900 border border-neutral-800 rounded-lg p-0.5">
            <button
              onClick={() => applyTheme('dark')}
              className={`p-1 rounded transition cursor-pointer ${theme === 'dark' ? 'bg-neutral-800 text-amber-400' : 'text-neutral-400 hover:text-white'}`}
              title="Dark Mode"
            >
              <Moon className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => applyTheme('sepia')}
              className={`p-1 rounded transition cursor-pointer ${theme === 'sepia' ? 'bg-[#5f4b32] text-[#fbf0d9]' : 'text-neutral-400 hover:text-white'}`}
              title="Sepia Mode"
            >
              <Palette className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => applyTheme('light')}
              className={`p-1 rounded transition cursor-pointer ${theme === 'light' ? 'bg-neutral-200 text-neutral-900' : 'text-neutral-400 hover:text-white'}`}
              title="Light Mode"
            >
              <Sun className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Favorite Toggle */}
          <button
            onClick={handleFavToggle}
            className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
              favState 
                ? 'bg-rose-950/40 border-rose-500/50 text-rose-500' 
                : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-rose-400 hover:bg-neutral-800'
            }`}
            title={favState ? t('removeFromFavorites') : t('addToFavorites')}
          >
            <Heart className={`w-4 h-4 ${favState ? 'fill-rose-500 text-rose-500' : ''}`} />
          </button>

          {/* Header Pin Toggle */}
          <button
            onClick={() => {
              const nextPin = !headerPinned;
              setHeaderPinned(nextPin);
              try {
                localStorage.setItem('reader_header_pinned', String(nextPin));
              } catch (e) {}
            }}
            className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
              headerPinned 
                ? 'bg-neutral-800 border-neutral-700 text-neutral-200' 
                : 'bg-neutral-900 border-neutral-800 text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800'
            }`}
            title={headerPinned ? t('unpinHeaderTitle') : t('pinHeaderTitle')}
          >
            {headerPinned ? <PanelTopClose className="w-4 h-4" /> : <PanelTopOpen className="w-4 h-4" />}
          </button>

          {/* Fullscreen Button */}
          <button
            onClick={toggleFullscreen}
            className="p-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors hidden sm:block cursor-pointer"
            title={t('fullscreenTitle')}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Main EPUB Reader Area */}
      <main className="relative flex-1 w-full h-full flex items-center justify-center pt-12 pb-6 group/stage overscroll-none touch-pan-y">
        
        {/* Loading Spinner */}
        {loading && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-neutral-950/80 backdrop-blur-sm gap-3">
            <div className="w-10 h-10 border-3 border-amber-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs font-medium text-neutral-300">{t('loadingBook')}</p>
          </div>
        )}

        {/* Error Fallback */}
        {error && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-neutral-950 gap-4 p-6 text-center">
            <div className="p-3 rounded-full bg-rose-950/60 border border-rose-500/40 text-rose-400">
              <BookOpen className="w-8 h-8" />
            </div>
            <h3 className="text-base font-semibold text-neutral-100">Unable to Open EPUB</h3>
            <p className="text-xs text-neutral-400 max-w-md">{error}</p>
            <button
              onClick={handleClose}
              className="px-4 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium transition cursor-pointer"
            >
              {t('backToLibrary')}
            </button>
          </div>
        )}

        {/* Floating Left Navigation Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            renditionRef.current?.prev();
          }}
          className="absolute left-3 sm:left-5 top-1/2 -translate-y-1/2 z-20 w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-neutral-900/80 hover:bg-neutral-800 backdrop-blur-md border border-neutral-700 hover:border-amber-500/60 text-neutral-300 hover:text-white shadow-2xl flex items-center justify-center transition-all duration-200 opacity-60 hover:opacity-100 sm:opacity-0 sm:group-hover/stage:opacity-80 sm:hover:!opacity-100 hover:scale-110 active:scale-95 cursor-pointer select-none"
          title={t('prevPageTitle')}
          aria-label={t('prevPageTitle')}
        >
          <ChevronLeft className="w-6 h-6 sm:w-7 sm:h-7 text-neutral-300 hover:text-amber-400 transition-colors" />
        </button>

        {/* Floating Right Navigation Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            renditionRef.current?.next();
          }}
          className="absolute right-3 sm:right-5 top-1/2 -translate-y-1/2 z-20 w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-neutral-900/80 hover:bg-neutral-800 backdrop-blur-md border border-neutral-700 hover:border-amber-500/60 text-neutral-300 hover:text-white shadow-2xl flex items-center justify-center transition-all duration-200 opacity-60 hover:opacity-100 sm:opacity-0 sm:group-hover/stage:opacity-80 sm:hover:!opacity-100 hover:scale-110 active:scale-95 cursor-pointer select-none"
          title={t('nextPageTitle')}
          aria-label={t('nextPageTitle')}
        >
          <ChevronRight className="w-6 h-6 sm:w-7 sm:h-7 text-neutral-300 hover:text-amber-400 transition-colors" />
        </button>

        {/* Centered Document Viewport */}
        <div className="w-full h-full max-w-4xl mx-auto px-4 md:px-8 py-4 flex flex-col">
          <div 
            ref={viewerRef} 
            className="flex-1 w-full h-full overflow-hidden" 
          />
        </div>
      </main>

      {/* Floating Bottom Progress Indicator (Always subtle at bottom edge) */}
      <footer className="fixed bottom-0 inset-x-0 h-1.5 bg-neutral-900/60 z-30 pointer-events-none">
        <div 
          className="h-full bg-amber-500 transition-all duration-300"
          style={{ width: `${locationInfo.percentage}%` }}
        />
      </footer>

      {/* Table of Contents Drawer */}
      {tocOpen && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div 
            onClick={() => setTocOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity" 
          />

          {/* Drawer Panel */}
          <div className="relative z-10 w-full max-w-sm h-full bg-neutral-950 border-r border-neutral-800 p-4 flex flex-col shadow-2xl animate-in slide-in-from-left duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <div className="flex items-center gap-2">
                <ListTree className="w-4 h-4 text-amber-500" />
                <h2 className="text-sm font-semibold text-neutral-100">{t('tableOfContents')}</h2>
              </div>
              <button
                onClick={() => setTocOpen(false)}
                className="p-1 rounded-lg text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Filter Input */}
            <div className="my-3">
              <input
                type="text"
                value={tocSearch}
                onChange={(e) => setTocSearch(e.target.value)}
                placeholder={t('filterIndexPlaceholder')}
                className="w-full px-3 py-1.5 text-xs bg-neutral-900 border border-neutral-800 rounded-lg text-neutral-200 focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Chapters List */}
            <div className="flex-1 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
              {filteredToc.length > 0 ? (
                renderTocList(filteredToc)
              ) : (
                <div className="p-4 text-center text-xs text-neutral-500">
                  {tocSearch ? t('noIndexItemsFound') : t('noIndexAvailable')}
                </div>
              )}
            </div>

            {/* Footer Summary */}
            <div className="pt-3 border-t border-neutral-800/80 flex items-center justify-between text-[11px] text-neutral-400 font-mono">
              <span>{toc.length} chapters</span>
              <span className="text-amber-400">{locationInfo.percentage}% completed</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
