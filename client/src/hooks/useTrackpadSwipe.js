import { useRef, useCallback, useEffect } from 'react';

/**
 * Handles two-finger horizontal trackpad gestures with velocity debounce,
 * direction detection, and edge boundary checks to prevent browser navigation gestures.
 */
export function useTrackpadSwipe({ onNext, onPrev, enabled = true, threshold = 28, cooldownMs = 350 }) {
  const accumulatedDeltaXRef = useRef(0);
  const lastSwipeTimeRef = useRef(0);
  const clearSwipeTimerRef = useRef(null);

  const onNextRef = useRef(onNext);
  const onPrevRef = useRef(onPrev);
  const enabledRef = useRef(enabled);

  useEffect(() => {
    onNextRef.current = onNext;
    onPrevRef.current = onPrev;
    enabledRef.current = enabled;
  }, [onNext, onPrev, enabled]);

  const handleTrackpadWheel = useCallback((e, container) => {
    const absX = Math.abs(e.deltaX);
    const absY = Math.abs(e.deltaY);

    if (absX > absY && absX > 2) {
      const isHorizScrollable = container ? container.scrollWidth > container.clientWidth + 10 : false;
      const atRightEdge = container ? container.scrollLeft + container.clientWidth >= container.scrollWidth - 10 : true;
      const atLeftEdge = container ? container.scrollLeft <= 10 : true;

      // Prevent native browser back/forward page navigation gesture
      if (e.cancelable && (!isHorizScrollable || (e.deltaX > 0 && atRightEdge) || (e.deltaX < 0 && atLeftEdge))) {
        e.preventDefault();
      }

      if (enabledRef.current) {
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
                onNextRef.current?.();
              } else {
                onPrevRef.current?.();
              }
              return true;
            }
          }
        }
      }
      return true;
    }
    return false;
  }, [threshold, cooldownMs]);

  return { handleTrackpadWheel };
}

