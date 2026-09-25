import React, { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import HighlightOverlay from './HighlightOverlay';
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
  annotations = [],
  onUpdateComment,
  onDeleteAnnotation,
  pageSide = 'single', // 'single' | 'left' | 'right'
}) {
  const { t } = useI18n();
  const canvasRef = useRef(null);
  const textLayerRef = useRef(null);
  const annotationLayerRef = useRef(null);
  const renderTaskRef = useRef(null);
  const textLayerInstanceRef = useRef(null);
  const annotationLayerInstanceRef = useRef(null);
  const [pageDims, setPageDims] = useState({ width: 0, height: 0 });
  const [rendering, setRendering] = useState(false);

  useEffect(() => {
    if (!pdfDoc || !pageNum) return;

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

    if (textLayerRef.current) {
      textLayerRef.current.replaceChildren();
    }
    if (annotationLayerRef.current) {
      annotationLayerRef.current.replaceChildren();
    }

    setRendering(true);
    let active = true;

    pdfDoc.getPage(pageNum).then(async (page) => {
      if (!active) return;
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
          console.error(`Page ${pageNum} render error:`, err);
        }
        if (active) setRendering(false);
        return;
      }

      if (!active) return;
      renderTaskRef.current = null;
      setRendering(false);

      // Render Text Layer for text selection & copy
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
    }).catch(err => {
      console.error(`Failed to get page ${pageNum}:`, err);
      if (active) setRendering(false);
    });

    return () => {
      active = false;
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
    };
  }, [pdfDoc, pageNum, scale, linkService]);

  const getSideClasses = () => {
    if (pageSide === 'left') {
      return 'rounded-l-sm shadow-2xl border-r border-neutral-800/90 before:absolute before:right-0 before:top-0 before:bottom-0 before:w-6 before:bg-gradient-to-l before:from-black/15 before:to-transparent before:pointer-events-none before:z-10';
    }
    if (pageSide === 'right') {
      return 'rounded-r-sm shadow-2xl border-l border-neutral-900/60 after:absolute after:left-0 after:top-0 after:bottom-0 after:w-6 after:bg-gradient-to-r after:from-black/15 after:to-transparent after:pointer-events-none after:z-10';
    }
    return 'rounded-sm shadow-2xl';
  };

  return (
    <div
      data-pdf-page={pageNum}
      className={`relative select-text ${getSideClasses()}`}
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
        className="max-w-none transition-filter duration-200 block"
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
