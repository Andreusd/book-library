import { useState, useEffect, useCallback } from 'react';

/**
 * Custom hook to monitor and toggle browser fullscreen state.
 */
export function useFullscreen() {
  const [isFullscreen, setIsFullscreen] = useState(() => {
    return typeof document !== 'undefined' ? Boolean(document.fullscreenElement) : false;
  });

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (typeof document === 'undefined') return;

    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.warn('Failed to enter fullscreen mode:', err);
      });
    } else {
      document.exitFullscreen().catch((err) => {
        console.warn('Failed to exit fullscreen mode:', err);
      });
    }
  }, []);

  return { isFullscreen, toggleFullscreen };
}
