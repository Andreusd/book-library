import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { 
  ArrowLeft, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, 
  Maximize2, Minimize2, Moon, Sun, ListTree,
  MessageSquare, Heart
} from 'lucide-react';
import PdfOutline from './PdfOutline';
import HighlightOverlay from './HighlightOverlay';
import TextSelectionMenu from './TextSelectionMenu';
import CommentsDrawer from './CommentsDrawer';
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
  const { t } = useI18n();
  const [favState, setFavState] = useState(isFavorite !== undefined ? isFavorite : Boolean(book.is_favorite));
  const [pdfDoc, setPdfDoc] = useState(null);
  const [currentPage, setCurrentPage] = useState(book.progress?.page || 1);
  const [totalPages, setTotalPages] = useState(book.progress?.total_pages || 1);
  const [pageDims, setPageDims] = useState({ width: 0, height: 0 });

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

  const [scale, setScale] = useState(getInitialZoom);
  const [loading, setLoading] = useState(true);
  const [rendering, setRendering] = useState(false);
  const [invertColors, setInvertColors] = useState(false);
  const [pageInput, setPageInput] = useState(String(book.progress?.page || 1));
  const [isFullscreen, setIsFullscreen] = useState(false);
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

  const canvasRef = useRef(null);
  const textLayerRef = useRef(null);
  const annotationLayerRef = useRef(null);
  const containerRef = useRef(null);
  const pageWrapperRef = useRef(null);
  const renderTaskRef = useRef(null);
  const textLayerInstanceRef = useRef(null);
  const annotationLayerInstanceRef = useRef(null);
  const linkServiceRef = useRef(new SimpleLinkService());
  const lastRenderedPageRef = useRef(null);
  const onProgressUpdateRef = useRef(onProgressUpdate);
  const scaleRef = useRef(scale);
  const lastWheelTimeRef = useRef(0);
  const lastSwipeTimeRef = useRef(0);

  useEffect(() => {
    scaleRef.current = scale;
  }, [scale]);

  useEffect(() => {
    onProgressUpdateRef.current = onProgressUpdate;
  }, [onProgressUpdate]);

  useEffect(() => {
    if (isFavorite !== undefined) {
      setFavState(isFavorite);
    }
  }, [isFavorite]);

  // Lock body/html scroll while Reader is mounted to prevent background library scrollbar from leaking
  useEffect(() => {
    const originalBodyOverflow = document.body.style.overflow;
    const originalHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalBodyOverflow;
      document.documentElement.style.overflow = originalHtmlOverflow;
    };
  }, []);

  // Page Navigation handlers
  const goToNextPage = useCallback(() => {
    setCurrentPage(prev => (prev < totalPages ? prev + 1 : prev));
  }, [totalPages]);

  const goToPrevPage = useCallback(() => {
    setCurrentPage(prev => (prev > 1 ? prev - 1 : prev));
  }, []);

  // Configure link service
  const handleLinkNavigate = useCallback((target) => {
    if (target === 'next') {
      goToNextPage();
    } else if (target === 'prev') {
      goToPrevPage();
    } else if (typeof target === 'number') {
      setCurrentPage(Math.min(Math.max(1, target), totalPages));
    }
  }, [goToNextPage, goToPrevPage, totalPages]);

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

    const range = selection.getRangeAt(0);
    const wrapper = pageWrapperRef.current;
    if (!wrapper) return;

    const wrapperRect = wrapper.getBoundingClientRect();
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
      page: currentPage,
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
    if (ann.page && ann.page !== currentPage) {
      setCurrentPage(ann.page);
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
        zoom: scaleRef.current
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

  // Render Page on Canvas, TextLayer and AnnotationLayer
  const renderPage = useCallback((pageNum) => {
    if (!pdfDoc || !canvasRef.current) return;

    // Cancel any in-flight rendering
    if (renderTaskRef.current) {
      try {
        renderTaskRef.current.cancel();
      } catch (e) {}
      renderTaskRef.current = null;
    }

    if (textLayerInstanceRef.current) {
      try {
        textLayerInstanceRef.current.cancel();
      } catch (e) {}
      textLayerInstanceRef.current = null;
    }

    if (textLayerRef.current) {
      textLayerRef.current.replaceChildren();
    }
    if (annotationLayerRef.current) {
      annotationLayerRef.current.replaceChildren();
    }

    setRendering(true);

    pdfDoc.getPage(pageNum).then(async (page) => {
      const viewport = page.getViewport({ scale });
      const canvas = canvasRef.current;
      if (!canvas) return;

      const vpWidth = Math.floor(viewport.width);
      const vpHeight = Math.floor(viewport.height);
      setPageDims({ width: vpWidth, height: vpHeight });

      const context = canvas.getContext('2d');
      const dpr = window.devicePixelRatio || 1;

      canvas.width = Math.floor(viewport.width * dpr);
      canvas.height = Math.floor(viewport.height * dpr);
      canvas.style.width = `${vpWidth}px`;
      canvas.style.height = `${vpHeight}px`;

      context.setTransform(dpr, 0, 0, dpr, 0, 0);

      const renderContext = {
        canvasContext: context,
        viewport: viewport,
      };

      const task = page.render(renderContext);
      renderTaskRef.current = task;

      try {
        await task.promise;
      } catch (err) {
        if (err?.name !== 'RenderingCancelledException') {
          console.error('Render error:', err);
        }
        setRendering(false);
        return;
      }

      renderTaskRef.current = null;
      setRendering(false);

      // Only scroll back to top if the page actually changed (not on zoom)
      if (lastRenderedPageRef.current !== pageNum) {
        lastRenderedPageRef.current = pageNum;
        if (containerRef.current) {
          containerRef.current.scrollTop = 0;
        }
      }

      // Render Text Layer for text selection & copying
      if (textLayerRef.current) {
        try {
          const textContent = await page.getTextContent();
          const textLayer = new pdfjsLib.TextLayer({
            textContentSource: textContent,
            container: textLayerRef.current,
            viewport: viewport,
          });
          textLayerInstanceRef.current = textLayer;
          await textLayer.render();
        } catch (err) {
          if (err?.name !== 'RenderingCancelledException') {
            console.error('TextLayer render error:', err);
          }
        }
      }

      // Render Annotation Layer for clickable links (internal TOC & external URLs)
      if (annotationLayerRef.current) {
        try {
          const annotations = await page.getAnnotations({ intent: 'display' });
          if (annotations && annotations.length > 0) {
            const annotationLayer = new pdfjsLib.AnnotationLayer({
              div: annotationLayerRef.current,
              page: page,
              viewport: viewport,
              linkService: linkServiceRef.current,
            });
            annotationLayerInstanceRef.current = annotationLayer;
            await annotationLayer.render({
              annotations: annotations,
              viewport: viewport,
            });
          }
        } catch (err) {
          console.error('AnnotationLayer render error:', err);
        }
      }
    }).catch(err => {
      console.error('Failed to get page:', err);
      setRendering(false);
    });
  }, [pdfDoc, scale]);

  // Render page when document, page number, or scale changes
  useEffect(() => {
    if (pdfDoc) {
      renderPage(currentPage);
      setPageInput(String(currentPage));
    }
  }, [pdfDoc, currentPage, scale, renderPage]);

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

  const handlePageSubmit = (e) => {
    e.preventDefault();
    const num = parseInt(pageInput, 10);
    if (!isNaN(num) && num >= 1 && num <= totalPages) {
      setCurrentPage(num);
    } else {
      setPageInput(String(currentPage));
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
        if (container) {
          container.scrollBy({ top: 120, behavior: 'smooth' });
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (container) {
          container.scrollBy({ top: -120, behavior: 'smooth' });
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
  }, [goToNextPage, goToPrevPage, onClose]);

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

      if (absX > 25 && absX > absY * 1.2) {
        const now = Date.now();
        if (now - lastSwipeTimeRef.current > 380) {
          const isHorizScrollable = container.scrollWidth > container.clientWidth + 10;
          if (!isHorizScrollable) {
            e.preventDefault();
            lastSwipeTimeRef.current = now;
            if (e.deltaX > 0) {
              goToNextPage();
            } else {
              goToPrevPage();
            }
            return;
          } else {
            const atRightEdge = container.scrollLeft + container.clientWidth >= container.scrollWidth - 15;
            const atLeftEdge = container.scrollLeft <= 15;
            if (e.deltaX > 0 && atRightEdge) {
              e.preventDefault();
              lastSwipeTimeRef.current = now;
              goToNextPage();
              return;
            } else if (e.deltaX < 0 && atLeftEdge) {
              e.preventDefault();
              lastSwipeTimeRef.current = now;
              goToPrevPage();
              return;
            }
          }
        } else {
          // Debounce active swipe to prevent browser back/forward navigation
          e.preventDefault();
          return;
        }
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
  }, [goToNextPage, goToPrevPage]);

  // Fit Width
  const fitWidth = () => {
    if (!pdfDoc || !containerRef.current) return;
    pdfDoc.getPage(currentPage).then(page => {
      const vp = page.getViewport({ scale: 1 });
      const containerWidth = containerRef.current.clientWidth - 48;
      const targetScale = containerWidth / vp.width;
      setScale(Math.max(0.5, Math.min(targetScale, 2.5)));
    });
  };

  // Toggle fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => console.log(err));
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(err => console.log(err));
      setIsFullscreen(false);
    }
  };

  const progressPercent = totalPages > 0 ? Math.round((currentPage / totalPages) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-neutral-950 text-neutral-100 overflow-hidden">
      {/* Top Header / Toolbar */}
      <header className="h-14 px-4 bg-neutral-900/90 backdrop-blur-md border-b border-neutral-850 flex items-center justify-between z-20 shrink-0 select-none">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button 
            onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-800/80 hover:bg-neutral-700 text-neutral-300 hover:text-white transition text-sm font-medium"
            title={t('backToLibraryTitle')}
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">{t('backToLibrary')}</span>
          </button>

          {/* Toggle PDF Index / Table of Contents Button (if available) */}
          {hasOutline && (
            <button
              onClick={() => setOutlineOpen(prev => !prev)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition ${
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
          
          <div className="h-4 w-px bg-neutral-700 mx-0.5 hidden sm:block" />

          <div className="min-w-0">
            <h1 className="text-sm font-semibold truncate text-neutral-100 max-w-xs sm:max-w-md md:max-w-lg">
              {book.title}
            </h1>
            <p className="text-xs text-neutral-400 truncate">
              {book.shelf_display} • {book.size_formatted}
            </p>
          </div>
        </div>

        {/* Center Page Controls */}
        <div className="flex items-center gap-2">
          <button 
            onClick={goToPrevPage}
            disabled={currentPage <= 1}
            className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 disabled:opacity-30 disabled:hover:bg-neutral-800 transition"
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
              className="w-12 text-center py-1 bg-neutral-950 border border-neutral-700 rounded text-neutral-200 focus:border-amber-500 focus:outline-none"
            />
            <span className="text-neutral-400 mx-1.5">/</span>
            <span className="text-neutral-400">{totalPages}</span>
          </form>

          <button 
            onClick={goToNextPage}
            disabled={currentPage >= totalPages}
            className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 disabled:opacity-30 disabled:hover:bg-neutral-800 transition"
            title={t('nextPageTitle')}
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <span className="text-xs font-medium text-amber-400 ml-1 hidden md:inline-block">
            {progressPercent}%
          </span>
        </div>

        {/* Right Tools */}
        <div className="flex items-center gap-1.5">
          {/* Zoom controls */}
          <button 
            onClick={() => setScale(s => Math.max(0.5, Number((s - 0.15).toFixed(2))))}
            className="p-1.5 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 transition"
            title={t('zoomOutTitle')}
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          
          <button 
            onClick={fitWidth}
            className="px-2 py-1 text-xs rounded bg-neutral-800/60 hover:bg-neutral-800 text-neutral-300 transition hidden sm:inline-block"
            title={t('fitWidth')}
          >
            {t('fitWidth')}
          </button>

          <button 
            onClick={() => setScale(s => Math.min(3.5, Number((s + 0.15).toFixed(2))))}
            className="p-1.5 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 transition"
            title={t('zoomInTitle')}
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          <div className="h-4 w-px bg-neutral-700 mx-1 hidden sm:block" />

          {/* Invert Dark / Light */}
          <button 
            onClick={() => setInvertColors(!invertColors)}
            className={`p-1.5 rounded-lg transition ${invertColors ? 'bg-amber-500/20 text-amber-300' : 'hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200'}`}
            title={t('nightModeTitle')}
          >
            <Moon className="w-4 h-4" />
          </button>

          {/* Favorite Toggle */}
          <button 
            onClick={handleToggleFav}
            className={`p-1.5 rounded-lg transition ${
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
            className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg transition text-xs font-medium cursor-pointer ${
              commentsDrawerOpen 
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' 
                : 'hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200'
            }`}
            title={commentsDrawerOpen ? t('hideComments') : t('showComments')}
          >
            <MessageSquare className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline">{t('comments')}</span>
            {annotations.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full font-mono text-[10px] bg-amber-500/25 text-amber-300 font-semibold">
                {annotations.length}
              </span>
            )}
          </button>

          {/* Fullscreen */}
          <button 
            onClick={toggleFullscreen}
            className="p-1.5 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 transition"
            title={t('fullscreenTitle')}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
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
        <div className="relative flex-1 flex flex-col min-w-0 h-full overflow-hidden group/stage">
          {/* Scrollable Document Container */}
          <div 
            ref={containerRef}
            tabIndex={0}
            onContextMenu={handleTextContextMenu}
            className="flex-1 overflow-y-auto overflow-x-auto p-4 sm:p-6 focus:outline-none scroll-smooth select-text"
          >
            {loading ? (
              <div className="flex flex-col items-center justify-center h-full min-h-[400px] gap-3 text-neutral-400 select-none">
                <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-sm">{t('loadingBook')}</p>
              </div>
            ) : (
              <div className="min-h-full flex justify-center items-start">
                {/* Document Page Wrapper with exact CSS dimensions and PDF.js scale variables */}
                <div 
                  ref={pageWrapperRef}
                  className="relative shadow-2xl rounded"
                  style={{
                    width: pageDims.width ? `${pageDims.width}px` : 'auto',
                    height: pageDims.height ? `${pageDims.height}px` : 'auto',
                    '--scale-factor': scale,
                    '--total-scale-factor': scale,
                    '--user-unit': 1,
                    '--scale-round-x': '1px',
                    '--scale-round-y': '1px',
                  }}
                >
                  {/* Canvas raster background */}
                  <canvas 
                    ref={canvasRef}
                    className="max-w-none transition-filter duration-200 rounded block"
                    style={{
                      filter: invertColors ? 'invert(0.9) hue-rotate(180deg) brightness(0.95) contrast(1.1)' : 'none',
                    }}
                  />

                  {/* Text Layer for text selection & copy */}
                  <div 
                    ref={textLayerRef}
                    className="textLayer"
                    style={{
                      filter: invertColors ? 'invert(0.9) hue-rotate(180deg) brightness(0.95) contrast(1.1)' : 'none',
                    }}
                  />

                  {/* Annotation Layer for clickable links */}
                  <div 
                    ref={annotationLayerRef}
                    className="annotationLayer"
                  />

                  {/* Visual Highlights & Comment Badges Overlay */}
                  <HighlightOverlay
                    annotations={annotations.filter(a => a.page === currentPage)}
                    onUpdateComment={handleUpdateComment}
                    onDeleteAnnotation={handleDeleteAnnotation}
                    invertColors={invertColors}
                  />

                  {/* Rendering indicator badge */}
                  {rendering && (
                    <div className="absolute top-3 right-3 bg-black/70 backdrop-blur-sm text-neutral-300 text-xs px-2.5 py-1 rounded shadow pointer-events-none z-10 select-none">
                      {t('rendering')}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Floating Left Navigation Button */}
          {currentPage > 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                goToPrevPage();
              }}
              className="absolute left-3 sm:left-5 top-1/2 -translate-y-1/2 z-20 w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-neutral-900/80 hover:bg-neutral-850/95 backdrop-blur-md border border-neutral-750/80 hover:border-amber-500/60 text-neutral-300 hover:text-white shadow-2xl flex items-center justify-center transition-all duration-200 opacity-60 hover:opacity-100 sm:opacity-0 sm:group-hover/stage:opacity-80 sm:hover:!opacity-100 hover:scale-110 active:scale-95 cursor-pointer select-none"
              title={t('prevPageTitle')}
              aria-label={t('prevPageTitle')}
            >
              <ChevronLeft className="w-6 h-6 sm:w-7 sm:h-7 text-neutral-300 hover:text-amber-400 transition-colors" />
            </button>
          )}

          {/* Floating Right Navigation Button */}
          {currentPage < totalPages && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                goToNextPage();
              }}
              className="absolute right-3 sm:right-5 top-1/2 -translate-y-1/2 z-20 w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-neutral-900/80 hover:bg-neutral-850/95 backdrop-blur-md border border-neutral-750/80 hover:border-amber-500/60 text-neutral-300 hover:text-white shadow-2xl flex items-center justify-center transition-all duration-200 opacity-60 hover:opacity-100 sm:opacity-0 sm:group-hover/stage:opacity-80 sm:hover:!opacity-100 hover:scale-110 active:scale-95 cursor-pointer select-none"
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
