import React, { useState, useEffect, useRef, useCallback } from 'react';
import ePub, { EpubCFI } from 'epubjs';
import { 
  ArrowLeft, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, 
  Maximize2, Minimize2, Moon, Sun, ListTree,
  Heart, X, BookOpen,
  PanelTopClose, PanelTopOpen, Palette,
  MessageSquare
} from 'lucide-react';
import { useI18n } from '../i18n';
import CommentsDrawer from './CommentsDrawer';
import TextSelectionMenu from './TextSelectionMenu';

const COLOR_HEX_MAP = {
  yellow: '#facc15',
  green: '#34d399',
  blue: '#38bdf8',
  purple: '#c084fc',
  rose: '#fb7185',
};

const EPUB_THEMES = {
  dark: {
    bg: '#000000',
    text: '#e2e8f0',
    heading: '#f8fafc',
    link: '#fbbf24',
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
  },
  light: {
    bg: '#ffffff',
    text: '#1e293b',
    heading: '#0f172a',
    link: '#d97706',
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
  },
  sepia: {
    bg: '#fbf0d9',
    text: '#433422',
    heading: '#292014',
    link: '#b45309',
    fontFamily: 'Georgia, serif'
  }
};

const applyThemeToDoc = (doc, themeName) => {
  if (!doc) return;
  const cfg = EPUB_THEMES[themeName] || EPUB_THEMES.dark;

  // Remove any conflicting epubjs theme style tags so earlier/later inserted tags don't battle
  try {
    const existingEpubStyles = doc.querySelectorAll('#epubjs-inserted-css-dark, #epubjs-inserted-css-light, #epubjs-inserted-css-sepia, #epubjs-inserted-css-default');
    existingEpubStyles.forEach(el => el.remove());
  } catch (e) {}

  // Create or update our dedicated custom theme style element at the end of head
  let styleTag = doc.getElementById('epub-custom-theme-style');
  if (!styleTag) {
    styleTag = doc.createElement('style');
    styleTag.id = 'epub-custom-theme-style';
    doc.head?.appendChild(styleTag);
  }

  styleTag.textContent = `
    html, body {
      background-color: ${cfg.bg} !important;
      color: ${cfg.text} !important;
      font-family: ${cfg.fontFamily} !important;
      line-height: 1.8 !important;
      padding: 0 24px !important;
      font-weight: 400 !important;
    }
    p, div, span, li, blockquote, dd, dt, article, section, label, header, footer, nav, table, tbody, thead, tr, td, th, caption, pre, code {
      color: ${cfg.text} !important;
      background-color: transparent !important;
    }
    h1, h2, h3, h4, h5, h6 {
      color: ${cfg.heading} !important;
      font-weight: 600 !important;
      background-color: transparent !important;
    }
    a, a * {
      color: ${cfg.link} !important;
      text-decoration: underline !important;
    }
    img, svg {
      max-width: 100% !important;
      height: auto !important;
    }
  `;

  // Direct element-level properties for instant consistency and no flash
  try {
    if (doc.documentElement) {
      doc.documentElement.style.setProperty('background-color', cfg.bg, 'important');
      doc.documentElement.style.setProperty('color', cfg.text, 'important');
    }
    if (doc.body) {
      doc.body.style.setProperty('background-color', cfg.bg, 'important');
      doc.body.style.setProperty('color', cfg.text, 'important');
      doc.body.classList.remove('dark', 'light', 'sepia');
      doc.body.classList.add(themeName);
    }
  } catch (e) {}
};

export default function EpubViewer({
  book,
  onClose,
  onProgressUpdate,
  onToggleFavorite,
  isFavorite,
  showFileExtension
}) {
  const { t } = useI18n();

  const shouldShowExtension = showFileExtension !== undefined 
    ? Boolean(showFileExtension) 
    : (() => {
        try {
          return localStorage.getItem('show_file_extension') !== 'false';
        } catch (e) {
          return true;
        }
      })();

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
  const [annotations, setAnnotations] = useState([]);
  const [commentsDrawerOpen, setCommentsDrawerOpen] = useState(false);
  const [renditionReady, setRenditionReady] = useState(false);
  const [selectionMenu, setSelectionMenu] = useState({
    isOpen: false,
    x: 0,
    y: 0,
    text: '',
    cfi: null
  });
  
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

  const getInitialPage = () => {
    if (book.progress?.page && typeof book.progress.page === 'number' && book.progress.page > 0) {
      return book.progress.page;
    }
    try {
      const local = localStorage.getItem(`book_page_${book.id}`);
      if (local !== null) {
        const val = parseInt(local, 10);
        if (!isNaN(val) && val > 0) return val;
      }
    } catch (e) {}
    return 1;
  };

  const getInitialTotalPages = () => {
    if (book.progress?.total_pages && typeof book.progress.total_pages === 'number' && book.progress.total_pages > 0) {
      return book.progress.total_pages;
    }
    try {
      const local = localStorage.getItem(`book_total_pages_${book.id}`);
      if (local !== null) {
        const val = parseInt(local, 10);
        if (!isNaN(val) && val > 0) return val;
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

  // Reading page information
  const [pageInfo, setPageInfo] = useState(() => ({
    current: getInitialPage(),
    total: getInitialTotalPages()
  }));
  const [pageInput, setPageInput] = useState(() => String(getInitialPage()));

  const handlePageSubmit = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const targetPage = parseInt(pageInput, 10);
    if (isNaN(targetPage) || !renditionRef.current) return;

    if (bookRef.current?.locations && typeof bookRef.current.locations.length === 'function' && bookRef.current.locations.length() > 0) {
      const total = bookRef.current.locations.length();
      const clamped = Math.min(Math.max(1, targetPage), total);
      try {
        const targetCfi = bookRef.current.locations.cfiFromLocation(clamped - 1);
        if (targetCfi) {
          renditionRef.current.display(targetCfi);
          setPageInput(String(clamped));
          return;
        }
      } catch (err) {
        console.warn('Failed to jump to page in EPUB via location:', err);
      }
    }

    if (pageInfo.total > 0) {
      const clamped = Math.min(Math.max(1, targetPage), pageInfo.total);
      const pct = (clamped - 1) / (pageInfo.total || 1);
      try {
        const targetCfi = bookRef.current?.locations?.cfiFromPercentage(pct);
        if (targetCfi) {
          renditionRef.current.display(targetCfi);
          setPageInput(String(clamped));
        }
      } catch (e) {}
    }
  };

  // Trackpad & Touch gesture refs
  const lastSwipeTimeRef = useRef(0);
  const accumulatedDeltaXRef = useRef(0);
  const clearSwipeTimerRef = useRef(null);
  const lastProcessedWheelEventRef = useRef(null);
  const touchStartXRef = useRef(0);
  const touchStartYRef = useRef(0);
  const touchStartTimeRef = useRef(0);
  const isNavigatingRef = useRef(false);
  const handleTouchStartRef = useRef(null);
  const handleTouchEndRef = useRef(null);
  const handleNativeWheelRef = useRef(null);
  const attachListenersToIframeRef = useRef(null);

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

  const themeRef = useRef(theme);

  // Synchronize theme across all active EPUB contents and iframes whenever theme changes
  useEffect(() => {
    themeRef.current = theme;
    try {
      const contentsList = renditionRef.current?.getContents() || [];
      contentsList.forEach(contents => {
        if (contents?.document) {
          applyThemeToDoc(contents.document, theme);
        }
      });
    } catch (e) {}

    try {
      const iframes = viewerRef.current?.querySelectorAll('iframe') || [];
      iframes.forEach(iframe => {
        const doc = iframe.contentDocument || iframe.contentWindow?.document;
        if (doc) {
          applyThemeToDoc(doc, theme);
        }
      });
    } catch (e) {}
  }, [theme]);

  // Header Auto-hide & Fullscreen
  const [headerPinned, setHeaderPinned] = useState(() => {
    try {
      const saved = localStorage.getItem('reader_header_pinned');
      return saved !== null ? saved === 'true' : true;
    } catch (e) {
      return true;
    }
  });
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);

  const isHeaderVisibleRef = useRef(true);
  const hideTimerRef = useRef(null);
  const isMouseOverHeaderRef = useRef(false);
  const tocOpenRef = useRef(tocOpen);
  const commentsDrawerOpenRef = useRef(commentsDrawerOpen);

  useEffect(() => {
    isHeaderVisibleRef.current = isHeaderVisible;
  }, [isHeaderVisible]);

  useEffect(() => {
    tocOpenRef.current = tocOpen;
  }, [tocOpen]);

  useEffect(() => {
    commentsDrawerOpenRef.current = commentsDrawerOpen;
  }, [commentsDrawerOpen]);

  const clearHideTimer = useCallback(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

  const showHeader = useCallback(() => {
    clearHideTimer();
    setIsHeaderVisible(true);
    isHeaderVisibleRef.current = true;
  }, [clearHideTimer]);

  const startHideTimer = useCallback((delay = 3000, reset = false) => {
    if (hideTimerRef.current && !reset) return;
    clearHideTimer();
    hideTimerRef.current = setTimeout(() => {
      if (
        isMouseOverHeaderRef.current ||
        tocOpenRef.current ||
        commentsDrawerOpenRef.current
      ) {
        return;
      }
      setIsHeaderVisible(false);
      isHeaderVisibleRef.current = false;
      hideTimerRef.current = null;
    }, delay);
  }, [clearHideTimer]);

  const toggleHeaderPinned = useCallback(() => {
    setHeaderPinned(prev => {
      const next = !prev;
      try {
        localStorage.setItem('reader_header_pinned', String(next));
      } catch (e) {}
      if (next) {
        clearHideTimer();
        setIsHeaderVisible(true);
        isHeaderVisibleRef.current = true;
      } else {
        showHeader();
        if (!isMouseOverHeaderRef.current) {
          startHideTimer(3000, true);
        }
      }
      return next;
    });
  }, [clearHideTimer, showHeader, startHideTimer]);

  useEffect(() => {
    if (headerPinned) {
      clearHideTimer();
      return;
    }

    // Auto-hide mode is active
    if (!isMouseOverHeaderRef.current) {
      startHideTimer(3000, false);
    }

    const handleMouseMove = (e) => {
      if (e.clientY <= 56) {
        showHeader();
      } else {
        if (
          isHeaderVisibleRef.current &&
          !isMouseOverHeaderRef.current &&
          !tocOpenRef.current &&
          !commentsDrawerOpenRef.current
        ) {
          startHideTimer(3000, false);
        }
      }
    };

    const handleTouchStart = (e) => {
      const touch = e.touches[0];
      if (touch && touch.clientY <= 56) {
        showHeader();
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchstart', handleTouchStart);
      clearHideTimer();
    };
  }, [headerPinned, showHeader, startHideTimer, clearHideTimer]);

  const handleIframeMouseMove = useCallback((e, contents) => {
    if (headerPinned) return;
    const iframe = contents?.document?.defaultView?.frameElement || viewerRef.current?.querySelector('iframe');
    const iframeRect = iframe ? iframe.getBoundingClientRect() : { top: 56 };
    const windowClientY = iframeRect.top + e.clientY;
    if (windowClientY <= 56) {
      showHeader();
    } else {
      if (
        isHeaderVisibleRef.current &&
        !isMouseOverHeaderRef.current &&
        !tocOpenRef.current &&
        !commentsDrawerOpenRef.current
      ) {
        startHideTimer(3000, false);
      }
    }
  }, [headerPinned, showHeader, startHideTimer]);

  const handleIframeMouseMoveRef = useRef(handleIframeMouseMove);
  useEffect(() => {
    handleIframeMouseMoveRef.current = handleIframeMouseMove;
  }, [handleIframeMouseMove]);

  const [isFullscreen, setIsFullscreen] = useState(() => {
    return typeof document !== 'undefined' ? Boolean(document.fullscreenElement) : false;
  });

  // Keep favorite state synchronized with prop
  useEffect(() => {
    if (isFavorite !== undefined) {
      setFavState(isFavorite);
    }
  }, [isFavorite]);

  // Fullscreen & window resize handler
  useEffect(() => {
    let resizeTimer = null;
    const handleResize = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        renditionRef.current?.resize();
      }, 100);
    };

    window.addEventListener('resize', handleResize);
    document.addEventListener('fullscreenchange', handleResize);
    return () => {
      if (resizeTimer) clearTimeout(resizeTimer);
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('fullscreenchange', handleResize);
    };
  }, []);

  // Lock body/html scroll and overscroll-behavior while EpubViewer is mounted
  // to prevent background scroll leaks and eliminate the browser window scrollbar
  useEffect(() => {
    const originalBodyOverflow = document.body.style.overflow;
    const originalHtmlOverflow = document.documentElement.style.overflow;
    const originalBodyOverscroll = document.body.style.overscrollBehavior;
    const originalHtmlOverscroll = document.documentElement.style.overscrollBehavior;

    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overscrollBehavior = 'none';
    document.documentElement.style.overscrollBehavior = 'none';

    return () => {
      document.body.style.overflow = originalBodyOverflow;
      document.documentElement.style.overflow = originalHtmlOverflow;
      document.body.style.overscrollBehavior = originalBodyOverscroll;
      document.documentElement.style.overscrollBehavior = originalHtmlOverscroll;
    };
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  // Debounced API progress saving
  const saveProgressDebounced = useCallback((cfi, percent, page, total) => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

    saveTimeoutRef.current = setTimeout(() => {
      const curPage = (typeof page === 'number' && page > 0)
        ? page
        : Math.max(1, Math.round((percent / 100) * (total || 100)));
      const totalPages = (typeof total === 'number' && total > 0) ? total : 100;

      const payload = {
        book_id: book.id,
        page: curPage,
        total_pages: totalPages,
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

  // Page flip handlers with debounce lock to prevent double-page skips
  const flipNext = useCallback(() => {
    if (isNavigatingRef.current || !renditionRef.current) return;
    isNavigatingRef.current = true;
    try {
      const p = renditionRef.current.next();
      if (p && typeof p.then === 'function') {
        p.finally(() => {
          setTimeout(() => {
            isNavigatingRef.current = false;
          }, 180);
        });
      } else {
        setTimeout(() => {
          isNavigatingRef.current = false;
        }, 250);
      }
    } catch (e) {
      isNavigatingRef.current = false;
    }
  }, []);

  const flipPrev = useCallback(() => {
    if (isNavigatingRef.current || !renditionRef.current) return;
    isNavigatingRef.current = true;
    try {
      const p = renditionRef.current.prev();
      if (p && typeof p.then === 'function') {
        p.finally(() => {
          setTimeout(() => {
            isNavigatingRef.current = false;
          }, 180);
        });
      } else {
        setTimeout(() => {
          isNavigatingRef.current = false;
        }, 250);
      }
    } catch (e) {
      isNavigatingRef.current = false;
    }
  }, []);

  // Gesture handling: Two-finger trackpad horizontal swipe & vertical wheel (matches Reader.jsx)
  const handleNativeWheel = useCallback((e) => {
    // Prevent double processing if event triggers both doc and win listeners
    if (lastProcessedWheelEventRef.current === e) return;
    lastProcessedWheelEventRef.current = e;

    // Do not intercept wheel when interacting with scrollable drawers, menus, or header
    if (e.target && typeof e.target.closest === 'function') {
      if (e.target.closest('.overflow-y-auto') || e.target.closest('[role="dialog"]') || e.target.closest('header')) {
        return;
      }
    }

    const absX = Math.abs(e.deltaX);
    const absY = Math.abs(e.deltaY);
    const now = Date.now();

    // 1. Two-finger horizontal trackpad swipe to flip pages
    if (absX > absY && absX > 2) {
      if (e.cancelable) e.preventDefault();
      if (typeof e.stopPropagation === 'function') e.stopPropagation();

      if (now - lastSwipeTimeRef.current > 450 && !isNavigatingRef.current) {
        accumulatedDeltaXRef.current += e.deltaX;

        if (clearSwipeTimerRef.current) clearTimeout(clearSwipeTimerRef.current);
        clearSwipeTimerRef.current = setTimeout(() => {
          accumulatedDeltaXRef.current = 0;
        }, 150);

        if (Math.abs(accumulatedDeltaXRef.current) > 42) {
          lastSwipeTimeRef.current = now;
          const dir = accumulatedDeltaXRef.current;
          accumulatedDeltaXRef.current = 0;
          if (dir > 0) {
            flipNext();
          } else {
            flipPrev();
          }
        }
      }
      return;
    }

    // 2. Vertical two-finger scroll is disabled - only horizontal scroll is allowed
    if (absY >= absX) {
      if (e.cancelable) e.preventDefault();
      return;
    }
  }, [flipNext, flipPrev]);

  useEffect(() => {
    handleNativeWheelRef.current = handleNativeWheel;
  }, [handleNativeWheel]);

  // Gesture handling: Touch swipe
  const handleTouchStart = useCallback((e) => {
    if (e.touches && e.touches.length === 1) {
      touchStartXRef.current = e.touches[0].clientX;
      touchStartYRef.current = e.touches[0].clientY;
      touchStartTimeRef.current = Date.now();
    }
  }, []);

  useEffect(() => {
    handleTouchStartRef.current = handleTouchStart;
  }, [handleTouchStart]);

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
        flipNext();
      } else {
        flipPrev();
      }
    }
    touchStartXRef.current = 0;
    touchStartYRef.current = 0;
  }, [flipNext, flipPrev]);

  useEffect(() => {
    handleTouchEndRef.current = handleTouchEnd;
  }, [handleTouchEnd]);

  // Unified helper to attach wheel, touch, and interaction listeners to an EPUB iframe
  const attachListenersToIframe = useCallback((doc, win, contents = null) => {
    if (!doc && !win) return;
    const targetDoc = doc || win?.document;
    const targetWin = win || doc?.defaultView;
    if (!targetDoc || !targetWin) return;

    // Apply active theme immediately
    applyThemeToDoc(targetDoc, themeRef.current);

    if (targetDoc._hasEpubListenersAttached) return;
    targetDoc._hasEpubListenersAttached = true;

    // Prevent browser history swipe navigation inside iframe
    try {
      if (targetDoc.documentElement) {
        targetDoc.documentElement.style.overscrollBehavior = 'none';
      }
      if (targetDoc.body) {
        targetDoc.body.style.overscrollBehavior = 'none';
      }
    } catch (e) {}

    const onWheel = (e) => {
      handleNativeWheelRef.current?.(e);
    };

    // Attach wheel listeners in capture and bubble phases
    targetWin.addEventListener('wheel', onWheel, { passive: false, capture: true });
    targetDoc.addEventListener('wheel', onWheel, { passive: false, capture: true });
    targetWin.addEventListener('wheel', onWheel, { passive: false, capture: false });
    targetDoc.addEventListener('wheel', onWheel, { passive: false, capture: false });

    // Touch swipe handlers inside iframe
    const onTouchStart = (e) => {
      handleTouchStartRef.current?.(e);
      const touch = e.touches?.[0];
      if (touch) {
        const iframe = targetDoc.defaultView?.frameElement || viewerRef.current?.querySelector('iframe');
        const iframeRect = iframe ? iframe.getBoundingClientRect() : { top: 56 };
        const windowTouchY = iframeRect.top + touch.clientY;
        if (windowTouchY <= 56) {
          showHeader();
        }
      }
    };

    const onTouchEnd = (e) => {
      handleTouchEndRef.current?.(e);
    };

    targetWin.addEventListener('touchstart', onTouchStart, { passive: true });
    targetDoc.addEventListener('touchstart', onTouchStart, { passive: true });
    targetWin.addEventListener('touchend', onTouchEnd, { passive: true });
    targetDoc.addEventListener('touchend', onTouchEnd, { passive: true });

    // Mousemove for auto-hide header
    targetDoc.addEventListener('mousemove', (e) => {
      handleIframeMouseMoveRef.current?.(e, contents);
    });

    // Context menu handler on selected text inside iframe
    targetDoc.addEventListener('contextmenu', (e) => {
      const selection = targetWin.getSelection();
      const text = selection ? selection.toString().trim() : '';
      if (!text || selection.rangeCount === 0) return;

      e.preventDefault();
      const iframe = targetDoc.defaultView?.frameElement || viewerRef.current?.querySelector('iframe');
      const iframeRect = iframe ? iframe.getBoundingClientRect() : { left: 0, top: 0 };
      const range = selection.getRangeAt(0);
      let cfiRange = null;
      try {
        if (contents?.cfiBase) {
          cfiRange = new EpubCFI(range, contents.cfiBase).toString();
        }
      } catch (err) {}

      setSelectionMenu(prev => ({
        isOpen: true,
        x: iframeRect.left + e.clientX,
        y: iframeRect.top + e.clientY,
        text,
        cfi: cfiRange || prev.cfi
      }));
    });

    // Dismiss floating selection menu when user clicks inside EPUB document
    targetDoc.addEventListener('mousedown', () => {
      setSelectionMenu(prev => prev.isOpen ? { isOpen: false, x: 0, y: 0, text: '', cfi: null } : prev);
    });
  }, [showHeader]);

  useEffect(() => {
    attachListenersToIframeRef.current = attachListenersToIframe;
  }, [attachListenersToIframe]);

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

  // Load Annotations from Backend
  const loadAnnotations = useCallback(() => {
    fetch(`/api/annotations/${book.id}`)
      .then(r => r.json())
      .then(data => {
        setAnnotations(data.annotations || []);
      })
      .catch(err => console.error('Failed to load annotations:', err));
  }, [book.id]);

  useEffect(() => {
    loadAnnotations();
  }, [loadAnnotations]);

  // Synchronize annotations into epub.js rendition
  useEffect(() => {
    if (!renditionRef.current || !renditionReady || !Array.isArray(annotations)) return;

    annotations.forEach(ann => {
      if (!ann.cfi) return;
      try {
        renditionRef.current.annotations.remove(ann.cfi, 'highlight');
        const colorHex = COLOR_HEX_MAP[ann.color] || '#facc15';
        renditionRef.current.annotations.add(
          'highlight',
          ann.cfi,
          { id: ann.id },
          () => {
            setCommentsDrawerOpen(true);
          },
          'hl-annotation',
          { fill: colorHex, 'fill-opacity': '0.35', 'mix-blend-mode': 'normal' }
        );
      } catch (err) {
        console.warn('Failed to attach annotation highlight to rendition:', ann.id, err);
      }
    });
  }, [annotations, renditionReady]);

  // Create new highlight or comment
  const handleCreateHighlight = (color, comment = '') => {
    if (!selectionMenu.text || !selectionMenu.cfi) return;

    const cfi = selectionMenu.cfi;
    const text = selectionMenu.text;
    const currentChapter = locationInfo.chapter || '';

    const payload = {
      book_id: book.id,
      page: 1,
      cfi: cfi,
      chapter: currentChapter,
      text: text,
      color: color,
      comment: comment,
      rects: [],
    };

    fetch('/api/annotations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    .then(r => r.json())
    .then(data => {
      if (data.status === 'ok' && data.annotation) {
        setAnnotations(prev => [...prev, data.annotation]);
        if (renditionRef.current) {
          try {
            renditionRef.current.annotations.remove(cfi, 'highlight');
            const colorHex = COLOR_HEX_MAP[color] || '#facc15';
            renditionRef.current.annotations.add(
              'highlight',
              cfi,
              { id: data.annotation.id },
              () => {
                setCommentsDrawerOpen(true);
              },
              'hl-annotation',
              { fill: colorHex, 'fill-opacity': '0.35', 'mix-blend-mode': 'normal' }
            );
          } catch (e) {
            console.warn('Failed to add rendition annotation:', e);
          }
        }
      }
    })
    .catch(err => console.error('Failed to create annotation:', err));

    try {
      const activeWindow = viewerRef.current?.querySelector('iframe')?.contentWindow;
      activeWindow?.getSelection()?.removeAllRanges();
      window.getSelection()?.removeAllRanges();
    } catch (e) {}

    setSelectionMenu({ isOpen: false, x: 0, y: 0, text: '', cfi: null });
  };

  // Update existing comment note
  const handleUpdateComment = (annotationId, newComment) => {
    fetch(`/api/annotations/${book.id}/${annotationId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ comment: newComment }),
    })
    .then(r => r.json())
    .then(data => {
      if (data.status === 'ok' && data.annotation) {
        setAnnotations(prev => prev.map(a => a.id === annotationId ? data.annotation : a));
      }
    })
    .catch(err => console.error('Failed to update comment:', err));
  };

  // Delete an annotation
  const handleDeleteAnnotation = (annotationId) => {
    const ann = annotations.find(a => a.id === annotationId);
    fetch(`/api/annotations/${book.id}/${annotationId}`, {
      method: 'DELETE',
    })
    .then(r => r.json())
    .then(data => {
      if (data.status === 'ok') {
        if (ann && ann.cfi && renditionRef.current) {
          try {
            renditionRef.current.annotations.remove(ann.cfi, 'highlight');
          } catch (e) {}
        }
        setAnnotations(prev => prev.filter(a => a.id !== annotationId));
      }
    })
    .catch(err => console.error('Failed to delete annotation:', err));
  };

  // Jump directly to an annotation
  const handleJumpToAnnotation = (ann) => {
    if (ann.cfi && renditionRef.current) {
      renditionRef.current.display(ann.cfi);
      if (window.innerWidth < 768) {
        setCommentsDrawerOpen(false);
      }
    }
  };

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
    let domObserver = null;
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
            background: '#000000 !important',
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
        rendition.themes.select(themeRef.current);
        rendition.themes.fontSize(`${fontSize}%`);

        // Register content hooks BEFORE initial display so swipe gestures, wheel scroll, and interaction listeners are attached to the very first chapter
        rendition.hooks.content.register((contents) => {
          attachListenersToIframeRef.current?.(contents.document, contents.window, contents);

          // Inject styling for highlights inside EPUB iframe
          try {
            contents.addStylesheetCss(`
              .hl-annotation, .epubjs-hl, [ref="hl-annotation"] {
                cursor: pointer !important;
                transition: fill-opacity 0.15s ease;
              }
              .hl-annotation:hover, .epubjs-hl:hover, [ref="hl-annotation"]:hover {
                fill-opacity: 0.55 !important;
              }
            `);
          } catch (e) {}
        });

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

        // Immediately ensure theme styles and listeners are attached to all rendered iframes
        try {
          rendition.getContents().forEach(c => {
            if (c?.document) attachListenersToIframeRef.current?.(c.document, c.window, c);
          });
          const iframes = viewerRef.current?.querySelectorAll('iframe') || [];
          iframes.forEach(iframe => {
            const doc = iframe.contentDocument || iframe.contentWindow?.document;
            const win = iframe.contentWindow;
            if (doc && win) attachListenersToIframeRef.current?.(doc, win);
          });
        } catch (e) {}

        // MutationObserver to catch any iframes dynamically inserted or replaced by EPUB.js
        if (viewerRef.current) {
          domObserver = new MutationObserver(() => {
            const iframes = viewerRef.current?.querySelectorAll('iframe') || [];
            iframes.forEach(iframe => {
              try {
                const doc = iframe.contentDocument || iframe.contentWindow?.document;
                const win = iframe.contentWindow;
                if (doc && win) {
                  attachListenersToIframeRef.current?.(doc, win);
                }
              } catch (e) {}
            });
          });
          domObserver.observe(viewerRef.current, { childList: true, subtree: true });
        }

        if (!isCancelled) {
          setLoading(false);
          setRenditionReady(true);
        }

        // Generate location numbers in background for accurate percent tracking (with localStorage caching)
        epubBook.ready.then(() => {
          try {
            const cached = localStorage.getItem(`book_locations_${book.id}`);
            if (cached) {
              epubBook.locations.load(cached);
              return;
            }
          } catch (e) {}

          return epubBook.locations.generate(1600);
        }).then(() => {
          if (isCancelled) return;
          try {
            if (epubBook.locations && epubBook.locations.length() > 0) {
              localStorage.setItem(`book_locations_${book.id}`, epubBook.locations.save());
            }
          } catch (e) {}

          const totalLocs = (epubBook.locations && typeof epubBook.locations.length === 'function')
            ? epubBook.locations.length()
            : 0;

          if (totalLocs > 0) {
            try {
              localStorage.setItem(`book_total_pages_${book.id}`, String(totalLocs));
            } catch (e) {}
          }

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

          const currentCfi = rendition.currentLocation()?.start?.cfi || startCfi;
          let curPage = 1;
          if (currentCfi && totalLocs > 0) {
            try {
              const loc = epubBook.locations.locationFromCfi(currentCfi);
              if (typeof loc === 'number' && !isNaN(loc) && loc >= 0) {
                curPage = Math.min(totalLocs, loc + 1);
              }
            } catch (e) {}
          }

          if (totalLocs > 0) {
            setPageInfo({ current: curPage, total: totalLocs });
            setPageInput(String(curPage));
            try {
              localStorage.setItem(`book_page_${book.id}`, String(curPage));
            } catch (e) {}
          }

          if (rendition.currentLocation()?.start?.cfi) {
            const cfi = rendition.currentLocation().start.cfi;
            const pct = Math.round(epubBook.locations.percentageFromCfi(cfi) * 100);
            if (pct > 0) {
              setLocationInfo(prev => ({ ...prev, percentage: pct }));
              saveProgressDebounced(cfi, pct, curPage, totalLocs);
            }
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

        // Handle text selection in EPUB
        rendition.on('selected', (cfiRange, contents) => {
          if (!cfiRange || !contents || !contents.window) return;
          const selection = contents.window.getSelection();
          const text = selection ? selection.toString().trim() : '';
          if (!text || selection.rangeCount === 0) return;

          const range = selection.getRangeAt(0);
          let rect = range.getBoundingClientRect();
          if (!rect || (rect.width === 0 && rect.height === 0)) {
            const clientRects = range.getClientRects();
            if (clientRects && clientRects.length > 0) {
              rect = clientRects[0];
            }
          }

          const iframe = contents.document?.defaultView?.frameElement || viewerRef.current?.querySelector('iframe');
          const iframeRect = iframe ? iframe.getBoundingClientRect() : { left: 0, top: 0 };

          const posX = rect ? (iframeRect.left + rect.left + rect.width / 2) : (window.innerWidth / 2);
          const posY = rect ? (iframeRect.top + rect.bottom + 8) : (window.innerHeight / 2);

          setSelectionMenu({
            isOpen: true,
            x: posX,
            y: posY,
            text,
            cfi: cfiRange
          });
        });

        // Helper to calculate reading percentage reliably
        const getAccuratePercentage = (location, cfi) => {
          // 1. If epubBook has generated locations and can resolve the CFI, use it
          if (epubBook.locations && typeof epubBook.locations.length === 'function' && epubBook.locations.length() > 0) {
            try {
              const locPct = epubBook.locations.percentageFromCfi(cfi);
              if (typeof locPct === 'number' && !isNaN(locPct) && locPct >= 0) {
                return Math.min(100, Math.max(0, Math.round(locPct * 100)));
              }
            } catch (e) {}
          }

          // 2. If location has native percentage
          if (location?.start?.percentage !== undefined && typeof location.start.percentage === 'number' && !isNaN(location.start.percentage) && location.start.percentage > 0) {
            return Math.min(100, Math.max(0, Math.round(location.start.percentage * 100)));
          }

          // 3. Spine-based calculation (immediate, accurate, zero delay)
          const spineItems = epubBook.spine?.items || [];
          const totalSpine = spineItems.length;

          if (totalSpine > 0) {
            let spineIndex = location?.start?.index;

            // If spine index is missing, extract it from CFI /6/(\d+)!
            if (spineIndex === undefined && cfi) {
              const match = cfi.match(/\/6\/(\d+)!/);
              if (match) {
                const childNum = parseInt(match[1], 10);
                spineIndex = Math.max(0, Math.floor(childNum / 2) - 1);
              }
            }

            if (spineIndex !== undefined && spineIndex >= 0) {
              const displayed = location?.start?.displayed;
              let intraFraction = 0;
              if (displayed && displayed.total > 1 && displayed.page > 0) {
                intraFraction = (displayed.page - 1) / displayed.total;
              }
              const fraction = (spineIndex + intraFraction) / totalSpine;
              return Math.min(100, Math.max(0, Math.round(fraction * 100)));
            }
          }

          if (initialPercentRef.current > 0) {
            return Math.round(initialPercentRef.current);
          }

          return 0;
        };

        // Ensure newly rendered view has current theme applied immediately and listeners attached
        rendition.on('rendered', (section, view) => {
          if (view?.document) {
            attachListenersToIframeRef.current?.(view.document, view.window, view);
          }
        });

        // Handle Location changes
        rendition.on('relocated', (location) => {
          if (isCancelled || !location || !location.start) return;

          // Ensure all active iframes have listeners attached
          try {
            const iframes = viewerRef.current?.querySelectorAll('iframe') || [];
            iframes.forEach(iframe => {
              const doc = iframe.contentDocument || iframe.contentWindow?.document;
              const win = iframe.contentWindow;
              if (doc && win) attachListenersToIframeRef.current?.(doc, win);
            });
          } catch (e) {}
          const cfi = location.start.cfi;
          const pct = getAccuratePercentage(location, cfi);

          const chapterName = findChapterLabel(tocRef.current, location.start.href);

          setLocationInfo({
            cfi: cfi,
            percentage: pct,
            chapter: chapterName
          });

          // Calculate current page & total pages if locations available
          let curPage = null;
          let totalPages = null;

          if (epubBook.locations && typeof epubBook.locations.length === 'function' && epubBook.locations.length() > 0) {
            totalPages = epubBook.locations.length();
            try {
              const loc = epubBook.locations.locationFromCfi(cfi);
              if (typeof loc === 'number' && !isNaN(loc) && loc >= 0) {
                curPage = Math.min(totalPages, loc + 1);
              }
            } catch (e) {}
          }

          if (curPage === null && totalPages && totalPages > 0) {
            curPage = Math.max(1, Math.round((pct / 100) * totalPages));
          }

          if (curPage !== null) {
            setPageInfo(prev => ({
              current: curPage,
              total: totalPages || prev.total || 0
            }));
            setPageInput(String(curPage));
            try {
              localStorage.setItem(`book_page_${book.id}`, String(curPage));
              if (totalPages) localStorage.setItem(`book_total_pages_${book.id}`, String(totalPages));
            } catch (e) {}
          }

          // Synchronously persist location so it is never lost on refresh / closing tab
          try {
            localStorage.setItem(`book_cfi_${book.id}`, cfi);
            localStorage.setItem(`book_percent_${book.id}`, String(pct));
          } catch (e) {}

          // Prevent initial relocation on mount from overwriting saved progress before locations are generated
          if (isInitialRelocationRef.current) {
            isInitialRelocationRef.current = false;
            // If the book had 0% or no percent saved, save the real computed percent now
            if (pct > 0 && (!book.progress?.percent || book.progress.percent === 0)) {
              saveProgressDebounced(cfi, pct, curPage, totalPages);
            }
            return;
          }

          saveProgressDebounced(cfi, pct, curPage, totalPages);
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
            if (commentsDrawerOpen) {
              setCommentsDrawerOpen(false);
            } else if (tocOpen) {
              setTocOpen(false);
            } else {
              handleClose();
            }
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
      if (domObserver) domObserver.disconnect();
      setRenditionReady(false);
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
        flipNext();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        flipPrev();
      } else if (e.key === 'Escape') {
        if (selectionMenu.isOpen) {
          setSelectionMenu({ isOpen: false, x: 0, y: 0, text: '', cfi: null });
        } else if (commentsDrawerOpen) {
          setCommentsDrawerOpen(false);
        } else if (tocOpen) {
          setTocOpen(false);
        } else {
          handleClose();
        }
      } else if (e.key === 'f' || e.key === 'F') {
        toggleFullscreen();
      } else if (e.key === 'm' || e.key === 'M') {
        cycleTheme();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, commentsDrawerOpen, tocOpen, selectionMenu.isOpen, handleClose, flipNext, flipPrev]);

  // Handle Theme Change
  const applyTheme = (newTheme) => {
    themeRef.current = newTheme;
    setTheme(newTheme);
    try {
      localStorage.setItem(`book_theme_${book.id}`, newTheme);
      localStorage.setItem(`book_invert_${book.id}`, String(newTheme === 'dark'));
    } catch (e) {}

    if (renditionRef.current) {
      try {
        renditionRef.current.themes.select(newTheme);
      } catch (e) {}
    }

    try {
      const contentsList = renditionRef.current?.getContents() || [];
      contentsList.forEach(contents => {
        if (contents?.document) {
          applyThemeToDoc(contents.document, newTheme);
        }
      });
    } catch (e) {}

    try {
      const iframes = viewerRef.current?.querySelectorAll('iframe') || [];
      iframes.forEach(iframe => {
        const doc = iframe.contentDocument || iframe.contentWindow?.document;
        if (doc) {
          applyThemeToDoc(doc, newTheme);
        }
      });
    } catch (e) {}

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
    ? 'bg-black' 
    : theme === 'sepia' 
    ? 'bg-[#fbf0d9]' 
    : 'bg-[#ffffff]';

  const headerTheme = {
    dark: {
      bar: 'bg-black border-neutral-900 text-neutral-200',
      shadow: 'shadow-xl shadow-black/80',
      title: 'text-neutral-100',
      subtitle: 'text-neutral-400',
      chapter: 'text-neutral-300',
      btn: 'bg-neutral-800/80 hover:bg-neutral-700 text-neutral-300 hover:text-white',
      btnActive: 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
      divider: 'bg-neutral-700',
      badge: 'bg-indigo-950 text-indigo-300 border-indigo-500/40',
      input: 'bg-neutral-950 border-neutral-700 text-neutral-200 focus:border-amber-500',
      pageSlash: 'text-neutral-400',
      percentage: 'text-amber-400',
      toolGroup: 'bg-neutral-900 border-neutral-800',
      toolBtn: 'text-neutral-400 hover:text-white hover:bg-neutral-800',
      iconBtn: 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800',
      iconBtnActive: 'bg-amber-500/20 border-amber-500/50 text-amber-400',
      pinActive: 'bg-neutral-800 border-neutral-700 text-neutral-200',
      pinInactive: 'bg-neutral-900 border-neutral-800 text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800',
    },
    sepia: {
      bar: 'bg-[#fbf0d9] border-[#e5d5b5] text-[#433422]',
      shadow: 'shadow-md shadow-stone-900/10',
      title: 'text-[#292014]',
      subtitle: 'text-[#7c6a53]',
      chapter: 'text-[#5a4833]',
      btn: 'bg-[#efe0c2] hover:bg-[#e4d2b0] text-[#433422] hover:text-[#292014] border border-[#e5d5b5]',
      btnActive: 'bg-amber-500/20 text-amber-800 border border-amber-600/40',
      divider: 'bg-[#d8c5a0]',
      badge: 'bg-[#ebd8b7] text-[#78350f] border-[#d8c5a0]',
      input: 'bg-[#fbf0d9] border-[#d8c5a0] text-[#292014] focus:border-amber-600',
      pageSlash: 'text-[#7c6a53]',
      percentage: 'text-amber-700 font-semibold',
      toolGroup: 'bg-[#efe0c2] border-[#e5d5b5]',
      toolBtn: 'text-[#5a4833] hover:text-[#292014] hover:bg-[#e4d2b0]',
      iconBtn: 'bg-[#efe0c2] border-[#e5d5b5] text-[#5a4833] hover:text-[#292014] hover:bg-[#e4d2b0]',
      iconBtnActive: 'bg-amber-500/20 border-amber-600/50 text-amber-800',
      pinActive: 'bg-[#e4d2b0] border-[#cfbc97] text-[#292014]',
      pinInactive: 'bg-[#efe0c2] border-[#e5d5b5] text-[#7c6a53] hover:text-[#292014] hover:bg-[#e4d2b0]',
    },
    light: {
      bar: 'bg-white border-neutral-200 text-neutral-700',
      shadow: 'shadow-md shadow-neutral-900/5',
      title: 'text-neutral-900',
      subtitle: 'text-neutral-500',
      chapter: 'text-neutral-700',
      btn: 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700 hover:text-neutral-900 border border-neutral-200',
      btnActive: 'bg-amber-500/20 text-amber-700 border border-amber-500/40',
      divider: 'bg-neutral-300',
      badge: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      input: 'bg-white border-neutral-300 text-neutral-900 focus:border-amber-500',
      pageSlash: 'text-neutral-500',
      percentage: 'text-amber-600 font-semibold',
      toolGroup: 'bg-neutral-100 border-neutral-200',
      toolBtn: 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200',
      iconBtn: 'bg-neutral-100 border-neutral-200 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200',
      iconBtnActive: 'bg-amber-500/20 border-amber-500/50 text-amber-700',
      pinActive: 'bg-neutral-200 border-neutral-300 text-neutral-900',
      pinInactive: 'bg-neutral-100 border-neutral-200 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-200',
    }
  };
  const ht = headerTheme[theme] || headerTheme.dark;
  const isHeaderShowing = headerPinned || isHeaderVisible || tocOpen || commentsDrawerOpen;

  return (
    <div 
      className={`fixed inset-0 z-50 flex flex-col ${viewerBgClass} text-neutral-200 select-none overflow-hidden transition-colors duration-300`}
    >
      {/* Top Header Bar */}
      <header 
        onMouseEnter={() => {
          isMouseOverHeaderRef.current = true;
          clearHideTimer();
        }}
        onMouseLeave={() => {
          isMouseOverHeaderRef.current = false;
          if (!headerPinned && !tocOpen && !commentsDrawerOpen) {
            startHideTimer(3000, true);
          }
        }}
        className={`fixed top-0 inset-x-0 z-40 h-14 border-b px-4 flex items-center justify-between select-none transition-all duration-300 ease-in-out ${
          ht.bar
        } ${
          isHeaderShowing ? `translate-y-0 opacity-100 pointer-events-auto ${ht.shadow}` : '-translate-y-full opacity-0 pointer-events-none'
        }`}
      >
        {/* Left: Back, TOC & Book Title */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 max-w-[calc(50%-90px)] sm:max-w-[calc(50%-110px)] md:max-w-[calc(50%-130px)] z-10">
          <button
            onClick={handleClose}
            className={`h-7 flex items-center gap-1.5 px-2.5 rounded-lg transition text-xs font-medium shrink-0 cursor-pointer ${ht.btn}`}
            title={t('backToLibraryTitle')}
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">{t('backToLibrary')}</span>
          </button>

          {/* Toggle EPUB Table of Contents Button */}
          <button
            onClick={() => setTocOpen(prev => !prev)}
            className={`h-7 w-7 flex items-center justify-center rounded-lg transition shrink-0 cursor-pointer ${
              tocOpen 
                ? ht.btnActive 
                : ht.btn
            }`}
            title={tocOpen ? t('hideIndex') : t('showIndex')}
          >
            <ListTree className="w-4 h-4" />
          </button>

          <div className={`h-4 w-px mx-0.5 hidden sm:block shrink-0 ${ht.divider}`} />

          <div className="min-w-0 flex-1">
            <h1 className={`text-xs sm:text-sm font-semibold truncate ${ht.title}`} title={book.title}>
              {book.title}
            </h1>
            <div className={`flex items-center gap-1.5 text-[10px] sm:text-xs truncate ${ht.subtitle}`}>
              {book.author && <span className="text-amber-500 font-medium truncate">{book.author}</span>}
              {book.author && <span>•</span>}
              {locationInfo.chapter ? (
                <span className={`truncate ${ht.chapter}`} title={locationInfo.chapter}>{locationInfo.chapter}</span>
              ) : (
                <span className="truncate">{book.shelf_display || book.folder_display}</span>
              )}
              {shouldShowExtension && (
                <span className={`px-1 py-0.2 text-[8px] font-bold rounded uppercase shrink-0 border ${ht.badge}`}>
                  EPUB
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Center Page Controls - Always Centralized */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-2 z-10">
          <button
            onClick={flipPrev}
            disabled={pageInfo.total > 0 && pageInfo.current <= 1}
            className={`h-7 w-7 flex items-center justify-center rounded-lg disabled:opacity-30 transition cursor-pointer ${ht.btn}`}
            title={t('prevPageTitle')}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <form onSubmit={handlePageSubmit} className="flex items-center text-xs font-mono">
            <input 
              type="text"
              value={pageInput}
              onChange={(e) => setPageInput(e.target.value)}
              onBlur={handlePageSubmit}
              className={`w-14 sm:w-16 h-7 text-center py-0 rounded focus:outline-none ${ht.input}`}
            />
            {pageInfo.total > 0 && (
              <>
                <span className={`mx-1.5 ${ht.pageSlash}`}>/</span>
                <span className={ht.pageSlash}>{pageInfo.total}</span>
              </>
            )}
          </form>

          <button 
            onClick={flipNext}
            disabled={pageInfo.total > 0 && pageInfo.current >= pageInfo.total}
            className={`h-7 w-7 flex items-center justify-center rounded-lg disabled:opacity-30 transition cursor-pointer ${ht.btn}`}
            title={t('nextPageTitle')}
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <span className={`text-xs ml-1 hidden md:inline-block ${ht.percentage}`}>
            {locationInfo.percentage}%
          </span>
        </div>

        {/* Right: Actions (Font Scaling, Theme, Fullscreen) */}
        <div className="flex items-center gap-1 sm:gap-2 ml-auto z-10">
          {/* Font Size Adjustments */}
          <div className={`flex items-center rounded-lg p-0.5 border ${ht.toolGroup}`}>
            <button
              onClick={() => changeFontSize(-10)}
              className={`p-1 rounded transition cursor-pointer ${ht.toolBtn}`}
              title="Decrease Font Size (-)"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={resetFontSize}
              className={`px-1.5 text-[11px] font-mono transition cursor-pointer ${
                theme === 'dark' 
                  ? 'text-neutral-300 hover:text-amber-400' 
                  : theme === 'sepia' 
                  ? 'text-[#433422] hover:text-amber-700' 
                  : 'text-neutral-700 hover:text-amber-600'
              }`}
              title="Reset Font Size"
            >
              {fontSize}%
            </button>
            <button
              onClick={() => changeFontSize(10)}
              className={`p-1 rounded transition cursor-pointer ${ht.toolBtn}`}
              title="Increase Font Size (+)"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Reading Theme Picker (Dark, Light, Sepia) */}
          <div className={`flex items-center rounded-lg p-0.5 border ${ht.toolGroup}`}>
            <button
              onClick={() => applyTheme('dark')}
              className={`p-1 rounded transition cursor-pointer ${
                theme === 'dark' 
                  ? 'bg-neutral-800 text-amber-400' 
                  : theme === 'sepia' 
                  ? 'text-[#7c6a53] hover:text-[#292014]' 
                  : 'text-neutral-500 hover:text-neutral-900'
              }`}
              title="Dark Mode"
            >
              <Moon className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => applyTheme('sepia')}
              className={`p-1 rounded transition cursor-pointer ${
                theme === 'sepia' 
                  ? 'bg-[#5f4b32] text-[#fbf0d9] shadow-sm' 
                  : theme === 'dark' 
                  ? 'text-neutral-400 hover:text-white' 
                  : 'text-neutral-500 hover:text-neutral-900'
              }`}
              title="Sepia Mode"
            >
              <Palette className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => applyTheme('light')}
              className={`p-1 rounded transition cursor-pointer ${
                theme === 'light' 
                  ? 'bg-white text-neutral-900 shadow-sm border border-neutral-200/80' 
                  : theme === 'sepia' 
                  ? 'text-[#7c6a53] hover:text-[#292014]' 
                  : 'text-neutral-400 hover:text-white'
              }`}
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
                ? 'bg-rose-500/10 border-rose-500/40 text-rose-500' 
                : ht.iconBtn
            }`}
            title={favState ? t('removeFromFavorites') : t('addToFavorites')}
          >
            <Heart className={`w-4 h-4 ${favState ? 'fill-rose-500 text-rose-500' : ''}`} />
          </button>

          {/* Comments & Highlights Drawer Toggle */}
          <button 
            onClick={() => {
              setCommentsDrawerOpen(prev => {
                const next = !prev;
                setTimeout(() => {
                  renditionRef.current?.resize();
                }, 150);
                return next;
              });
            }}
            className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
              commentsDrawerOpen 
                ? ht.iconBtnActive 
                : ht.iconBtn
            }`}
            title={commentsDrawerOpen ? t('hideComments') : (annotations.length > 0 ? `${t('showComments')} (${annotations.length})` : t('showComments'))}
          >
            <div className="relative">
              <MessageSquare className="w-4 h-4" />
              {annotations.length > 0 && (
                <span className={`absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-400 ring-2 ${
                  theme === 'dark' ? 'ring-neutral-900' : theme === 'sepia' ? 'ring-[#fbf0d9]' : 'ring-white'
                }`} />
              )}
            </div>
          </button>

          {/* Header Pin Toggle */}
          <button
            onClick={toggleHeaderPinned}
            className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
              headerPinned 
                ? ht.pinActive 
                : ht.pinInactive
            }`}
            title={headerPinned ? t('unpinHeaderTitle') : t('pinHeaderTitle')}
          >
            {headerPinned ? <PanelTopClose className="w-4 h-4" /> : <PanelTopOpen className="w-4 h-4" />}
          </button>

          {/* Fullscreen Button */}
          <button
            onClick={toggleFullscreen}
            className={`p-1.5 rounded-lg border transition-colors hidden sm:block cursor-pointer ${ht.iconBtn}`}
            title={t('fullscreenTitle')}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Main EPUB Reader Stage + Side Drawers */}
      <div className="relative flex-1 flex w-full h-full overflow-hidden min-h-0 pt-14 pb-4">
        <main className="relative flex-1 h-full flex items-center justify-center group/stage overscroll-none touch-pan-x min-w-0 overflow-hidden select-none">
          
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
              flipPrev();
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
              flipNext();
            }}
            className="absolute right-3 sm:right-5 top-1/2 -translate-y-1/2 z-20 w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-neutral-900/80 hover:bg-neutral-800 backdrop-blur-md border border-neutral-700 hover:border-amber-500/60 text-neutral-300 hover:text-white shadow-2xl flex items-center justify-center transition-all duration-200 opacity-60 hover:opacity-100 sm:opacity-0 sm:group-hover/stage:opacity-80 sm:hover:!opacity-100 hover:scale-110 active:scale-95 cursor-pointer select-none"
            title={t('nextPageTitle')}
            aria-label={t('nextPageTitle')}
          >
            <ChevronRight className="w-6 h-6 sm:w-7 sm:h-7 text-neutral-300 hover:text-amber-400 transition-colors" />
          </button>

          {/* Expanded Document Viewport */}
          <div className="w-full h-full px-14 sm:px-20 py-2 flex flex-col overflow-hidden">
            <div 
              ref={viewerRef} 
              className="flex-1 w-full h-full overflow-hidden select-none" 
            />
          </div>
        </main>

        {/* Toggleable Right Comments & Highlights Drawer */}
        <CommentsDrawer
          annotations={annotations}
          isOpen={commentsDrawerOpen}
          onClose={() => {
            setCommentsDrawerOpen(false);
            setTimeout(() => {
              renditionRef.current?.resize();
            }, 150);
          }}
          onJumpToAnnotation={handleJumpToAnnotation}
          onUpdateComment={handleUpdateComment}
          onDeleteAnnotation={handleDeleteAnnotation}
        />
      </div>

      {/* Floating Context Menu for Text Selection */}
      {selectionMenu.isOpen && (
        <TextSelectionMenu
          x={selectionMenu.x}
          y={selectionMenu.y}
          selectedText={selectionMenu.text}
          onHighlight={handleCreateHighlight}
          onClose={() => setSelectionMenu({ isOpen: false, x: 0, y: 0, text: '', cfi: null })}
        />
      )}

      {/* Floating Bottom Progress Indicator (Always subtle at bottom edge) */}
      <footer className={`fixed bottom-0 inset-x-0 h-1.5 z-30 pointer-events-none ${
        theme === 'dark' ? 'bg-black/60' : theme === 'sepia' ? 'bg-[#d8c5a0]/40' : 'bg-neutral-300/40'
      }`}>
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
