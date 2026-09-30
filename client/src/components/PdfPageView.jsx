import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import HighlightOverlay from './HighlightOverlay';
import { PdfTextHighlighter } from './PdfTextHighlighter';
import { useI18n } from '../i18n';
import {
  getPdfDocFingerprint,
  getCachedPageCanvas,
  setCachedPageCanvas,
  inFlightPreloads,
} from '../utils/pdfPageUtils';
import { usePdfViewerContext } from '../hooks/usePdfViewerContext';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

/**
 * PdfPageView renders an individual PDF page canvas, text layer,
 * annotation layer (hyperlinks), and highlight overlay.
 */
export default function PdfPageView({
  pdfDoc: propPdfDoc,
  pageNum,
  scale: propScale,
  invertColors: propInvertColors,
  linkService: propLinkService,
  findController: propFindController = null,
  eventBus: propEventBus = null,
  annotations: propAnnotations,
  onUpdateComment: propOnUpdateComment,
  onDeleteAnnotation: propOnDeleteAnnotation,
  pageSide = 'single', // 'single' | 'left' | 'right'
  showBookTexture: propShowBookTexture,
  onDimensionsLoaded: propOnDimensionsLoaded,
  initialDims = null,
  hasPageSpacing = true,
}) {
  const ctx = usePdfViewerContext();

  const pdfDoc = propPdfDoc ?? ctx.pdfDoc;
  const scale = propScale ?? ctx.scale ?? 1;
  const invertColors = propInvertColors ?? ctx.invertColors ?? false;
  const linkService = propLinkService ?? ctx.linkService ?? null;
  const findController = propFindController ?? ctx.findController ?? null;
  const eventBus = propEventBus ?? ctx.eventBus ?? null;
  const annotations = propAnnotations ?? (ctx.annotations ? ctx.annotations.filter(a => a.page === pageNum) : (ctx.annotationsList ? ctx.annotationsList.filter(a => a.page === pageNum) : []));
  const onUpdateComment = propOnUpdateComment ?? ctx.onUpdateComment;
  const onDeleteAnnotation = propOnDeleteAnnotation ?? ctx.onDeleteAnnotation;
  const showBookTexture = propShowBookTexture ?? ctx.showBookTexture ?? ctx.bookTextureEnabled ?? true;
  const onDimensionsLoaded = propOnDimensionsLoaded ?? ctx.onDimensionsLoaded ?? null;

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

  const [prevInitialDims, setPrevInitialDims] = useState(initialDims);
  const [prevCacheKey, setPrevCacheKey] = useState(cacheKey);
  const [pageDims, setPageDims] = useState(() => {
    const cached = getCachedPageCanvas(cacheKey);
    if (cached?.dims) return cached.dims;
    if (initialDims && initialDims.width > 0 && initialDims.height > 0) return initialDims;
    return { width: 0, height: 0 };
  });
  const [rendering, setRendering] = useState(() => !getCachedPageCanvas(cacheKey));

  if (initialDims !== prevInitialDims) {
    setPrevInitialDims(initialDims);
    if (initialDims && initialDims.width > 0 && initialDims.height > 0) {
      setPageDims(prev => (prev.width === initialDims.width && prev.height === initialDims.height ? prev : initialDims));
    }
  }

  if (cacheKey !== prevCacheKey) {
    setPrevCacheKey(cacheKey);
    const cached = getCachedPageCanvas(cacheKey);
    if (cached?.dims) {
      setPageDims(cached.dims);
      setRendering(false);
    } else {
      setRendering(true);
    }
  }

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
      if (onDimensionsLoaded) {
        onDimensionsLoaded(pageNum, cached.dims);
      }
    }
  }, [cacheKey, pdfDoc, pageNum, onDimensionsLoaded]);

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
      if (onDimensionsLoaded) {
        onDimensionsLoaded(pageNum, cached.dims);
      }
    }

    // Cancel in-flight render tasks
    if (renderTaskRef.current) {
      try {
        renderTaskRef.current.cancel();
      } catch {}
      renderTaskRef.current = null;
    }

    if (textLayerInstanceRef.current) {
      try {
        textLayerInstanceRef.current.cancel();
      } catch {}
      textLayerInstanceRef.current = null;
    }

    if (textHighlighterRef.current) {
      try {
        textHighlighterRef.current.disable();
      } catch {}
      textHighlighterRef.current = null;
    }

    if (textLayerRef.current) {
      textLayerRef.current.replaceChildren();
    }
    if (annotationLayerRef.current) {
      annotationLayerRef.current.replaceChildren();
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
          } catch {}
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
            } catch {}
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
        } catch {}
        renderTaskRef.current = null;
      }
      if (textHighlighterRef.current) {
        try {
          textHighlighterRef.current.disable();
        } catch {}
        textHighlighterRef.current = null;
      }
      if (textLayerInstanceRef.current) {
        try {
          textLayerInstanceRef.current.cancel();
        } catch {}
        textLayerInstanceRef.current = null;
      }
    };
  }, [pdfDoc, pageNum, scale, linkService, findController, eventBus, cacheKey, onDimensionsLoaded]);

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
