import { useRef, useCallback } from 'react';

/**
 * Handles two-finger horizontal trackpad gestures with velocity debounce,
 * direction detection, and edge boundary checks to prevent browser navigation gestures.
 */
export function useTrackpadSwipe({ onNext, onPrev, enabled = true, threshold = 28, cooldownMs = 350 }) {
  const accumulatedDeltaXRef = useRef(0);
  const lastSwipeTimeRef = useRef(0);
  const clearSwipeTimerRef = useRef(null);

  const handleTrackpadWheel = useCallback((e, container) => {
    const absX = Math.abs(e.deltaX);
    const absY = Math.abs(e.deltaY);

    if (absX > absY && absX > 2) {
      if (!container) return false;

      const isHorizScrollable = container.scrollWidth > container.clientWidth + 10;
      const atRightEdge = container.scrollLeft + container.clientWidth >= container.scrollWidth - 10;
      const atLeftEdge = container.scrollLeft <= 10;

      // Prevent native browser back/forward page navigation gesture
      if (!isHorizScrollable || (e.deltaX > 0 && atRightEdge) || (e.deltaX < 0 && atLeftEdge)) {
        e.preventDefault();
      }

      if (enabled) {
        const now = Date.now();
        if (now - lastSwipeTimeRef.current > cooldownMs) {
          accumulatedDeltaXRef.current += e.deltaX;

          if (clearSwipeTimerRef.current) clearTimeout(clearSwipeTimerRef.current);
          clearSwipeTimerRef.current = setTimeout(() => {
            accumulatedDeltaXRef.current = 0;
          }, 150);

          if (Math.abs(accumulatedDeltaXRef.current) > threshold) {
            if (!isHorizScrollable || (accumulatedDeltaXRef.current > 0 && atRightEdge) || (accumulatedDeltaXRef.current < 0 && atLeftEdge)) {
              lastSwipeTimeRef.current = now;
              const dir = accumulatedDeltaXRef.current;
              accumulatedDeltaXRef.current = 0;
              if (dir > 0) {
                onNext();
              } else {
                onPrev();
              }
              return true;
            }
          }
        }
      }
      return true;
    }
    return false;
  }, [enabled, onNext, onPrev, threshold, cooldownMs]);

  return { handleTrackpadWheel };
}
