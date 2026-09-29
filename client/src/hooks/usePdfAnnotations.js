import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Custom hook to manage PDF highlights, annotations, context menus,
 * and backend persistence.
 */
export function usePdfAnnotations({ bookId }) {
  const [annotations, setAnnotations] = useState([]);
  const [commentsDrawerOpen, setCommentsDrawerOpen] = useState(false);
  const commentsDrawerOpenRef = useRef(commentsDrawerOpen);

  useEffect(() => {
    commentsDrawerOpenRef.current = commentsDrawerOpen;
  }, [commentsDrawerOpen]);

  const [selectionMenu, setSelectionMenu] = useState({
    isOpen: false,
    x: 0,
    y: 0,
    text: '',
    rects: [],
    page: 1,
  });

  // Load Annotations from Backend
  const loadAnnotations = useCallback(() => {
    if (!bookId) return;
    fetch(`/api/annotations/${bookId}`)
      .then(r => r.json())
      .then(data => {
        setAnnotations(data.annotations || []);
      })
      .catch(err => console.error('Failed to load annotations:', err));
  }, [bookId]);

  useEffect(() => {
    loadAnnotations();
  }, [loadAnnotations]);

  // Text selection context menu handler
  const handleTextContextMenu = useCallback((e) => {
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
  }, []);

  // Create new highlight or comment
  const handleCreateHighlight = useCallback((color, comment = '') => {
    if (!selectionMenu.text || selectionMenu.rects.length === 0 || !bookId) return;

    const payload = {
      book_id: bookId,
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
  }, [bookId, selectionMenu]);

  // Update existing comment note
  const handleUpdateComment = useCallback((annotationId, newComment) => {
    if (!bookId) return;
    fetch(`/api/annotations/${bookId}/${annotationId}`, {
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
  }, [bookId]);

  // Delete an annotation
  const handleDeleteAnnotation = useCallback((annotationId) => {
    if (!bookId) return;
    fetch(`/api/annotations/${bookId}/${annotationId}`, {
      method: 'DELETE',
    })
    .then(r => r.json())
    .then(data => {
      if (data.status === 'ok') {
        setAnnotations(prev => prev.filter(a => a.id !== annotationId));
      }
    })
    .catch(err => console.error('Failed to delete annotation:', err));
  }, [bookId]);

  const handleJumpToAnnotation = useCallback((ann, onNavigate) => {
    if (ann.page && onNavigate) {
      onNavigate(ann.page);
    }
    if (window.innerWidth < 768) {
      setCommentsDrawerOpen(false);
    }
  }, []);

  return {
    annotations,
    setAnnotations,
    commentsDrawerOpen,
    setCommentsDrawerOpen,
    commentsDrawerOpenRef,
    selectionMenu,
    setSelectionMenu,
    loadAnnotations,
    handleTextContextMenu,
    handleCreateHighlight,
    handleUpdateComment,
    handleDeleteAnnotation,
    handleJumpToAnnotation,
  };
}
