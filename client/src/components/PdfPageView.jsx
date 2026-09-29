import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import HighlightOverlay from './HighlightOverlay';
import { PdfTextHighlighter } from './PdfTextHighlighter';
import { useI18n } from '../i18n';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

/**
 * Computes the left and right page numbers for a two-page spread.
 */
export function getDualPageSpread(page, totalPages, separateCover = false) {
  const p = Math.max(1, Math.min(page || 1, totalPages || 1));
  if (separateCover) {
    if (p === 1) return { left: null, right: 1, currentBase: 1 };
    const left = p % 2 === 0 ? p : p - 1;
    const right = left + 1 <= totalPages ? left + 1 : null;
    return { left, right, currentBase: left };
  } else {
    const left = p % 2 === 1 ? p : p - 1;
    const right = left + 1 <= totalPages ? left + 1 : null;
    return { left, right, currentBase: left };
  }
}

export function getNextSpreadPage(currentBase, totalPages, separateCover = false) {
  if (separateCover && currentBase === 1) return Math.min(2, totalPages);
  const next = currentBase + 2;
  return next <= totalPages ? next : currentBase;
}

export function getPrevSpreadPage(currentBase, totalPages, separateCover = false) {
  if (separateCover) {
    if (currentBase === 2) return 1;
    return Math.max(1, currentBase - 2);
  }
  return Math.max(1, currentBase - 2);
}

export function getPdfDocFingerprint(pdfDoc) {
  if (!pdfDoc) return '';
  return pdfDoc.fingerprints?.[0] || pdfDoc.fingerprint || pdfDoc._pdfInfo?.fingerprint || (pdfDoc.loadingTask && pdfDoc.loadingTask.docId) || 'doc';
}

// Module-level in-memory cache for pre-rendered page canvases
const pageRenderCache = new Map();
const inFlightPreloads = new Map();
const MAX_CACHE_SIZE = 24;

export function getCachedPageCanvas(key) {
  return pageRenderCache.get(key) || null;
}

export function setCachedPageCanvas(key, value) {
  if (pageRenderCache.has(key)) {
    pageRenderCache.delete(key);
  } else if (pageRenderCache.size >= MAX_CACHE_SIZE) {
    const firstKey = pageRenderCache.keys().next().value;
    pageRenderCache.delete(firstKey);
  }
  pageRenderCache.set(key, value);
}

export function clearPageRenderCache() {
  pageRenderCache.clear();
  inFlightPreloads.clear();
  preloadQueue = [];
}

// Background preloader for upcoming PDF pages
let preloadQueue = [];
let isPreloading = false;

export function preloadPdfPage(pdfDoc, pageNum, scale) {
  if (!pdfDoc || !pageNum) return Promise.resolve(null);
  const docId = getPdfDocFingerprint(pdfDoc);
  const cacheKey = `${docId}_${pageNum}_${scale}`;
  if (getCachedPageCanvas(cacheKey)) {
    return Promise.resolve(getCachedPageCanvas(cacheKey));
  }
  if (inFlightPreloads.has(cacheKey)) {
    return inFlightPreloads.get(cacheKey);
  }

  const p = (async () => {
    try {
      const page = await pdfDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale });
      const vpWidth = Math.floor(viewport.width);
      const vpHeight = Math.floor(viewport.height);
      const dpr = window.devicePixelRatio || 1;

      const offscreen = document.createElement('canvas');
      offscreen.width = Math.floor(viewport.width * dpr);
      offscreen.height = Math.floor(viewport.height * dpr);
      const context = offscreen.getContext('2d');

      const renderContext = {
        canvasContext: context,
        viewport: viewport,
        transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : null,
      };

      await page.render(renderContext).promise;

      const result = {
        canvas: offscreen,
        dims: { width: vpWidth, height: vpHeight },
      };
      setCachedPageCanvas(cacheKey, result);
      return result;
    } catch (err) {
      return null;
    } finally {
      inFlightPreloads.delete(cacheKey);
    }
  })();

  inFlightPreloads.set(cacheKey, p);
  return p;
}

async function processPreloadQueue() {
  if (isPreloading || preloadQueue.length === 0) return;
  isPreloading = true;
  while (preloadQueue.length > 0) {
    const task = preloadQueue.shift();
    await preloadPdfPage(task.pdfDoc, task.pageNum, task.scale);
    await new Promise(r => setTimeout(r, 25));
  }
  isPreloading = false;
}

export function queuePreloadPages(pdfDoc, pageNumbers, scale) {
  if (!pdfDoc || !pageNumbers || pageNumbers.length === 0) {
    preloadQueue = [];
    return;
  }
  const docId = getPdfDocFingerprint(pdfDoc);
  const tasks = [];
  pageNumbers.forEach(p => {
    if (p >= 1 && p <= (pdfDoc.numPages || 99999)) {
      const cacheKey = `${docId}_${p}_${scale}`;
      if (!getCachedPageCanvas(cacheKey)) {
        tasks.push({ pdfDoc, pageNum: p, scale });
      }
    }
  });
  preloadQueue = tasks;
  if (tasks.length > 0) {
    processPreloadQueue();
  }
}

/**
 * PdfPageView renders an individual PDF page canvas, text layer,
 * annotation layer (hyperlinks), and highlight overlay.
 */
export default function PdfPageView({
  pdfDoc,
  pageNum,
  scale,
  invertColors,
  linkService,
  findController = null,
  eventBus = null,
  annotations = [],
  onUpdateComment,
  onDeleteAnnotation,
  pageSide = 'single', // 'single' | 'left' | 'right'
  showBookTexture = true,
  onDimensionsLoaded = null,
  initialDims = null,
  hasPageSpacing = true,
}) {
  const { t } = useI18n();
  const canvasRef = useRef(null);
  const textLayerRef = useRef(null);
  const annotationLayerRef = useRef(null);
  const renderTaskRef = useRef(null);
  const textLayerInstanceRef = useRef(null);
  const textHighlighterRef = useRef(null);
  const annotationLayerInstanceRef = useRef(null);

  const docId = getPdfDocFingerprint(pdfDoc);
  const cacheKey = `${docId}_${pageNum}_${scale}`;

  const [pageDims, setPageDims] = useState(() => {
    const cached = getCachedPageCanvas(cacheKey);
    if (cached?.dims) return cached.dims;
    if (initialDims && initialDims.width > 0 && initialDims.height > 0) return initialDims;
    return { width: 0, height: 0 };
  });
  const [rendering, setRendering] = useState(false);

  useEffect(() => {
    if (initialDims && initialDims.width > 0 && initialDims.height > 0) {
      setPageDims(prev => (prev.width === initialDims.width && prev.height === initialDims.height ? prev : initialDims));
    }
  }, [initialDims]);

  // Synchronous paint before first browser draw if page is in cache to completely eliminate blank frames
  useLayoutEffect(() => {
    if (!pdfDoc || !pageNum || !canvasRef.current) return;
    const cached = getCachedPageCanvas(cacheKey);
    if (cached) {
      const canvas = canvasRef.current;
      canvas.width = cached.canvas.width;
      canvas.height = cached.canvas.height;
      canvas.style.width = `${cached.dims.width}px`;
      canvas.style.height = `${cached.dims.height}px`;
      const context = canvas.getContext('2d');
      context.drawImage(cached.canvas, 0, 0);
      setPageDims(cached.dims);
      if (onDimensionsLoaded) {
        onDimensionsLoaded(pageNum, cached.dims);
      }
    }
  }, [cacheKey]);

  useEffect(() => {
    if (!pdfDoc || !pageNum) return;

    // Fast-path: Check if pre-rendered canvas exists in memory
    const cached = getCachedPageCanvas(cacheKey);
    let paintedFromCache = false;
    if (cached && canvasRef.current) {
      const canvas = canvasRef.current;
      if (canvas.width !== cached.canvas.width || canvas.height !== cached.canvas.height) {
        canvas.width = cached.canvas.width;
        canvas.height = cached.canvas.height;
        canvas.style.width = `${cached.dims.width}px`;
        canvas.style.height = `${cached.dims.height}px`;
        const context = canvas.getContext('2d');
        context.drawImage(cached.canvas, 0, 0);
      }
      paintedFromCache = true;
      setPageDims(cached.dims);
      if (onDimensionsLoaded) {
        onDimensionsLoaded(pageNum, cached.dims);
      }
    }

    // Cancel in-flight render tasks
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

    if (textHighlighterRef.current) {
      try {
        textHighlighterRef.current.disable();
      } catch (e) {}
      textHighlighterRef.current = null;
    }

    if (textLayerRef.current) {
      textLayerRef.current.replaceChildren();
    }
    if (annotationLayerRef.current) {
      annotationLayerRef.current.replaceChildren();
    }

    if (!paintedFromCache) {
      setRendering(true);
    }
    let active = true;

    (async () => {
      try {
        // If preloader is currently rendering this page, wait for it instead of running a duplicate task
        if (!paintedFromCache && inFlightPreloads.has(cacheKey)) {
          try {
            const res = await inFlightPreloads.get(cacheKey);
            if (res && active && canvasRef.current) {
              const canvas = canvasRef.current;
              canvas.width = res.canvas.width;
              canvas.height = res.canvas.height;
              canvas.style.width = `${res.dims.width}px`;
              canvas.style.height = `${res.dims.height}px`;
              canvas.getContext('2d').drawImage(res.canvas, 0, 0);
              paintedFromCache = true;
              setPageDims(res.dims);
              setRendering(false);
              if (onDimensionsLoaded) {
                onDimensionsLoaded(pageNum, res.dims);
              }
            }
          } catch (e) {}
        }

        let page;
        try {
          page = await pdfDoc.getPage(pageNum);
        } catch (err) {
          console.error(`Failed to get page ${pageNum}:`, err);
          if (active) setRendering(false);
          return;
        }
        if (!active) return;

        const viewport = page.getViewport({ scale });
        const canvas = canvasRef.current;
        if (!canvas) return;

        const vpWidth = Math.floor(viewport.width);
        const vpHeight = Math.floor(viewport.height);
        setPageDims({ width: vpWidth, height: vpHeight });
        if (onDimensionsLoaded) {
          onDimensionsLoaded(pageNum, { width: vpWidth, height: vpHeight });
        }

        const dpr = window.devicePixelRatio || 1;
        const targetWidth = Math.floor(viewport.width * dpr);
        const targetHeight = Math.floor(viewport.height * dpr);

        // If not painted from cache or dimensions don't match, render directly to canvas
        if (!paintedFromCache || canvas.width !== targetWidth || canvas.height !== targetHeight) {
          // Check if preloader just finished in the background
          const newlyCached = getCachedPageCanvas(cacheKey);
          if (newlyCached) {
            canvas.width = newlyCached.canvas.width;
            canvas.height = newlyCached.canvas.height;
            canvas.style.width = `${newlyCached.dims.width}px`;
            canvas.style.height = `${newlyCached.dims.height}px`;
            canvas.getContext('2d').drawImage(newlyCached.canvas, 0, 0);
            paintedFromCache = true;
          } else {
            canvas.width = targetWidth;
            canvas.height = targetHeight;
            canvas.style.width = `${vpWidth}px`;
            canvas.style.height = `${vpHeight}px`;

            const context = canvas.getContext('2d');
            const renderContext = {
              canvasContext: context,
              viewport: viewport,
              transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : null,
            };

            const task = page.render(renderContext);
            renderTaskRef.current = task;

            try {
              await task.promise;
            } catch (err) {
              if (err?.name !== 'RenderingCancelledException') {
                console.error(`Page ${pageNum} render error:`, err);
              }
              if (active) setRendering(false);
              return;
            }

            if (!active) return;
            renderTaskRef.current = null;

            // Store rendered canvas in cache for instant back-and-forth flipping
            try {
              const offscreen = document.createElement('canvas');
              offscreen.width = targetWidth;
              offscreen.height = targetHeight;
              offscreen.getContext('2d').drawImage(canvas, 0, 0);
              setCachedPageCanvas(cacheKey, {
                canvas: offscreen,
                dims: { width: vpWidth, height: vpHeight },
              });
            } catch (e) {}
          }
        }

        if (active) setRendering(false);

        // Render Text Layer for text selection & in-book search highlighting
        if (textLayerRef.current) {
          try {
            const textContent = await page.getTextContent();
            if (!active) return;
            const textLayer = new pdfjsLib.TextLayer({
              textContentSource: textContent,
              container: textLayerRef.current,
              viewport: viewport,
            });
            textLayerInstanceRef.current = textLayer;
            await textLayer.render();
            if (!active) return;

            // Attach text highlighter for in-book search
            if (findController && eventBus) {
              const highlighter = new PdfTextHighlighter({
                findController,
                eventBus,
                pageIndex: pageNum - 1,
              });
              highlighter.setTextMapping(textLayer.textDivs, textLayer.textContentItemsStr);
              highlighter.enable();
              textHighlighterRef.current = highlighter;
            }
          } catch (err) {
            if (err?.name !== 'RenderingCancelledException') {
              console.error(`Page ${pageNum} TextLayer error:`, err);
            }
          }
        }

        // Render Annotation Layer for links (internal TOC & web links)
        if (annotationLayerRef.current && linkService) {
          try {
            const pageAnnotations = await page.getAnnotations({ intent: 'display' });
            if (!active) return;
            if (pageAnnotations && pageAnnotations.length > 0) {
              const annotationLayer = new pdfjsLib.AnnotationLayer({
                div: annotationLayerRef.current,
                page: page,
                viewport: viewport,
                linkService: linkService,
              });
              annotationLayerInstanceRef.current = annotationLayer;
              await annotationLayer.render({
                annotations: pageAnnotations,
                viewport: viewport,
              });
            }
          } catch (err) {
            console.error(`Page ${pageNum} AnnotationLayer error:`, err);
          }
        }
      } catch (err) {
        console.error(`Failed to render page ${pageNum}:`, err);
        if (active) setRendering(false);
      }
    })();

    return () => {
      active = false;
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch (e) {}
        renderTaskRef.current = null;
      }
      if (textHighlighterRef.current) {
        try {
          textHighlighterRef.current.disable();
        } catch (e) {}
        textHighlighterRef.current = null;
      }
      if (textLayerInstanceRef.current) {
        try {
          textLayerInstanceRef.current.cancel();
        } catch (e) {}
        textLayerInstanceRef.current = null;
      }
    };
  }, [pdfDoc, pageNum, scale, linkService, findController, eventBus]);

  const getSideClasses = () => {
    const roundClass = !hasPageSpacing
      ? ''
      : pageSide === 'left'
      ? 'rounded-l-sm'
      : pageSide === 'right'
      ? 'rounded-r-sm'
      : 'rounded-sm';

    if (pageSide === 'left') {
      if (!showBookTexture) {
        return `${roundClass} shadow-md`;
      }
      return `${roundClass} shadow-2xl border-r border-neutral-800/90 before:absolute before:right-0 before:top-0 before:bottom-0 before:w-6 before:bg-gradient-to-l before:from-black/15 before:to-transparent before:pointer-events-none before:z-10`;
    }
    if (pageSide === 'right') {
      if (!showBookTexture) {
        return `${roundClass} shadow-md`;
      }
      return `${roundClass} shadow-2xl border-l border-neutral-900/60 after:absolute after:left-0 after:top-0 after:bottom-0 after:w-6 after:bg-gradient-to-r after:from-black/15 after:to-transparent after:pointer-events-none after:z-10`;
    }
    return `${roundClass} ${showBookTexture ? 'shadow-2xl' : 'shadow-md'}`;
  };

  return (
    <div
      data-pdf-page={pageNum}
      className={`relative select-text ${getSideClasses()}`}
      style={{
        width: pageDims.width ? `${pageDims.width}px` : (initialDims?.width ? `${initialDims.width}px` : 'auto'),
        height: pageDims.height ? `${pageDims.height}px` : (initialDims?.height ? `${initialDims.height}px` : 'auto'),
        minWidth: pageDims.width ? `${pageDims.width}px` : (initialDims?.width ? `${initialDims.width}px` : undefined),
        minHeight: pageDims.height ? `${pageDims.height}px` : (initialDims?.height ? `${initialDims.height}px` : undefined),
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
        className="max-w-none transition-filter duration-200 block bg-white"
        style={{
          width: pageDims.width ? `${pageDims.width}px` : (initialDims?.width ? `${initialDims.width}px` : undefined),
          height: pageDims.height ? `${pageDims.height}px` : (initialDims?.height ? `${initialDims.height}px` : undefined),
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
        annotations={annotations}
        onUpdateComment={onUpdateComment}
        onDeleteAnnotation={onDeleteAnnotation}
        invertColors={invertColors}
      />

      {/* Rendering indicator badge */}
      {rendering && (
        <div className="absolute top-3 right-3 bg-black/70 backdrop-blur-sm text-neutral-300 text-xs px-2.5 py-1 rounded shadow pointer-events-none z-10 select-none">
          {t('rendering')}
        </div>
      )}

      {/* Page number badge at bottom for dual view */}
      {pageSide !== 'single' && (
        <div 
          className={`absolute bottom-2 ${pageSide === 'left' ? 'left-3' : 'right-3'} text-[10px] font-mono text-neutral-400/80 bg-neutral-900/60 backdrop-blur-xs px-1.5 py-0.5 rounded select-none pointer-events-none`}
        >
          {pageNum}
        </div>
      )}
    </div>
  );
}
