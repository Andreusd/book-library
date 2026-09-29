import React from 'react';
import { AlertTriangle, ArrowLeft, Download, RefreshCw } from 'lucide-react';

export default class ReaderErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Reader encountered an unhandled rendering error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      const { book, onClose } = this.props;
      const downloadUrl = book?.id ? `/api/book-file/${encodeURIComponent(book.id)}` : null;

      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/95 text-slate-100 p-6 backdrop-blur-md">
          <div className="max-w-lg w-full bg-slate-900 border border-red-500/30 rounded-2xl p-6 sm:p-8 shadow-2xl flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 mb-5">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <h2 className="text-xl font-bold text-white mb-2">
              Unable to Open Book
            </h2>
            <p className="text-sm text-slate-400 mb-4 max-w-sm">
              An error occurred while parsing and rendering <span className="font-medium text-slate-200">"{book?.title || 'this book'}"</span>. The file format or content might be malformed or corrupted.
            </p>

            {this.state.error?.message && (
              <div className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs font-mono text-red-300 text-left overflow-x-auto mb-6 max-h-28">
                {this.state.error.message}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-center gap-3 w-full">
              {onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Return to Library
                </button>
              )}

              <button
                type="button"
                onClick={this.handleReset}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors shadow-lg shadow-indigo-600/20"
              >
                <RefreshCw className="w-4 h-4" />
                Retry Loading
              </button>

              {downloadUrl && (
                <a
                  href={downloadUrl}
                  download={book?.filename || 'book'}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Download File
                </a>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
