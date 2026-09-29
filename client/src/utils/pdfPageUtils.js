/**
 * PDF Page calculation, layout spread, canvas caching, and preloading utilities.
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
export const pageRenderCache = new Map();
export const inFlightPreloads = new Map();
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
    } catch {
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
