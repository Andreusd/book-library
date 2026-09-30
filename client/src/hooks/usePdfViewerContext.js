import { useContext } from 'react';
import { PdfViewerContext } from '../contexts/pdfViewerContext';

/**
 * Hook to consume PDF viewer engine instances, scale, and annotation handlers.
 * Returns safe defaults if used outside PdfViewerContext.Provider.
 */
export function usePdfViewerContext() {
  const ctx = useContext(PdfViewerContext);
  return ctx || {};
}
