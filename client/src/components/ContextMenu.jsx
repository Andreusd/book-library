import React, { useEffect, useRef, useState } from 'react';
import { 
  BookOpen, ExternalLink, RotateCcw, CheckCircle2, 
  Copy, Check 
} from 'lucide-react';
import { useI18n } from '../i18n';

export default function ContextMenu({ 
  x, 
  y, 
  book, 
  onClose, 
  onOpenReader, 
  onOpenSystem, 
  onMarkStatus 
}) {
  const menuRef = useRef(null);
  const [copied, setCopied] = useState(false);
  const { t } = useI18n();

  // Close on outside click or scroll or escape
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose();
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    const handleScroll = () => {
      onClose();
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', handleScroll, true);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [onClose]);

  // Adjust coordinates to ensure the menu stays within viewport boundaries
  const menuWidth = 230;
  const menuHeight = 240;
  const posX = Math.min(Math.max(10, x), window.innerWidth - menuWidth - 10);
  const posY = Math.min(Math.max(10, y), window.innerHeight - menuHeight - 10);

  const handleCopyPath = () => {
    if (book?.path) {
      navigator.clipboard.writeText(book.path).then(() => {
        setCopied(true);
        setTimeout(() => {
          onClose();
        }, 600);
      });
    }
  };

  const isCompleted = Boolean(
    book.progress && (book.progress.percent >= 100 || book.progress.status === 'completed')
  );
  const isNotStarted = Boolean(
    !book.progress || 
    book.progress.status === 'not_started' || 
    (book.progress.page <= 1 && (book.progress.percent || 0) === 0)
  );

  return (
    <div
      ref={menuRef}
      style={{ left: `${posX}px`, top: `${posY}px` }}
      className="fixed z-50 w-56 bg-neutral-900/95 backdrop-blur-xl border border-neutral-750 rounded-xl shadow-2xl py-1.5 text-xs text-neutral-200 select-none animate-in fade-in zoom-in-95 duration-100"
    >
      {/* Book header snippet */}
      <div className="px-3 py-1.5 border-b border-neutral-800/80 mb-1">
        <p className="font-semibold text-neutral-100 truncate text-[11px] leading-tight" title={book.title}>
          {book.title}
        </p>
        <span className="text-[10px] text-amber-500 font-medium">{book.shelf_display}</span>
      </div>

      {/* Primary Actions */}
      <button
        onClick={() => {
          onOpenReader(book);
          onClose();
        }}
        className="w-full px-3 py-1.5 flex items-center gap-2.5 hover:bg-amber-500/15 hover:text-amber-300 text-left transition"
      >
        <BookOpen className="w-4 h-4 text-amber-400 shrink-0" />
        <span>{t('readNow')}</span>
      </button>

      <button
        onClick={() => {
          onOpenSystem(book);
          onClose();
        }}
        className="w-full px-3 py-1.5 flex items-center gap-2.5 hover:bg-neutral-800 text-neutral-300 hover:text-neutral-100 text-left transition"
      >
        <ExternalLink className="w-4 h-4 text-neutral-400 shrink-0" />
        <span>{t('openInWindowsApp')}</span>
      </button>

      <div className="my-1 border-t border-neutral-800" />

      {/* Status Toggles */}
      <button
        onClick={() => {
          onMarkStatus(book, 'not_started');
          onClose();
        }}
        disabled={isNotStarted}
        className="w-full px-3 py-1.5 flex items-center gap-2.5 hover:bg-neutral-800 text-neutral-300 hover:text-neutral-100 disabled:opacity-40 disabled:hover:bg-transparent text-left transition"
      >
        <RotateCcw className="w-4 h-4 text-sky-400 shrink-0" />
        <span>{t('markNotStarted')}</span>
      </button>

      <button
        onClick={() => {
          onMarkStatus(book, 'completed');
          onClose();
        }}
        disabled={isCompleted}
        className="w-full px-3 py-1.5 flex items-center gap-2.5 hover:bg-neutral-800 text-neutral-300 hover:text-neutral-100 disabled:opacity-40 disabled:hover:bg-transparent text-left transition"
      >
        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
        <span>{t('markCompleted')}</span>
      </button>

      <div className="my-1 border-t border-neutral-800" />

      {/* Copy Path Action */}
      <button
        onClick={handleCopyPath}
        className="w-full px-3 py-1.5 flex items-center gap-2.5 hover:bg-neutral-800 text-neutral-300 hover:text-neutral-100 text-left transition"
      >
        {copied ? (
          <>
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="text-emerald-300 font-medium">{t('pathCopied')}</span>
          </>
        ) : (
          <>
            <Copy className="w-4 h-4 text-neutral-400 shrink-0" />
            <span>{t('copyFilePath')}</span>
          </>
        )}
      </button>
    </div>
  );
}
