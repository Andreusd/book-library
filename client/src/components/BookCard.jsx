import React, { useState } from 'react';
import { BookOpen, ExternalLink, CheckCircle } from 'lucide-react';
import { useI18n } from '../i18n';

export default function BookCard({ book, onSelectBook, onContextMenu }) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const { t } = useI18n();

  const isFinished = Boolean(book.progress && (book.progress.percent >= 100 || book.progress.status === 'completed'));
  const isNotStarted = Boolean(!book.progress || book.progress.status === 'not_started' || (book.progress.page <= 1 && !isFinished));
  const hasProgress = !isNotStarted && Boolean(book.progress && (book.progress.page > 1 || isFinished));
  const percent = book.progress ? Math.round(book.progress.percent) : 0;

  const handleOpenSystem = (e) => {
    e.stopPropagation();
    fetch('/api/open-system', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ book_id: book.id })
    }).catch(err => console.error('Failed to open system viewer:', err));
  };

  const handleContextMenu = (e) => {
    if (onContextMenu) {
      e.preventDefault();
      onContextMenu(e, book);
    }
  };

  return (
    <div 
      onClick={() => onSelectBook(book)}
      onContextMenu={handleContextMenu}
      className="book-card group cursor-pointer flex flex-col items-center select-none text-left"
    >
      {/* 3D Cover Wrapper */}
      <div className="relative w-full aspect-[1/1.45] rounded-md overflow-hidden bg-neutral-900 border border-neutral-800/80 shadow-md book-cover-container">
        
        {/* Skeleton loading animation */}
        {!imageLoaded && !imageError && (
          <div className="absolute inset-0 bg-neutral-850 animate-pulse flex flex-col items-center justify-center p-4 text-center">
            <BookOpen className="w-8 h-8 text-neutral-600 mb-2" />
            <span className="text-[11px] text-neutral-500 line-clamp-3">{book.title}</span>
          </div>
        )}

        {/* Cover Image */}
        {!imageError ? (
          <img 
            src={book.cover_url} 
            alt={book.title}
            loading="lazy"
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageError(true)}
            className={`w-full h-full object-cover transition-opacity duration-300 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-neutral-800 to-neutral-900 p-4 flex flex-col justify-between border-l-4 border-amber-600">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-500/80">{book.shelf_display}</span>
            <p className="text-xs font-bold text-neutral-200 line-clamp-4 leading-snug">{book.title}</p>
            <span className="text-[10px] text-neutral-500">{book.size_formatted}</span>
          </div>
        )}

        {/* Realistic Left Book Spine Highlight / Shadow Overlay */}
        <div className="absolute inset-y-0 left-0 w-4 book-spine-highlight pointer-events-none" />

        {/* Reading Progress Badge / Ribbon */}
        {hasProgress && (
          <div className={`absolute top-2 right-2 bg-neutral-900/90 backdrop-blur-md border text-[10px] font-medium px-2 py-0.5 rounded-full shadow-lg flex items-center gap-1 ${
            isFinished ? 'border-emerald-500/50 text-emerald-300' : 'border-amber-500/30 text-amber-300'
          }`}>
            {isFinished ? (
              <>
                <CheckCircle className="w-3 h-3 text-emerald-400" />
                <span>{t('completed')}</span>
              </>
            ) : (
              <>
                <span>{t('pageBadge', { page: book.progress.page })}</span>
                <span className="text-neutral-500">•</span>
                <span>{percent}%</span>
              </>
            )}
          </div>
        )}

        {/* Quick Hover Action Buttons */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between p-2.5">
          <button
            onClick={handleOpenSystem}
            className="p-1.5 rounded-lg bg-neutral-900/90 text-neutral-300 hover:text-white hover:bg-neutral-800 transition shadow-md"
            title={t('openInSystemTitle')}
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
          
          <div className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-semibold transition flex items-center gap-1 shadow-lg">
            <BookOpen className="w-3.5 h-3.5" />
            <span>{t('readButton')}</span>
          </div>
        </div>

        {/* Subtle Bottom Reading Progress Bar */}
        {hasProgress && !isFinished && (
          <div className="absolute bottom-0 inset-x-0 h-1 bg-neutral-900/80">
            <div 
              className="h-full bg-amber-400"
              style={{ width: `${percent}%` }}
            />
          </div>
        )}
      </div>

      {/* Book Metadata Under Cover */}
      <div className="w-full mt-2.5 px-0.5">
        <h3 
          className="text-xs font-medium text-neutral-200 group-hover:text-amber-400 transition-colors line-clamp-2 leading-snug"
          title={book.title}
        >
          {book.title}
        </h3>
        <div className="flex items-center justify-between mt-1 text-[11px] text-neutral-500">
          <span className="truncate max-w-[70%]">{book.shelf_display}</span>
          <span className="shrink-0">{book.size_formatted}</span>
        </div>
      </div>
    </div>
  );
}
