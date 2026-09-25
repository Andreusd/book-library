import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { 
  ArrowLeft, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, 
  Maximize2, Minimize2, Moon, Sun, ListTree,
  MessageSquare, Heart, Settings, SlidersHorizontal, X,
  PanelTopClose, PanelTopOpen, RotateCcw, StretchHorizontal, BookOpen
} from 'lucide-react';
import PdfOutline from './PdfOutline';
import PdfPageView, { getDualPageSpread, getNextSpreadPage, getPrevSpreadPage } from './PdfPageView';
import TextSelectionMenu from './TextSelectionMenu';
import CommentsDrawer from './CommentsDrawer';
import EpubViewer from './EpubViewer';
import { useI18n } from '../i18n';
import 'pdfjs-dist/web/pdf_viewer.css';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

/**
 * Lightweight link service to handle PDF internal links (e.g. Table of Contents)
 * and external hyperlinks.
 */
class SimpleLinkService {
  constructor() {
    this.pdfDoc = null;
    this.onNavigate = null;
  }

  setDocument(pdfDoc) {
    this.pdfDoc = pdfDoc;
  }

  setNavigate(onNavigate) {
    this.onNavigate = onNavigate;
  }

  getDestinationHash(dest) {
    return '#';
  }

  getAnchorUrl(hash) {
    return hash || '#';
  }

  setHash(hash) {}

  executeNamedAction(action) {
    if (!this.onNavigate) return;
    if (action === 'NextPage') {
      this.onNavigate('next');
    } else if (action === 'PrevPage') {
      this.onNavigate('prev');
    } else if (action === 'FirstPage') {
      this.onNavigate(1);
    } else if (action === 'LastPage' && this.pdfDoc) {
      this.onNavigate(this.pdfDoc.numPages);
    }
  }

  addLinkAttributes(link, url, newWindow = true) {
    link.href = url;
    link.target = newWindow ? '_blank' : '_self';
    link.rel = 'noopener noreferrer nofollow';
  }

  async goToDestination(dest) {
    if (!this.pdfDoc || !this.onNavigate) return;
    try {
      let explicitDest = dest;
      if (typeof dest === 'string') {
        explicitDest = await this.pdfDoc.getDestination(dest);
      }
      if (!explicitDest) return;

      const destRef = explicitDest[0];
      let pageIndex = -1;
      if (typeof destRef === 'object' && destRef !== null) {
        pageIndex = await this.pdfDoc.getPageIndex(destRef);
      } else if (typeof destRef === 'number') {
        pageIndex = destRef;
      }

      if (typeof pageIndex === 'number' && pageIndex >= 0) {
        this.onNavigate(pageIndex + 1);
      }
    } catch (e) {
      console.error('Failed to navigate to destination:', e);
    }
  }
}

export default function Reader({ 
  book, 
  onClose, 
  onProgressUpdate, 
  onToggleFavorite, 
  isFavorite 
}) {
  const isEpub = book?.format === 'epub' || book?.filename?.toLowerCase().endsWith('.epub');

  if (isEpub) {
    return (
      <EpubViewer
        book={book}
        onClose={onClose}
        onProgressUpdate={onProgressUpdate}
        onToggleFavorite={onToggleFavorite}
        isFavorite={isFavorite}
      />
    );
  }

  const { t } = useI18n();
  const [favState, setFavState] = useState(isFavorite !== undefined ? isFavorite : Boolean(book.is_favorite));
  const [pdfDoc, setPdfDoc] = useState(null);
  const [currentPage, setCurrentPage] = useState(book.progress?.page || 1);
  const [totalPages, setTotalPages] = useState(book.progress?.total_pages || 1);

  const getInitialZoom = () => {
    try {
      const localZoom = localStorage.getItem(`book_zoom_${book.id}`);
      if (localZoom) {
        const parsed = parseFloat(localZoom);
        if (!isNaN(parsed) && parsed >= 0.4 && parsed <= 3.5) {
          return parsed;
        }
      }
    } catch (e) {}

    if (book.progress?.zoom) {
      const z = parseFloat(book.progress.zoom);
      if (!isNaN(z) && z >= 0.4 && z <= 3.5) {
        return z;
      }
    }
    return 1.2;
  };

  const getInitialInvertColors = () => {
    try {
      const localInvert = localStorage.getItem(`book_invert_${book.id}`);
      if (localInvert !== null) {
        return localInvert === 'true';
      }
    } catch (e) {}

    if (book.progress?.invert_colors !== undefined) {
      return Boolean(book.progress.invert_colors);
    }
    return false;
  };

  const [scale, setScale] = useState(getInitialZoom);
  const [loading, setLoading] = useState(true);
  const [invertColors, setInvertColors] = useState(getInitialInvertColors);
  const [pageInput, setPageInput] = useState(String(book.progress?.page || 1));
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
  const [outline, setOutline] = useState([]);
  const [hasOutline, setHasOutline] = useState(false);
  const [outlineOpen, setOutlineOpen] = useState(false);
  const [annotations, setAnnotations] = useState([]);
  const [commentsDrawerOpen, setCommentsDrawerOpen] = useState(false);
  const [selectionMenu, setSelectionMenu] = useState({
    isOpen: false,
    x: 0,
    y: 0,
    text: '',
    rects: [],
    page: 1,
  });

  const [readerSettingsOpen, setReaderSettingsOpen] = useState(false);
  const [trackpadSwipeEnabled, setTrackpadSwipeEnabled] = useState(() => {
    try {
      return localStorage.getItem('reader_trackpad_swipe') !== 'false';
    } catch (e) {
      return true;
    }
  });
  const [floatingButtonsEnabled, setFloatingButtonsEnabled] = useState(() => {
    try {
      return localStorage.getItem('reader_floating_buttons') !== 'false';
    } catch (e) {
      return true;
    }
  });
  const [upDownFlipEnabled, setUpDownFlipEnabled] = useState(() => {
    try {
      return localStorage.getItem('reader_up_down_flip') === 'true'; // false by default
    } catch (e) {
      return false;
    }
  });
  const [isDualPage, setIsDualPage] = useState(() => {
    try {
      return localStorage.getItem('reader_dual_page') === 'true';
    } catch (e) {
      return false;
    }
  });
  const [dualCoverStandalone, setDualCoverStandalone] = useState(() => {
    try {
      return localStorage.getItem('reader_dual_cover') === 'true';
    } catch (e) {
      return false;
    }
  });

  const toggleTrackpadSwipe = () => {
    setTrackpadSwipeEnabled(prev => {
      const next = !prev;
      try {
        localStorage.setItem('reader_trackpad_swipe', String(next));
      } catch (e) {}
      return next;
    });
  };

  const toggleFloatingButtons = () => {
    setFloatingButtonsEnabled(prev => {
      const next = !prev;
      try {
        localStorage.setItem('reader_floating_buttons', String(next));
      } catch (e) {}
      return next;
    });
  };

  const toggleUpDownFlip = () => {
    setUpDownFlipEnabled(prev => {
      const next = !prev;
      try {
        localStorage.setItem('reader_up_down_flip', String(next));
      } catch (e) {}
      return next;
    });
  };

  // Header auto-hide / pin state
  const [headerEnabled, setHeaderEnabled] = useState(() => {
    try {
      return localStorage.getItem('reader_header_enabled') !== 'false';
    } catch (e) {
      return true;
    }
  });
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);

  const isHeaderVisibleRef = useRef(true);
  const hideTimerRef = useRef(null);
  const isMouseOverHeaderRef = useRef(false);
  const readerSettingsOpenRef = useRef(readerSettingsOpen);
  const commentsDrawerOpenRef = useRef(commentsDrawerOpen);
  const outlineOpenRef = useRef(outlineOpen);

  useEffect(() => {
    isHeaderVisibleRef.current = isHeaderVisible;
  }, [isHeaderVisible]);

  useEffect(() => {
    readerSettingsOpenRef.current = readerSettingsOpen;
  }, [readerSettingsOpen]);

  useEffect(() => {
    commentsDrawerOpenRef.current = commentsDrawerOpen;
  }, [commentsDrawerOpen]);

  useEffect(() => {
    outlineOpenRef.current = outlineOpen;
  }, [outlineOpen]);

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
        readerSettingsOpenRef.current ||
        commentsDrawerOpenRef.current ||
        outlineOpenRef.current
      ) {
        return;
      }
      setIsHeaderVisible(false);
      isHeaderVisibleRef.current = false;
      hideTimerRef.current = null;
    }, delay);
  }, [clearHideTimer]);

  const toggleHeaderEnabled = useCallback(() => {
    setHeaderEnabled(prev => {
      const next = !prev;
      try {
        localStorage.setItem('reader_header_enabled', String(next));
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
    if (headerEnabled) {
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
          !readerSettingsOpenRef.current &&
          !commentsDrawerOpenRef.current &&
          !outlineOpenRef.current
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
  }, [headerEnabled, showHeader, startHideTimer, clearHideTimer]);

  const isHeaderShowing = headerEnabled || isHeaderVisible || readerSettingsOpen || commentsDrawerOpen || outlineOpen;


  const containerRef = useRef(null);
  const linkServiceRef = useRef(new SimpleLinkService());
  const onProgressUpdateRef = useRef(onProgressUpdate);
  const scaleRef = useRef(scale);
  const invertColorsRef = useRef(invertColors);
  const lastWheelTimeRef = useRef(0);
  const lastSwipeTimeRef = useRef(0);
  const accumulatedDeltaXRef = useRef(0);
  const clearSwipeTimerRef = useRef(null);

  // Dual page spread calculation
  const spread = useMemo(() => {
    return getDualPageSpread(currentPage, totalPages, dualCoverStandalone);
  }, [currentPage, totalPages, dualCoverStandalone]);

  const hasPrev = isDualPage ? spread.currentBase > 1 : currentPage > 1;
  const hasNext = isDualPage 
    ? (dualCoverStandalone && spread.currentBase === 1 ? totalPages > 1 : spread.currentBase + 2 <= totalPages)
    : currentPage < totalPages;

  // Fit Width
  const fitWidth = useCallback((forcedDual) => {
    if (!pdfDoc || !containerRef.current) return;
    const activeDual = forcedDual !== undefined ? forcedDual : isDualPage;
    pdfDoc.getPage(currentPage).then(page => {
      const vp = page.getViewport({ scale: 1 });
      const containerWidth = containerRef.current.clientWidth - 48;
      const targetScale = activeDual 
        ? Math.max(0.4, Math.min((containerWidth - 24) / (2 * vp.width), 2.5))
        : Math.max(0.5, Math.min(containerWidth / vp.width, 2.5));
      setScale(Number(targetScale.toFixed(2)));
    });
  }, [pdfDoc, currentPage, isDualPage]);

  const toggleDualPage = () => {
    setIsDualPage(prev => {
      const next = !prev;
      try {
        localStorage.setItem('reader_dual_page', String(next));
      } catch (e) {}
      if (next) {
        const sp = getDualPageSpread(currentPage, totalPages, dualCoverStandalone);
        setCurrentPage(sp.currentBase);
        setTimeout(() => fitWidth(true), 60);
      } else {
        setScale(1.2);
      }
      return next;
    });
  };

  const toggleDualCover = () => {
    setDualCoverStandalone(prev => {
      const next = !prev;
      try {
        localStorage.setItem('reader_dual_cover', String(next));
      } catch (e) {}
      if (isDualPage) {
        const sp = getDualPageSpread(currentPage, totalPages, next);
        setCurrentPage(sp.currentBase);
      }
      return next;
    });
  };

  const handleResetZoom = () => {
    if (isDualPage) {
      fitWidth();
    } else {
      setScale(1.2);
    }
  };

  useEffect(() => {
    scaleRef.current = scale;
  }, [scale]);

  useEffect(() => {
    invertColorsRef.current = invertColors;
  }, [invertColors]);

  useEffect(() => {
    onProgressUpdateRef.current = onProgressUpdate;
  }, [onProgressUpdate]);

  useEffect(() => {
    if (isFavorite !== undefined) {
      setFavState(isFavorite);
    }
  }, [isFavorite]);

  // Lock body/html scroll and overscroll-behavior while Reader is mounted
  // to prevent background scroll leaks and browser back/forward swipe navigation gestures
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

  // Page Navigation handlers
  const goToNextPage = useCallback(() => {
    if (!isDualPage) {
      setCurrentPage(prev => (prev < totalPages ? prev + 1 : prev));
    } else {
      setCurrentPage(prev => getNextSpreadPage(prev, totalPages, dualCoverStandalone));
    }
  }, [isDualPage, totalPages, dualCoverStandalone]);

  const goToPrevPage = useCallback(() => {
    if (!isDualPage) {
      setCurrentPage(prev => (prev > 1 ? prev - 1 : prev));
    } else {
      setCurrentPage(prev => getPrevSpreadPage(prev, totalPages, dualCoverStandalone));
    }
  }, [isDualPage, totalPages, dualCoverStandalone]);

  // Configure link service
  const handleLinkNavigate = useCallback((target) => {
    if (target === 'next') {
      goToNextPage();
    } else if (target === 'prev') {
      goToPrevPage();
    } else if (typeof target === 'number') {
      const targetPage = Math.min(Math.max(1, target), totalPages);
      if (isDualPage) {
        const sp = getDualPageSpread(targetPage, totalPages, dualCoverStandalone);
        setCurrentPage(sp.currentBase);
      } else {
        setCurrentPage(targetPage);
      }
    }
  }, [goToNextPage, goToPrevPage, totalPages, isDualPage, dualCoverStandalone]);

  // Handle PDF index/outline item click
  const handleOutlineClick = useCallback((item) => {
    if (item.url) {
      window.open(item.url, '_blank', 'noopener,noreferrer');
    } else if (item.dest) {
      linkServiceRef.current.goToDestination(item.dest);
    }
    if (window.innerWidth < 768) {
      setOutlineOpen(false);
    }
  }, []);

  useEffect(() => {
    linkServiceRef.current.setNavigate(handleLinkNavigate);
  }, [handleLinkNavigate]);

  useEffect(() => {
    if (pdfDoc) {
      linkServiceRef.current.setDocument(pdfDoc);
    }
  }, [pdfDoc]);

  // Load PDF Document
  useEffect(() => {
    let active = true;
    setLoading(true);

    const loadingTask = pdfjsLib.getDocument({
      url: `/api/pdf/${book.id}`,
      cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.0.379/cmaps/',
      cMapPacked: true,
    });

    loadingTask.promise.then(
      (doc) => {
        if (!active) return;
        setPdfDoc(doc);
        setTotalPages(doc.numPages);
        const startPage = Math.min(Math.max(1, book.progress?.page || 1), doc.numPages);
        setCurrentPage(startPage);
        setPageInput(String(startPage));
        setLoading(false);

        // Fetch PDF Index / Table of Contents if available
        doc.getOutline().then((outlineData) => {
          if (!active) return;
          if (Array.isArray(outlineData) && outlineData.length > 0) {
            setOutline(outlineData);
            setHasOutline(true);
          } else {
            setOutline([]);
            setHasOutline(false);
          }
        }).catch(() => {
          if (active) {
            setOutline([]);
            setHasOutline(false);
          }
        });
      },
      (error) => {
        if (!active) return;
        console.error('Error loading PDF:', error);
        setLoading(false);
      }
    );

    return () => {
      active = false;
      loadingTask.destroy();
    };
  }, [book.id]);

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

  // Text selection context menu handler
  const handleTextContextMenu = (e) => {
    const selection = window.getSelection();
    const text = selection ? selection.toString().trim() : '';
    if (!text || selection.rangeCount === 0) return;

    const pageEl = e.target.closest('[data-pdf-page]');
    if (!pageEl) return;

    const pageNumber = parseInt(pageEl.getAttribute('data-pdf-page'), 10);
    if (!pageNumber) return;

    const range = selection.getRangeAt(0);
    const wrapperRect = pageEl.getBoundingClientRect();
    const clientRects = Array.from(range.getClientRects());
    if (clientRects.length === 0) return;

    // Intercept default browser context menu
    e.preventDefault();

    const rects = clientRects.map(r => ({
      xPct: Math.max(0, (r.left - wrapperRect.left) / wrapperRect.width),
      yPct: Math.max(0, (r.top - wrapperRect.top) / wrapperRect.height),
      wPct: Math.min(1, r.width / wrapperRect.width),
      hPct: Math.min(1, r.height / wrapperRect.height),
    })).filter(r => r.wPct > 0.002 && r.hPct > 0.002);

    if (rects.length === 0) return;

    setSelectionMenu({
      isOpen: true,
      x: e.clientX,
      y: e.clientY,
      text: text,
      rects: rects,
      page: pageNumber,
    });
  };

  // Create new highlight or comment
  const handleCreateHighlight = (color, comment = '') => {
    if (!selectionMenu.text || selectionMenu.rects.length === 0) return;

    const payload = {
      book_id: book.id,
      page: selectionMenu.page,
      text: selectionMenu.text,
      color: color,
      comment: comment,
      rects: selectionMenu.rects,
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
      }
    })
    .catch(err => console.error('Failed to create annotation:', err));

    window.getSelection()?.removeAllRanges();
    setSelectionMenu({ isOpen: false, x: 0, y: 0, text: '', rects: [], page: 1 });
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
    fetch(`/api/annotations/${book.id}/${annotationId}`, {
      method: 'DELETE',
    })
    .then(r => r.json())
    .then(data => {
      if (data.status === 'ok') {
        setAnnotations(prev => prev.filter(a => a.id !== annotationId));
      }
    })
    .catch(err => console.error('Failed to delete annotation:', err));
  };

  // Jump directly to an annotation's page
  const handleJumpToAnnotation = (ann) => {
    if (ann.page) {
      if (isDualPage) {
        const sp = getDualPageSpread(ann.page, totalPages, dualCoverStandalone);
        setCurrentPage(sp.currentBase);
      } else {
        setCurrentPage(ann.page);
      }
    }
    if (window.innerWidth < 768) {
      setCommentsDrawerOpen(false);
    }
  };

  // Save Progress to Backend
  const saveProgress = useCallback((page, total) => {
    if (!page || !total) return;
    fetch('/api/progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        book_id: book.id,
        page: page,
        total_pages: total,
        zoom: scaleRef.current,
        invert_colors: invertColorsRef.current
      })
    })
    .then(r => r.json())
    .then(data => {
      if (onProgressUpdateRef.current && data.progress) {
        onProgressUpdateRef.current(book.id, data.progress);
      }
    })
    .catch(err => console.error('Failed to save progress:', err));
  }, [book.id]);

  // Scroll back to top on page change
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
  }, [currentPage]);

  // Compute text for page input display (e.g. "1-2" in dual mode)
  const getPageDisplayText = useCallback((page) => {
    if (!isDualPage) return String(page);
    const sp = getDualPageSpread(page, totalPages, dualCoverStandalone);
    if (sp.left && sp.right) {
      return `${sp.left}-${sp.right}`;
    }
    return String(sp.left || sp.right || page);
  }, [isDualPage, totalPages, dualCoverStandalone]);

  // Keep pageInput synced with current page or spread
  useEffect(() => {
    setPageInput(getPageDisplayText(currentPage));
  }, [currentPage, getPageDisplayText]);

  // Persist progress to backend with debounce (only when progressed past page 1)
  useEffect(() => {
    if (!pdfDoc || totalPages < 1) return;
    if (currentPage <= 1) return;
    const timer = setTimeout(() => {
      saveProgress(currentPage, totalPages);
    }, 400);
    return () => clearTimeout(timer);
  }, [pdfDoc, currentPage, totalPages, saveProgress]);

  // Persist zoom level to localStorage and backend with debounce
  useEffect(() => {
    if (!pdfDoc) return;
    try {
      localStorage.setItem(`book_zoom_${book.id}`, String(scale));
    } catch (e) {}

    const timer = setTimeout(() => {
      fetch('/api/book/zoom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          book_id: book.id,
          zoom: scale
        })
      }).catch(err => console.error('Failed to save zoom:', err));
    }, 500);

    return () => clearTimeout(timer);
  }, [book.id, scale, pdfDoc]);

  // Persist night reading mode (invertColors) to localStorage and backend with debounce
  useEffect(() => {
    if (!pdfDoc) return;
    try {
      localStorage.setItem(`book_invert_${book.id}`, String(invertColors));
    } catch (e) {}

    const timer = setTimeout(() => {
      fetch('/api/book/night-mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          book_id: book.id,
          invert_colors: invertColors
        })
      }).catch(err => console.error('Failed to save night mode:', err));
    }, 500);

    return () => clearTimeout(timer);
  }, [book.id, invertColors, pdfDoc]);

  const handlePageSubmit = (e) => {
    e.preventDefault();
    const match = pageInput.trim().match(/^\d+/);
    const num = match ? parseInt(match[0], 10) : NaN;
    if (!isNaN(num) && num >= 1 && num <= totalPages) {
      if (isDualPage) {
        const sp = getDualPageSpread(num, totalPages, dualCoverStandalone);
        setCurrentPage(sp.currentBase);
      } else {
        setCurrentPage(num);
      }
    } else {
      setPageInput(getPageDisplayText(currentPage));
    }
  };

  const handleToggleFav = () => {
    fetch('/api/favorites/toggle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ book_id: book.id })
    })
    .then(r => r.json())
    .then(data => {
      if (data.status === 'ok') {
        setFavState(data.is_favorite);
        if (onToggleFavorite) onToggleFavorite(book);
      }
    })
    .catch(err => console.error('Failed to toggle favorite:', err));
  };

  // Keyboard navigation & smart scrolling
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      const container = containerRef.current;
      const isScrollable = container && container.scrollHeight > container.clientHeight + 10;

      if (e.key === 'ArrowRight') {
        goToNextPage();
      } else if (e.key === 'ArrowLeft') {
        goToPrevPage();
      } else if (e.key === 'PageDown' || e.key === ' ') {
        e.preventDefault();
        if (isScrollable) {
          const atBottom = container.scrollTop + container.clientHeight >= container.scrollHeight - 30;
          if (atBottom) {
            goToNextPage();
          } else {
            container.scrollBy({ top: container.clientHeight * 0.8, behavior: 'smooth' });
          }
        } else {
          goToNextPage();
        }
      } else if (e.key === 'PageUp') {
        e.preventDefault();
        if (isScrollable) {
          const atTop = container.scrollTop <= 30;
          if (atTop) {
            goToPrevPage();
          } else {
            container.scrollBy({ top: -container.clientHeight * 0.8, behavior: 'smooth' });
          }
        } else {
          goToPrevPage();
        }
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (upDownFlipEnabled) {
          if (isScrollable) {
            const atBottom = container.scrollTop + container.clientHeight >= container.scrollHeight - 10;
            if (atBottom) {
              goToNextPage();
            } else {
              container.scrollBy({ top: 120, behavior: 'smooth' });
            }
          } else {
            goToNextPage();
          }
        } else {
          if (container) {
            container.scrollBy({ top: 120, behavior: 'smooth' });
          }
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (upDownFlipEnabled) {
          if (isScrollable) {
            const atTop = container.scrollTop <= 10;
            if (atTop) {
              goToPrevPage();
            } else {
              container.scrollBy({ top: -120, behavior: 'smooth' });
            }
          } else {
            goToPrevPage();
          }
        } else {
          if (container) {
            container.scrollBy({ top: -120, behavior: 'smooth' });
          }
        }
      } else if (e.key === 'Escape') {
        onClose();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === '=' || e.key === '+' || e.key === 'Add')) {
        e.preventDefault();
        setScale(s => Math.min(3.5, Number((s + 0.15).toFixed(2))));
      } else if ((e.ctrlKey || e.metaKey) && (e.key === '-' || e.key === 'Subtract')) {
        e.preventDefault();
        setScale(s => Math.max(0.5, Number((s - 0.15).toFixed(2))));
      } else if ((e.ctrlKey || e.metaKey) && e.key === '0') {
        e.preventDefault();
        setScale(1.2);
      } else if (e.key === '+' || e.key === '=') {
        setScale(s => Math.min(3.5, Number((s + 0.15).toFixed(2))));
      } else if (e.key === '-') {
        setScale(s => Math.max(0.5, Number((s - 0.15).toFixed(2))));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToNextPage, goToPrevPage, onClose, upDownFlipEnabled]);

  // Native wheel listener for smooth scrolling, edge-flipping, and Ctrl+Wheel PDF zoom
  useEffect(() => {
    const handleNativeWheel = (e) => {
      // Ctrl + Scroll Wheel (or Touchpad pinch gesture) -> Zoom PDF viewer
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        if (e.deltaY < 0) {
          // Wheel Up -> Zoom In
          setScale(s => Math.min(3.5, Number((s + 0.1).toFixed(2))));
        } else if (e.deltaY > 0) {
          // Wheel Down -> Zoom Out
          setScale(s => Math.max(0.5, Number((s - 0.1).toFixed(2))));
        }
        return;
      }

      const container = containerRef.current;
      if (!container) return;

      // 1. Two-finger horizontal trackpad swipe to flip pages
      const absX = Math.abs(e.deltaX);
      const absY = Math.abs(e.deltaY);

      if (absX > absY && absX > 2) {
        const isHorizScrollable = container.scrollWidth > container.clientWidth + 10;
        const atRightEdge = container.scrollLeft + container.clientWidth >= container.scrollWidth - 10;
        const atLeftEdge = container.scrollLeft <= 10;

        // Block Chrome/Edge browser back/forward swipe gesture immediately on every horizontal event
        if (!isHorizScrollable || (e.deltaX > 0 && atRightEdge) || (e.deltaX < 0 && atLeftEdge)) {
          e.preventDefault();
        }

        if (trackpadSwipeEnabled) {
          const now = Date.now();
          if (now - lastSwipeTimeRef.current > 350) {
            accumulatedDeltaXRef.current += e.deltaX;

            if (clearSwipeTimerRef.current) clearTimeout(clearSwipeTimerRef.current);
            clearSwipeTimerRef.current = setTimeout(() => {
              accumulatedDeltaXRef.current = 0;
            }, 150);

            if (Math.abs(accumulatedDeltaXRef.current) > 28) {
              if (!isHorizScrollable || (accumulatedDeltaXRef.current > 0 && atRightEdge) || (accumulatedDeltaXRef.current < 0 && atLeftEdge)) {
                lastSwipeTimeRef.current = now;
                const dir = accumulatedDeltaXRef.current;
                accumulatedDeltaXRef.current = 0;
                if (dir > 0) {
                  goToNextPage();
                } else {
                  goToPrevPage();
                }
                return;
              }
            }
          }
        }
        return;
      }

      // 2. Normal Wheel on non-scrollable page to flip pages
      const isScrollable = container.scrollHeight > container.clientHeight + 10;
      if (!isScrollable) {
        const now = Date.now();
        if (now - lastWheelTimeRef.current < 450) return;

        if (e.deltaY > 25) {
          lastWheelTimeRef.current = now;
          goToNextPage();
        } else if (e.deltaY < -25) {
          lastWheelTimeRef.current = now;
          goToPrevPage();
        }
      }
    };

    window.addEventListener('wheel', handleNativeWheel, { passive: false });
    return () => {
      window.removeEventListener('wheel', handleNativeWheel);
    };
  }, [goToNextPage, goToPrevPage, trackpadSwipeEnabled]);

  // Toggle fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => console.log(err));
    } else {
      document.exitFullscreen().catch(err => console.log(err));
    }
  };

  const currentProgressPage = isDualPage && spread.right ? spread.right : currentPage;
  const progressPercent = totalPages > 0 ? Math.round((currentProgressPage / totalPages) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-neutral-950 text-neutral-100 overflow-hidden overscroll-none touch-pan-y">
      {/* Top Header / Toolbar */}
      <header 
        onMouseEnter={() => {
          isMouseOverHeaderRef.current = true;
          clearHideTimer();
        }}
        onMouseLeave={() => {
          isMouseOverHeaderRef.current = false;
          if (!headerEnabled && !readerSettingsOpen && !commentsDrawerOpen && !outlineOpen) {
            startHideTimer(3000, true);
          }
        }}
        className={`h-14 px-4 bg-neutral-900 border-b border-neutral-800 flex items-center justify-between z-30 select-none transition-all duration-300 ease-in-out ${
          headerEnabled 
            ? 'relative shrink-0 translate-y-0 opacity-100 pointer-events-auto' 
            : `fixed top-0 left-0 right-0 shadow-2xl shadow-black/80 ${
                isHeaderShowing 
                  ? 'translate-y-0 opacity-100 pointer-events-auto' 
                  : '-translate-y-full opacity-0 pointer-events-none'
              }`
        }`}
      >
        {/* Left: Navigation & Book Title */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 max-w-[calc(50%-90px)] sm:max-w-[calc(50%-110px)] md:max-w-[calc(50%-130px)] z-10">
          <button 
            onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-800/80 hover:bg-neutral-700 text-neutral-300 hover:text-white transition text-sm font-medium shrink-0"
            title={t('backToLibraryTitle')}
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">{t('backToLibrary')}</span>
          </button>

          {/* Toggle PDF Index / Table of Contents Button (if available) */}
          {hasOutline && (
            <button
              onClick={() => setOutlineOpen(prev => !prev)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition shrink-0 ${
                outlineOpen
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : 'bg-neutral-800/80 hover:bg-neutral-700 text-neutral-300 hover:text-white'
              }`}
              title={outlineOpen ? t('hideIndex') : t('showIndex')}
            >
              <ListTree className="w-4 h-4 text-amber-400" />
              <span className="hidden md:inline">{t('index')}</span>
            </button>
          )}
          
          <div className="h-4 w-px bg-neutral-700 mx-0.5 hidden sm:block shrink-0" />

          <div className="min-w-0 flex-1">
            <h1 className="text-sm font-semibold truncate text-neutral-100" title={book.title}>
              {book.title}
            </h1>
            <p className="text-xs text-neutral-400 truncate">
              {book.shelf_display} • {book.size_formatted}
            </p>
          </div>
        </div>

        {/* Center Page Controls - Always Centralized */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-2 z-10">
          <button 
            onClick={goToPrevPage}
            disabled={!hasPrev}
            className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 disabled:opacity-30 disabled:hover:bg-neutral-800 transition cursor-pointer"
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
              className="w-16 text-center py-1 bg-neutral-950 border border-neutral-700 rounded text-neutral-200 focus:border-amber-500 focus:outline-none"
            />
            <span className="text-neutral-400 mx-1.5">/</span>
            <span className="text-neutral-400">{totalPages}</span>
          </form>

          <button 
            onClick={goToNextPage}
            disabled={!hasNext}
            className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 disabled:opacity-30 disabled:hover:bg-neutral-800 transition cursor-pointer"
            title={t('nextPageTitle')}
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <span className="text-xs font-medium text-amber-400 ml-1 hidden md:inline-block">
            {progressPercent}%
          </span>
        </div>

        {/* Right Tools */}
        <div className="flex items-center gap-1.5 ml-auto z-10">
          {/* Zoom controls */}
          <button 
            onClick={() => setScale(s => Math.max(0.4, Number((s - 0.15).toFixed(2))))}
            className="p-1.5 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 transition cursor-pointer"
            title={t('zoomOutTitle')}
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          
          <button 
            onClick={handleResetZoom}
            className="p-1.5 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 transition cursor-pointer hidden sm:inline-block"
            title={t('resetWidthTitle')}
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button 
            onClick={() => fitWidth()}
            className="p-1.5 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 transition cursor-pointer hidden sm:inline-block"
            title={t('fitWidth')}
          >
            <StretchHorizontal className="w-4 h-4" />
          </button>

          {/* Toggle Dual Page View */}
          <button 
            onClick={toggleDualPage}
            className={`p-1.5 rounded-lg transition cursor-pointer hidden md:inline-block ${
              isDualPage 
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' 
                : 'hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200'
            }`}
            title={isDualPage ? t('singlePageMode') : t('dualPageMode')}
          >
            <BookOpen className="w-4 h-4" />
          </button>

          <button 
            onClick={() => setScale(s => Math.min(3.5, Number((s + 0.15).toFixed(2))))}
            className="p-1.5 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 transition cursor-pointer"
            title={t('zoomInTitle')}
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          <div className="h-4 w-px bg-neutral-700 mx-1 hidden sm:block" />

          {/* Toggle Header Auto-Hide / Keep Header Visible */}
          <button 
            onClick={toggleHeaderEnabled}
            className={`p-1.5 rounded-lg transition cursor-pointer ${
              !headerEnabled 
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' 
                : 'hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200'
            }`}
            title={headerEnabled ? t('unpinHeaderTitle') : t('pinHeaderTitle')}
          >
            {headerEnabled ? (
              <PanelTopClose className="w-4 h-4" />
            ) : (
              <PanelTopOpen className="w-4 h-4" />
            )}
          </button>

          {/* Invert Dark / Light */}
          <button 
            onClick={() => setInvertColors(!invertColors)}
            className={`p-1.5 rounded-lg transition cursor-pointer ${
              invertColors 
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' 
                : 'hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200'
            }`}
            title={t('nightModeTitle')}
          >
            <Moon className="w-4 h-4" />
          </button>

          {/* Favorite Toggle */}
          <button 
            onClick={handleToggleFav}
            className={`p-1.5 rounded-lg transition cursor-pointer ${
              favState 
                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' 
                : 'hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200'
            }`}
            title={favState ? t('removeFromFavorites') : t('addToFavorites')}
          >
            <Heart className={`w-4 h-4 ${favState ? 'fill-rose-500 text-rose-500' : ''}`} />
          </button>

          {/* Comments & Highlights Drawer Toggle */}
          <button 
            onClick={() => setCommentsDrawerOpen(prev => !prev)}
            className={`p-1.5 rounded-lg transition cursor-pointer ${
              commentsDrawerOpen 
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' 
                : 'hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200'
            }`}
            title={commentsDrawerOpen ? t('hideComments') : (annotations.length > 0 ? `${t('showComments')} (${annotations.length})` : t('showComments'))}
          >
            <MessageSquare className="w-4 h-4 text-amber-400" />
          </button>

          {/* Fullscreen */}
          <button 
            onClick={toggleFullscreen}
            className="p-1.5 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 transition cursor-pointer"
            title={t('fullscreenTitle')}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Reader Settings Popover */}
          <div className="relative">
            <button 
              onClick={() => setReaderSettingsOpen(prev => !prev)}
              className={`p-1.5 rounded-lg transition cursor-pointer ${
                readerSettingsOpen 
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' 
                  : 'hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200'
              }`}
              title={t('readerSettings')}
            >
              <Settings className="w-4 h-4" />
            </button>

            {readerSettingsOpen && (
              <>
                <div 
                  className="fixed inset-0 z-40 bg-transparent" 
                  onClick={() => setReaderSettingsOpen(false)}
                />
                <div className="absolute right-0 top-full mt-2 w-72 sm:w-80 bg-neutral-900 border border-neutral-700 rounded-2xl shadow-2xl shadow-black/80 p-3.5 z-50 text-left select-none animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-neutral-800">
                    <div className="flex items-center gap-2">
                      <SlidersHorizontal className="w-4 h-4 text-amber-400" />
                      <h3 className="text-xs font-bold text-neutral-100 uppercase tracking-wider">{t('readerSettings')}</h3>
                    </div>
                    <button 
                      onClick={() => setReaderSettingsOpen(false)}
                      className="p-1 rounded-md text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="space-y-1.5">
                    {/* Toggle Trackpad Swipe */}
                    <label className="flex items-start justify-between gap-3 p-2.5 rounded-xl hover:bg-neutral-800/60 transition-colors cursor-pointer group">
                      <div className="min-w-0 flex-1">
                        <span className="text-xs font-semibold text-neutral-100 block group-hover:text-amber-300 transition-colors">
                          {t('trackpadSwipe')}
                        </span>
                        <span className="text-[11px] text-neutral-300 leading-snug block mt-0.5">
                          {t('trackpadSwipeDesc')}
                        </span>
                      </div>
                      <div className="relative inline-flex items-center cursor-pointer shrink-0 mt-0.5">
                        <input 
                          type="checkbox"
                          checked={trackpadSwipeEnabled}
                          onChange={toggleTrackpadSwipe}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-neutral-800 border border-neutral-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500 peer-checked:border-amber-500"></div>
                      </div>
                    </label>

                    {/* Toggle Floating Side Buttons */}
                    <label className="flex items-start justify-between gap-3 p-2.5 rounded-xl hover:bg-neutral-800/60 transition-colors cursor-pointer group">
                      <div className="min-w-0 flex-1">
                        <span className="text-xs font-semibold text-neutral-100 block group-hover:text-amber-300 transition-colors">
                          {t('floatingSideButtons')}
                        </span>
                        <span className="text-[11px] text-neutral-300 leading-snug block mt-0.5">
                          {t('floatingSideButtonsDesc')}
                        </span>
                      </div>
                      <div className="relative inline-flex items-center cursor-pointer shrink-0 mt-0.5">
                        <input 
                          type="checkbox"
                          checked={floatingButtonsEnabled}
                          onChange={toggleFloatingButtons}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-neutral-800 border border-neutral-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500 peer-checked:border-amber-500"></div>
                      </div>
                    </label>

                    {/* Toggle Up/Down Arrow Page Flip */}
                    <label className="flex items-start justify-between gap-3 p-2.5 rounded-xl hover:bg-neutral-800/60 transition-colors cursor-pointer group">
                      <div className="min-w-0 flex-1">
                        <span className="text-xs font-semibold text-neutral-100 block group-hover:text-amber-300 transition-colors">
                          {t('upDownPageFlip')}
                        </span>
                        <span className="text-[11px] text-neutral-300 leading-snug block mt-0.5">
                          {t('upDownPageFlipDesc')}
                        </span>
                      </div>
                      <div className="relative inline-flex items-center cursor-pointer shrink-0 mt-0.5">
                        <input 
                          type="checkbox"
                          checked={upDownFlipEnabled}
                          onChange={toggleUpDownFlip}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-neutral-800 border border-neutral-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500 peer-checked:border-amber-500"></div>
                      </div>
                    </label>

                    {/* Toggle Dual Page View */}
                    <label className="flex items-start justify-between gap-3 p-2.5 rounded-xl hover:bg-neutral-800/60 transition-colors cursor-pointer group">
                      <div className="min-w-0 flex-1">
                        <span className="text-xs font-semibold text-neutral-100 block group-hover:text-amber-300 transition-colors">
                          {t('dualPageSetting')}
                        </span>
                        <span className="text-[11px] text-neutral-300 leading-snug block mt-0.5">
                          {t('dualPageSettingDesc')}
                        </span>
                      </div>
                      <div className="relative inline-flex items-center cursor-pointer shrink-0 mt-0.5">
                        <input 
                          type="checkbox"
                          checked={isDualPage}
                          onChange={toggleDualPage}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-neutral-800 border border-neutral-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500 peer-checked:border-amber-500"></div>
                      </div>
                    </label>

                    {/* Toggle Cover Page Alone (when in dual page view) */}
                    {isDualPage && (
                      <label className="flex items-start justify-between gap-3 p-2.5 rounded-xl hover:bg-neutral-800/60 transition-colors cursor-pointer group pl-5 border-l-2 border-amber-500/40 ml-1">
                        <div className="min-w-0 flex-1">
                          <span className="text-xs font-semibold text-neutral-100 block group-hover:text-amber-300 transition-colors">
                            {t('dualCoverStandalone')}
                          </span>
                          <span className="text-[11px] text-neutral-300 leading-snug block mt-0.5">
                            {t('dualCoverStandaloneDesc')}
                          </span>
                        </div>
                        <div className="relative inline-flex items-center cursor-pointer shrink-0 mt-0.5">
                          <input 
                            type="checkbox"
                            checked={dualCoverStandalone}
                            onChange={toggleDualCover}
                            className="sr-only peer"
                          />
                          <div className="w-9 h-5 bg-neutral-800 border border-neutral-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500 peer-checked:border-amber-500"></div>
                        </div>
                      </label>
                    )}

                    {/* Toggle Auto-Hide Header */}
                    <label className="flex items-start justify-between gap-3 p-2.5 rounded-xl hover:bg-neutral-800/60 transition-colors cursor-pointer group">
                      <div className="min-w-0 flex-1">
                        <span className="text-xs font-semibold text-neutral-100 block group-hover:text-amber-300 transition-colors">
                          {t('autoHideHeader')}
                        </span>
                        <span className="text-[11px] text-neutral-300 leading-snug block mt-0.5">
                          {t('autoHideHeaderDesc')}
                        </span>
                      </div>
                      <div className="relative inline-flex items-center cursor-pointer shrink-0 mt-0.5">
                        <input 
                          type="checkbox"
                          checked={!headerEnabled}
                          onChange={toggleHeaderEnabled}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-neutral-800 border border-neutral-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500 peer-checked:border-amber-500"></div>
                      </div>
                    </label>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Reader Stage */}
      <div className="relative flex-1 flex overflow-hidden bg-neutral-900">
        {/* Toggleable Left Index / Table of Contents Drawer */}
        {hasOutline && (
          <PdfOutline
            outline={outline}
            isOpen={outlineOpen}
            onClose={() => setOutlineOpen(false)}
            onItemClick={handleOutlineClick}
          />
        )}

        {/* Document Area & Floating Navigation Stage */}
        <div className="relative flex-1 flex flex-col min-w-0 h-full overflow-hidden group/stage overscroll-none touch-pan-y">
          {/* Scrollable Document Container */}
          <div 
            ref={containerRef}
            tabIndex={0}
            onContextMenu={handleTextContextMenu}
            className="flex-1 overflow-y-auto overflow-x-auto p-4 sm:p-6 focus:outline-none scroll-smooth select-text overscroll-none touch-pan-y"
          >
            {loading ? (
              <div className="flex flex-col items-center justify-center h-full min-h-[400px] gap-3 text-neutral-400 select-none">
                <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-sm">{t('loadingBook')}</p>
              </div>
            ) : (
              <div className="min-h-full flex justify-center items-start">
                {isDualPage ? (
                  <div className="flex items-start justify-center shadow-2xl">
                    {spread.left && (
                      <PdfPageView
                        pdfDoc={pdfDoc}
                        pageNum={spread.left}
                        scale={scale}
                        invertColors={invertColors}
                        linkService={linkServiceRef.current}
                        annotations={annotations.filter(a => a.page === spread.left)}
                        onUpdateComment={handleUpdateComment}
                        onDeleteAnnotation={handleDeleteAnnotation}
                        pageSide={spread.right ? 'left' : 'single'}
                      />
                    )}
                    {spread.right && (
                      <PdfPageView
                        pdfDoc={pdfDoc}
                        pageNum={spread.right}
                        scale={scale}
                        invertColors={invertColors}
                        linkService={linkServiceRef.current}
                        annotations={annotations.filter(a => a.page === spread.right)}
                        onUpdateComment={handleUpdateComment}
                        onDeleteAnnotation={handleDeleteAnnotation}
                        pageSide={spread.left ? 'right' : 'single'}
                      />
                    )}
                  </div>
                ) : (
                  <PdfPageView
                    pdfDoc={pdfDoc}
                    pageNum={currentPage}
                    scale={scale}
                    invertColors={invertColors}
                    linkService={linkServiceRef.current}
                    annotations={annotations.filter(a => a.page === currentPage)}
                    onUpdateComment={handleUpdateComment}
                    onDeleteAnnotation={handleDeleteAnnotation}
                    pageSide="single"
                  />
                )}
              </div>
            )}
          </div>

          {/* Floating Left Navigation Button */}
          {floatingButtonsEnabled && hasPrev && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                goToPrevPage();
              }}
              className="absolute left-3 sm:left-5 top-1/2 -translate-y-1/2 z-20 w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-neutral-900/80 hover:bg-neutral-800 backdrop-blur-md border border-neutral-700 hover:border-amber-500/60 text-neutral-300 hover:text-white shadow-2xl flex items-center justify-center transition-all duration-200 opacity-60 hover:opacity-100 sm:opacity-0 sm:group-hover/stage:opacity-80 sm:hover:!opacity-100 hover:scale-110 active:scale-95 cursor-pointer select-none"
              title={t('prevPageTitle')}
              aria-label={t('prevPageTitle')}
            >
              <ChevronLeft className="w-6 h-6 sm:w-7 sm:h-7 text-neutral-300 hover:text-amber-400 transition-colors" />
            </button>
          )}

          {/* Floating Right Navigation Button */}
          {floatingButtonsEnabled && hasNext && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                goToNextPage();
              }}
              className="absolute right-3 sm:right-5 top-1/2 -translate-y-1/2 z-20 w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-neutral-900/80 hover:bg-neutral-800 backdrop-blur-md border border-neutral-700 hover:border-amber-500/60 text-neutral-300 hover:text-white shadow-2xl flex items-center justify-center transition-all duration-200 opacity-60 hover:opacity-100 sm:opacity-0 sm:group-hover/stage:opacity-80 sm:hover:!opacity-100 hover:scale-110 active:scale-95 cursor-pointer select-none"
              title={t('nextPageTitle')}
              aria-label={t('nextPageTitle')}
            >
              <ChevronRight className="w-6 h-6 sm:w-7 sm:h-7 text-neutral-300 hover:text-amber-400 transition-colors" />
            </button>
          )}
        </div>

        {/* Toggleable Right Comments & Highlights Drawer */}
        <CommentsDrawer
          annotations={annotations}
          isOpen={commentsDrawerOpen}
          onClose={() => setCommentsDrawerOpen(false)}
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
          onClose={() => setSelectionMenu({ isOpen: false, x: 0, y: 0, text: '', rects: [], page: 1 })}
        />
      )}

      {/* Bottom Progress Bar */}
      <div className="h-1 bg-neutral-950 w-full overflow-hidden select-none">
        <div 
          className="h-full bg-gradient-to-r from-amber-600 to-amber-400 transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
    </div>
  );
}
