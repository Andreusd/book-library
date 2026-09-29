import { useState, useEffect, useRef, useCallback } from 'react';
import { extractPdfPageText } from '../utils/textToSpeech';
import { useI18n } from '../i18n';

/**
 * Custom hook to manage PDF Text-to-Speech (Read Aloud) state,
 * page text extraction, and reading synchronization.
 */
export function usePdfTts({ pdfDoc, currentPage, isDualPage, spread }) {
  const { t } = useI18n();
  const [ttsOpen, setTtsOpen] = useState(false);
  const [ttsText, setTtsText] = useState('');
  const [ttsMode, setTtsMode] = useState('page'); // 'page' | 'selection'
  const [ttsPageNumber, setTtsPageNumber] = useState(currentPage);

  const ttsOpenRef = useRef(ttsOpen);
  useEffect(() => {
    ttsOpenRef.current = ttsOpen;
  }, [ttsOpen]);

  const startReadingPage = useCallback(async (targetPage, forcedMode = 'page') => {
    if (!pdfDoc) return;
    const pageToRead = targetPage || currentPage;
    setTtsMode(forcedMode);
    setTtsPageNumber(pageToRead);

    let fullText = '';
    if (isDualPage && spread) {
      const leftText = spread.left ? await extractPdfPageText(pdfDoc, spread.left) : '';
      const rightText = spread.right ? await extractPdfPageText(pdfDoc, spread.right) : '';
      fullText = [leftText, rightText].filter(Boolean).join('\n\n');
    } else {
      fullText = await extractPdfPageText(pdfDoc, pageToRead);
    }

    if (fullText && fullText.trim()) {
      setTtsText(fullText.trim());
      setTtsOpen(true);
    } else {
      alert(t('noTextFoundToRead'));
    }
  }, [pdfDoc, currentPage, isDualPage, spread, t]);

  const toggleTts = useCallback(() => {
    if (ttsOpen) {
      setTtsOpen(false);
    } else {
      startReadingPage(currentPage);
    }
  }, [ttsOpen, startReadingPage, currentPage]);

  const handleReadSelection = useCallback((selectedText) => {
    if (!selectedText || !selectedText.trim()) return;
    setTtsMode('selection');
    setTtsPageNumber(currentPage);
    setTtsText(selectedText.trim());
    setTtsOpen(true);
  }, [currentPage]);

  // When currentPage changes while TTS is actively reading in page mode, read new page
  useEffect(() => {
    if (ttsOpenRef.current && ttsMode === 'page' && pdfDoc) {
      startReadingPage(currentPage, 'page');
    }
  }, [currentPage, startReadingPage, ttsMode, pdfDoc]);

  return {
    ttsOpen,
    setTtsOpen,
    ttsOpenRef,
    ttsText,
    setTtsText,
    ttsMode,
    ttsPageNumber,
    startReadingPage,
    toggleTts,
    handleReadSelection,
  };
}
