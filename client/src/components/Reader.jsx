import React, { Suspense, lazy } from 'react';
import ReaderErrorBoundary from './ReaderErrorBoundary';
import { Loader2 } from 'lucide-react';

// Dynamically code-split both readers to keep initial bundle size lean
const EpubViewer = lazy(() => import('./EpubViewer'));
const PdfViewer = lazy(() => import('./PdfViewer'));

function ReaderLoadingFallback({ book }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950 text-slate-100 p-6">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
        <div className="text-center">
          <p className="text-base font-medium text-slate-200">
            Opening {book?.title ? `"${book.title}"` : 'Book'}...
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Loading reader engine
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Universal Reader switcher with dynamic code-splitting and error boundary.
 * Delays loading PDF.js and epub.js until a book is actively opened.
 */
export default function Reader(props) {
  const { book, showFileExtension } = props;
  const isEpub = book?.format === 'epub' || book?.filename?.toLowerCase().endsWith('.epub');

  const shouldShowExtension = showFileExtension !== undefined 
    ? Boolean(showFileExtension) 
    : (() => {
        try {
          return localStorage.getItem('show_file_extension') !== 'false';
        } catch {
          return true;
        }
      })();

  return (
    <ReaderErrorBoundary book={book} onClose={props.onClose}>
      <Suspense fallback={<ReaderLoadingFallback book={book} />}>
        {isEpub ? (
          <EpubViewer {...props} showFileExtension={shouldShowExtension} />
        ) : (
          <PdfViewer {...props} showFileExtension={shouldShowExtension} />
        )}
      </Suspense>
    </ReaderErrorBoundary>
  );
}
