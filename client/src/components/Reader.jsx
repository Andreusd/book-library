import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { 
  ArrowLeft, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, 
  Maximize2, Minimize2, ExternalLink, Moon, Sun
} from 'lucide-react';
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
    link.target = '_blank';
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

export default function Reader({ book, onClose, onProgressUpdate }) {
  const { t } = useI18n();
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

  const canvasRef = useRef(null);
  const textLayerRef = useRef(null);
  const annotationLayerRef = useRef(null);
  const containerRef = useRef(null);
  const renderTaskRef = useRef(null);
  const textLayerInstanceRef = useRef(null);
  const annotationLayerInstanceRef = useRef(null);
  const linkServiceRef = useRef(new SimpleLinkService());
  const lastRenderedPageRef = useRef(null);
  const onProgressUpdateRef = useRef(onProgressUpdate);
  const scaleRef = useRef(scale);
  const lastWheelTimeRef = useRef(0);

  useEffect(() => {
    scaleRef.current = scale;
  }, [scale]);

  useEffect(() => {
    onProgressUpdateRef.current = onProgressUpdate;
  }, [onProgressUpdate]);

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

  const openInSystem = () => {
    fetch('/api/open-system', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ book_id: book.id })
    }).catch(err => console.error('Failed to open locally:', err));
  };

  // Keyboard navigation & smart scrolling
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT') return;

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
      } else if (e.key === 'ArrowUp') {
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

      // Normal Wheel on non-scrollable page to flip pages
      const container = containerRef.current;
      if (!container) return;

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
    <div className="fixed inset-0 z-50 flex flex-col bg-neutral-950 text-neutral-100">
      {/* Top Header / Toolbar */}
      <header className="h-14 px-4 bg-neutral-900/90 backdrop-blur-md border-b border-neutral-850 flex items-center justify-between z-20 shrink-0 select-none">
        <div className="flex items-center gap-3 min-w-0">
          <button 
            onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-800/80 hover:bg-neutral-700 text-neutral-300 hover:text-white transition text-sm font-medium"
            title={t('backToLibraryTitle')}
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">{t('backToLibrary')}</span>
          </button>
          
          <div className="h-4 w-px bg-neutral-700 mx-1 hidden sm:block" />

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

          {/* Open in Windows default viewer */}
          <button 
            onClick={openInSystem}
            className="p-1.5 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 transition hidden sm:flex"
            title={t('openInWindowsTitle')}
          >
            <ExternalLink className="w-4 h-4" />
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
        {/* Scrollable Document Container */}
        <div 
          ref={containerRef}
          tabIndex={0}
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
      </div>

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
