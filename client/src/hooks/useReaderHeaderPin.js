import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * Hook to manage reader header auto-hide behavior, pinning,
 * and mouse hover / touch boundary detection.
 */
export function useReaderHeaderPin({
  storageKey = 'reader_header_pinned',
  initialDelay = 3000,
  hoverThresholdY = 60,
} = {}) {
  const [headerPinned, setHeaderPinned] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved !== null ? saved === 'true' : false;
    } catch {
      return false;
    }
  });

  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const hideTimerRef = useRef(null);
  const isMouseOverHeaderRef = useRef(false);

  const clearHideTimer = useCallback(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

  const showHeader = useCallback(() => {
    clearHideTimer();
    setIsHeaderVisible(true);
  }, [clearHideTimer]);

  const startHideTimer = useCallback((delay = 3000, reset = false) => {
    if (hideTimerRef.current && !reset) return;
    clearHideTimer();
    hideTimerRef.current = setTimeout(() => {
      if (isMouseOverHeaderRef.current) return;
      setIsHeaderVisible(false);
      hideTimerRef.current = null;
    }, delay);
  }, [clearHideTimer]);

  const toggleHeaderPinned = useCallback(() => {
    setHeaderPinned(prev => {
      const next = !prev;
      try {
        localStorage.setItem(storageKey, String(next));
      } catch {}
      if (next) {
        clearHideTimer();
        setIsHeaderVisible(true);
      } else {
        showHeader();
        if (!isMouseOverHeaderRef.current) {
          startHideTimer(3000, true);
        }
      }
      return next;
    });
  }, [clearHideTimer, showHeader, startHideTimer, storageKey]);

  // Window mousemove / touchstart listener to re-show header near screen top
  useEffect(() => {
    if (headerPinned) return;

    const handleMouseMove = (e) => {
      if (e.clientY <= hoverThresholdY) {
        showHeader();
      }
    };

    const handleTouchStart = (e) => {
      const touch = e.touches[0];
      if (touch && touch.clientY <= hoverThresholdY) {
        showHeader();
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchstart', handleTouchStart);
    };
  }, [headerPinned, showHeader, hoverThresholdY]);

  // Initial auto-hide timer when opening reader in unpinned mode
  useEffect(() => {
    if (headerPinned) return;
    const timer = setTimeout(() => {
      if (!isMouseOverHeaderRef.current) {
        setIsHeaderVisible(false);
      }
    }, initialDelay);
    return () => clearTimeout(timer);
  }, [headerPinned, initialDelay]);

  return {
    headerPinned,
    isHeaderVisible,
    showHeader,
    clearHideTimer,
    startHideTimer,
    toggleHeaderPinned,
    isMouseOverHeaderRef,
  };
}
