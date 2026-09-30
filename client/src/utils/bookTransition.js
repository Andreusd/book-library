/**
 * Utilities for book opening and closing zoom transitions.
 * Resolves bounding rectangles of books from cards, carousels, or centered viewport fallback.
 */

/**
 * @typedef {Object} BookRect
 * @property {number} top
 * @property {number} left
 * @property {number} width
 * @property {number} height
 * @property {number} [right]
 * @property {number} [bottom]
 */

/**
 * Locate the current on-screen bounding rectangle of a book cover.
 *
 * @param {string} bookId - ID of the book to find.
 * @returns {BookRect | null} The bounding rectangle or null/fallback if not in viewport.
 */
export function getBookOriginRect(bookId) {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return null;
  }
  if (!bookId) {
    return getCenteredFallbackRect();
  }

  try {
    const cardEl = document.querySelector(`[data-book-id="${bookId}"]`);
    if (cardEl) {
      const coverEl =
        cardEl.querySelector('.book-cover-container') ||
        cardEl.querySelector('.continue-reading-cover') ||
        cardEl;

      const rect = coverEl.getBoundingClientRect();
      const isValid =
        rect.width > 20 &&
        rect.height > 20 &&
        rect.bottom > 0 &&
        rect.top < window.innerHeight &&
        rect.right > 0 &&
        rect.left < window.innerWidth;

      if (isValid) {
        return {
          top: Math.round(rect.top),
          left: Math.round(rect.left),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          right: Math.round(rect.right),
          bottom: Math.round(rect.bottom),
        };
      }
    }
  } catch {
    // Graceful fallback if selector fails or DOM is not yet ready
  }

  return getCenteredFallbackRect();
}

/**
 * Generate a centered fallback bounding rectangle matching standard book cover proportions (1:1.45).
 *
 * @returns {BookRect}
 */
export function getCenteredFallbackRect() {
  if (typeof window === 'undefined') {
    return { top: 100, left: 100, width: 180, height: 261, right: 280, bottom: 361 };
  }

  const screenW = window.innerWidth || 1024;
  const screenH = window.innerHeight || 768;

  // Adaptive book cover size: approximately 180px - 240px wide, 1:1.45 aspect ratio
  const width = Math.min(220, Math.max(160, Math.round(screenW * 0.18)));
  const height = Math.round(width * 1.45);
  const left = Math.round((screenW - width) / 2);
  const top = Math.round((screenH - height) / 2);

  return {
    top,
    left,
    width,
    height,
    right: left + width,
    bottom: top + height,
  };
}
