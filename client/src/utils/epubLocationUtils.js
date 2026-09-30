/**
 * Utility helpers for EPUB CFI, location tracking, and table of contents resolution.
 */

export function findChapterLabel(items, href) {
  if (!items || !href) return '';
  const cleanHref = href.split('#')[0];
  for (const item of items) {
    const itemClean = (item.href || '').split('#')[0];
    if (item.href === href || itemClean === cleanHref) {
      return item.label ? item.label.trim() : '';
    }
    if (item.subitems && item.subitems.length > 0) {
      const sub = findChapterLabel(item.subitems, href);
      if (sub) return sub;
    }
  }
  return '';
}

export function getInitialCfi(book) {
  if (book?.progress?.cfi && typeof book.progress.cfi === 'string' && book.progress.cfi.trim() !== '') {
    return book.progress.cfi;
  }
  try {
    const local = localStorage.getItem(`book_cfi_${book?.id}`);
    if (local && local.trim() !== '') return local;
  } catch {}
  return null;
}

export function getInitialPercent(book) {
  if (book?.progress?.percent !== undefined && book?.progress?.percent !== null) {
    const p = parseFloat(book.progress.percent);
    if (!isNaN(p) && p >= 0) return p;
  }
  try {
    const local = localStorage.getItem(`book_percent_${book?.id}`);
    if (local) {
      const p = parseFloat(local);
      if (!isNaN(p) && p >= 0) return p;
    }
  } catch {}
  return 0;
}

export function getInitialPage(book) {
  if (book?.progress?.page && typeof book.progress.page === 'number' && book.progress.page > 0) {
    return book.progress.page;
  }
  try {
    const local = localStorage.getItem(`book_page_${book?.id}`);
    if (local !== null) {
      const val = parseInt(local, 10);
      if (!isNaN(val) && val > 0) return val;
    }
  } catch {}
  return 1;
}

export function getInitialTotalPages(book) {
  if (book?.progress?.total_pages && typeof book.progress.total_pages === 'number' && book.progress.total_pages > 0) {
    return book.progress.total_pages;
  }
  try {
    const local = localStorage.getItem(`book_total_pages_${book?.id}`);
    if (local !== null) {
      const val = parseInt(local, 10);
      if (!isNaN(val) && val > 0) return val;
    }
  } catch {}
  return 0;
}
