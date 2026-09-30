import { useState, useRef, useEffect, useCallback } from 'react';
import { applyThemeToDoc } from '../utils/epubThemeUtils';

/**
 * Hook for managing EPUB theme ('dark' | 'light' | 'sepia') and font size.
 */
export function useEpubTheme({ book, mode, onModeChange, renditionRef, viewerRef }) {
  // Preferences: Font size (percentage: 70 - 220)
  const [fontSize, setFontSize] = useState(() => {
    try {
      const saved = localStorage.getItem(`book_font_size_${book?.id}`);
      if (saved) {
        const val = parseInt(saved, 10);
        if (!isNaN(val) && val >= 70 && val <= 250) return val;
      }
    } catch {}
    return 100;
  });

  const fontSizeRef = useRef(fontSize);
  useEffect(() => {
    fontSizeRef.current = fontSize;
  }, [fontSize]);

  // Preferences: Theme ('dark' | 'light' | 'sepia')
  const [theme, setTheme] = useState(() => {
    if (mode === 'light') return 'light';
    if (mode === 'dark') return 'dark';
    try {
      const appMode = localStorage.getItem('app_mode');
      if (appMode === 'light') return 'light';
      if (appMode === 'dark') return 'dark';
    } catch {}
    try {
      const saved = localStorage.getItem(`book_theme_${book?.id}`);
      if (saved && ['dark', 'light', 'sepia'].includes(saved)) return saved;
      const savedInvert = localStorage.getItem(`book_invert_${book?.id}`);
      if (savedInvert === 'true') return 'dark';
    } catch {}
    if (book?.progress?.invert_colors) return 'dark';
    return 'dark'; // default dark mode matching Digital Library aesthetics
  });

  const themeRef = useRef(theme);

  // Synchronize theme across all active EPUB contents and iframes whenever theme changes
  useEffect(() => {
    themeRef.current = theme;
    try {
      const contentsList = renditionRef?.current?.getContents() || [];
      contentsList.forEach(contents => {
        if (contents?.document) {
          applyThemeToDoc(contents.document, theme);
        }
      });
    } catch {}

    try {
      const iframes = viewerRef?.current?.querySelectorAll('iframe') || [];
      iframes.forEach(iframe => {
        const doc = iframe.contentDocument || iframe.contentWindow?.document;
        if (doc) {
          applyThemeToDoc(doc, theme);
        }
      });
    } catch {}
  }, [theme, renditionRef, viewerRef]);

  const applyTheme = useCallback((newTheme) => {
    themeRef.current = newTheme;
    setTheme(newTheme);
    try {
      if (book?.id) {
        localStorage.setItem(`book_theme_${book.id}`, newTheme);
        localStorage.setItem(`book_invert_${book.id}`, String(newTheme === 'dark'));
      }
    } catch {}

    if (newTheme === 'dark' || newTheme === 'light') {
      try {
        localStorage.setItem('app_mode', newTheme);
        document.documentElement.setAttribute('data-mode', newTheme);
      } catch {}
      if (onModeChange) {
        onModeChange(newTheme);
      }
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('app_mode_change', { detail: { mode: newTheme } }));
      }
    }

    if (renditionRef?.current) {
      try {
        renditionRef.current.themes.select(newTheme);
      } catch {}
    }

    try {
      const contentsList = renditionRef?.current?.getContents() || [];
      contentsList.forEach(contents => {
        if (contents?.document) {
          applyThemeToDoc(contents.document, newTheme);
        }
      });
    } catch {}

    try {
      const iframes = viewerRef?.current?.querySelectorAll('iframe') || [];
      iframes.forEach(iframe => {
        const doc = iframe.contentDocument || iframe.contentWindow?.document;
        if (doc) {
          applyThemeToDoc(doc, newTheme);
        }
      });
    } catch {}

    // Save night mode preference to server
    if (book?.id && typeof fetch !== 'undefined') {
      fetch('/api/book/night-mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          book_id: book.id,
          invert_colors: newTheme === 'dark'
        })
      }).catch(e => console.error('Failed to save night mode:', e));
    }
  }, [book, onModeChange, renditionRef, viewerRef]);

  const cycleTheme = useCallback(() => {
    const themes = ['dark', 'light', 'sepia'];
    const nextIdx = (themes.indexOf(themeRef.current || theme) + 1) % themes.length;
    applyTheme(themes[nextIdx]);
  }, [applyTheme, theme]);

  const changeFontSize = useCallback((delta) => {
    setFontSize(prev => {
      const next = Math.max(70, Math.min(220, prev + delta));
      try {
        if (book?.id) {
          localStorage.setItem(`book_font_size_${book.id}`, String(next));
        }
      } catch {}
      if (renditionRef?.current) {
        renditionRef.current.themes.fontSize(`${next}%`);
      }
      return next;
    });
  }, [book, renditionRef]);

  const resetFontSize = useCallback(() => {
    setFontSize(100);
    try {
      if (book?.id) {
        localStorage.setItem(`book_font_size_${book.id}`, '100');
      }
    } catch {}
    if (renditionRef?.current) {
      renditionRef.current.themes.fontSize('100%');
    }
  }, [book, renditionRef]);

  const viewerBgClass = theme === 'dark'
    ? 'bg-black text-slate-200'
    : theme === 'sepia'
      ? 'bg-[#fbf0d9] text-[#433422]'
      : 'bg-white text-slate-800';

  return {
    theme,
    themeRef,
    fontSize,
    fontSizeRef,
    applyTheme,
    cycleTheme,
    changeFontSize,
    resetFontSize,
    viewerBgClass,
  };
}
