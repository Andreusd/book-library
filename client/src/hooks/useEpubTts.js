import { useState, useRef, useEffect, useCallback } from 'react';
import { extractEpubVisibleText } from '../utils/textToSpeech';
import { useI18n } from '../i18n';

/**
 * Hook for Text-to-Speech (TTS) inside EPUB viewer.
 */
export function useEpubTts({ renditionRef, pageInfo, locationInfo }) {
  const { t } = useI18n();

  const [ttsOpen, setTtsOpen] = useState(false);
  const [ttsText, setTtsText] = useState('');
  const [ttsMode, setTtsMode] = useState('page'); // 'page' | 'selection'
  const [ttsPageNumber, setTtsPageNumber] = useState(1);

  const ttsOpenRef = useRef(false);
  useEffect(() => {
    ttsOpenRef.current = ttsOpen;
  }, [ttsOpen]);

  const startReadingCurrentView = useCallback((forcedMode = 'page') => {
    if (!renditionRef?.current) return;
    const text = extractEpubVisibleText(renditionRef.current);
    setTtsMode(forcedMode);
    setTtsPageNumber(pageInfo?.page || 1);

    if (text && text.trim()) {
      setTtsText(text.trim());
      setTtsOpen(true);
    } else {
      if (typeof window !== 'undefined' && window.alert) {
        window.alert(t('noTextFoundToRead'));
      }
    }
  }, [pageInfo?.page, renditionRef, t]);

  const toggleTts = useCallback(() => {
    if (ttsOpen) {
      setTtsOpen(false);
    } else {
      startReadingCurrentView('page');
    }
  }, [ttsOpen, startReadingCurrentView]);

  const handleReadSelection = useCallback((selectedText) => {
    if (!selectedText || !selectedText.trim()) return;
    setTtsMode('selection');
    setTtsPageNumber(pageInfo?.page || 1);
    setTtsText(selectedText.trim());
    setTtsOpen(true);
  }, [pageInfo?.page]);

  // When location changes while TTS is actively reading in page mode, update text to read the new view
  useEffect(() => {
    if (ttsOpenRef.current && ttsMode === 'page' && renditionRef?.current) {
      const timer = setTimeout(() => {
        const text = extractEpubVisibleText(renditionRef.current);
        if (text && text.trim()) {
          setTtsText(text.trim());
          setTtsPageNumber(pageInfo?.page || 1);
        }
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [locationInfo?.cfi, ttsMode, pageInfo?.page, renditionRef]);

  return {
    ttsOpen,
    setTtsOpen,
    ttsOpenRef,
    ttsText,
    setTtsText,
    ttsMode,
    setTtsMode,
    ttsPageNumber,
    startReadingCurrentView,
    toggleTts,
    handleReadSelection,
  };
}
