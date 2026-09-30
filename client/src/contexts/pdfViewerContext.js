import { createContext } from 'react';

/**
 * Context for PDF reader engine instances, scale, theme options, and annotations handlers.
 * Shared between PdfViewer and nested PdfPageView components to eliminate massive prop signatures.
 */
export const PdfViewerContext = createContext(null);
