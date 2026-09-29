import React, { useRef, useState, useEffect } from 'react';
import { Bookmark, ChevronLeft, ChevronRight, LayoutGrid, Layers, Info } from 'lucide-react';
import { useI18n } from '../i18n';
import { getTagColorConfig } from '../utils/tagColors';

export default function ContinueReading({ 
  books = [], 
  onSelectBook, 
  onOpenDetails,
  onContextMenu, 
  onViewAll, 
  onSelectTag,
  showFileExtension 
}) {
  const { t } = useI18n();
  const scrollContainerRef = useRef(null);
  const [isGridView, setIsGridView] = useState(false);
  const [targetHeight, setTargetHeight] = useState(null);

  useEffect(() => {
    let observer;
    let observedEl = null;

    const getFavoriteCoverEl = () => {
      return (
        document.querySelector('#favorite-books-section .book-card .book-cover-container') ||
        document.querySelector('#favorite-books-section .book-cover-container') ||
        document.querySelector('.book-card .book-cover-container')
      );
    };

    const updateHeight = () => {
      const coverEl = getFavoriteCoverEl();
      if (coverEl) {
        const h = coverEl.getBoundingClientRect().height;
        if (h > 0) {
          setTargetHeight(Math.round(h));
        }
        if (window.ResizeObserver) {
          if (observer && observedEl !== coverEl) {
            observer.disconnect();
            observer = null;
          }
          if (!observer) {
            observedEl = coverEl;
            observer = new ResizeObserver(() => {
              const currentCover = getFavoriteCoverEl();
              if (currentCover) {
                const currentH = currentCover.getBoundingClientRect().height;
                if (currentH > 0) {
                  setTargetHeight(Math.round(currentH));
                }
              }
            });
            observer.observe(coverEl);
          }
        }
      } else {
        const container = scrollContainerRef.current;
        if (container) {
          const w = container.clientWidth;
          if (w > 0) {
            let cardWidth;
            if (w >= 1280) cardWidth = (w - 5 * 24) / 6;
            else if (w >= 1024) cardWidth = (w - 4 * 24) / 5;
            else if (w >= 768) cardWidth = (w - 3 * 24) / 4;
            else if (w >= 640) cardWidth = (w - 2 * 24) / 3;
            else cardWidth = (w - 20) / 2;
            setTargetHeight(Math.round(cardWidth * 1.45));
          }
        }
      }
    };

    updateHeight();

    const t1 = setTimeout(updateHeight, 50);
    const t2 = setTimeout(updateHeight, 200);
    const t3 = setTimeout(updateHeight, 500);

    window.addEventListener('resize', updateHeight);

    return () => {
      if (observer) observer.disconnect();
      window.removeEventListener('resize', updateHeight);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [books]);

  const shouldShowExtension = showFileExtension !== undefined 
    ? Boolean(showFileExtension) 
    : (() => {
        try {
          return localStorage.getItem('show_file_extension') !== 'false';
        } catch (e) {
          return true;
        }
      })();

  const inProgressBooks = (books || []).filter(
    b => b.progress && 
         b.progress.status !== 'not_started' && 
         b.progress.status !== 'completed' && 
         (b.progress.page > 1 || Boolean(b.progress.cfi) || b.progress.percent > 0) && 
         b.progress.percent < 100
  );

  if (inProgressBooks.length === 0) return null;

  const scroll = (direction) => {
    if (!scrollContainerRef.current) return;
    const scrollAmount = Math.max(200, Math.floor(scrollContainerRef.current.clientWidth * 0.75));
    scrollContainerRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth'
    });
  };

  const showControls = inProgressBooks.length > 2;

  return (
    <section className="mb-8">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Bookmark className="w-5 h-5 text-emerald-500 fill-emerald-500" />
          {onViewAll ? (
            <button
              onClick={onViewAll}
              className="text-base font-semibold text-neutral-100 hover:text-emerald-400 transition-colors cursor-pointer text-left"
              title={t('continueReading')}
            >
              <h2>{t('continueReading')}</h2>
            </button>
          ) : (
            <h2 className="text-base font-semibold text-neutral-100">{t('continueReading')}</h2>
          )}
          <span className="text-xs text-neutral-500 font-normal">
            {t('booksInProgress', { count: inProgressBooks.length })}
          </span>
        </div>

        {showControls && (
          <div className="flex items-center gap-2">
            {/* Toggle View (Carousel / Grid) */}
            <button
              onClick={() => setIsGridView(prev => !prev)}
              className="text-xs font-medium text-neutral-400 hover:text-emerald-400 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-neutral-900/60 hover:bg-neutral-800 border border-neutral-800 transition-colors cursor-pointer"
              title={isGridView ? t('showCarousel') : t('viewAll')}
            >
              {isGridView ? (
                <>
                  <Layers className="w-3.5 h-3.5" />
                  <span>{t('showCarousel')}</span>
                </>
              ) : (
                <>
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>{t('viewAll')}</span>
                </>
              )}
            </button>

            {/* Scroll Navigation Buttons (Only in carousel mode) */}
            {!isGridView && (
              <div className="flex items-center gap-1 pl-1 border-l border-neutral-800">
                <button
                  onClick={() => scroll('left')}
                  className="p-1 rounded-lg text-neutral-400 hover:text-neutral-200 bg-neutral-900/60 hover:bg-neutral-800 border border-neutral-800 transition-colors cursor-pointer"
                  aria-label="Scroll left"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => scroll('right')}
                  className="p-1 rounded-lg text-neutral-400 hover:text-neutral-200 bg-neutral-900/60 hover:bg-neutral-800 border border-neutral-800 transition-colors cursor-pointer"
                  aria-label="Scroll right"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Books Container */}
      <div
        ref={scrollContainerRef}
        className={
          isGridView
            ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 sm:gap-6'
            : 'flex gap-5 sm:gap-6 overflow-x-auto no-scrollbar scroll-smooth py-1 px-0.5'
        }
      >
        {inProgressBooks.map((book) => {
          const percent = book.progress ? Math.round(book.progress.percent) : 0;

          return (
            <div
              key={book.id}
              onClick={() => onSelectBook(book)}
              onContextMenu={(e) => {
                if (onContextMenu) {
                  e.preventDefault();
                  onContextMenu(e, book);
                }
              }}
              style={{ 
                height: targetHeight ? `${targetHeight}px` : undefined,
                maxHeight: targetHeight ? `${targetHeight}px` : undefined
              }}
              className={`group cursor-pointer bg-neutral-900/60 hover:bg-neutral-800/90 border border-neutral-800 hover:border-emerald-500/40 rounded-xl p-2.5 sm:p-3 gap-3 sm:gap-3.5 transition-all duration-300 shadow-sm hover:shadow-xl hover:-translate-y-1 flex select-none overflow-hidden ${
                !isGridView
                  ? 'w-full sm:w-[calc((200%-1.5rem)/3)] md:w-[calc((100%-1.5rem)/2)] lg:w-[calc((200%-4.5rem)/5)] xl:w-[calc((100%-3rem)/3)] shrink-0'
                  : 'w-full'
              }`}
            >
              {/* Cover on Left */}
              <div className="h-full aspect-[1/1.45] max-w-[40%] sm:max-w-[44%] shrink-0 rounded-md overflow-hidden bg-neutral-950 border border-neutral-800/80 shadow-md relative continue-reading-cover">
                <img
                  src={book.cover_url}
                  alt={book.title}
                  loading="lazy"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                {/* Left Book Spine Highlight Overlay */}
                <div className="absolute inset-y-0 left-0 w-3.5 book-spine-highlight pointer-events-none" />

                {shouldShowExtension && (
                  <div className="absolute bottom-1.5 right-1.5 z-10 pointer-events-none">
                    <span className={`px-1.5 py-0.5 text-[8px] font-bold tracking-wider rounded backdrop-blur-md uppercase shadow-sm ${
                      (book.format === 'epub' || book.filename?.toLowerCase().endsWith('.epub'))
                        ? 'bg-neutral-950/85 border border-indigo-500/50 text-indigo-300'
                        : 'bg-neutral-950/85 border border-rose-500/50 text-rose-300'
                    }`}>
                      {(book.format === 'epub' || book.filename?.toLowerCase().endsWith('.epub')) ? 'EPUB' : 'PDF'}
                    </span>
                  </div>
                )}
              </div>

              {/* Info & Progress */}
              <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                <div>
                  {/* Shelf / Tags & Details Button */}
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                      {book.shelf_display && (
                        <span className="text-[10px] font-medium text-emerald-500/90 uppercase tracking-wider truncate">
                          {book.shelf_display}
                        </span>
                      )}
                      {book.tags && book.tags.slice(0, 1).map((tg) => {
                        const cfg = getTagColorConfig(tg.color);
                        return (
                          <span
                            key={tg.id}
                            onClick={(e) => {
                              if (onSelectTag) {
                                e.stopPropagation();
                                onSelectTag(tg);
                              }
                            }}
                            className={`text-[8px] px-1.5 py-0.5 rounded font-medium border ${cfg.badge} truncate max-w-[80px] hover:brightness-125 transition cursor-pointer`}
                            title={tg.name}
                          >
                            {tg.name}
                          </span>
                        );
                      })}
                    </div>
                    {onOpenDetails && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenDetails(book);
                        }}
                        className="p-1 rounded-md text-neutral-400 hover:text-sky-300 hover:bg-neutral-800 transition opacity-0 group-hover:opacity-100 cursor-pointer shrink-0"
                        title={t('viewDetails')}
                      >
                        <Info className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Title */}
                  <h3 className="text-xs sm:text-sm font-semibold text-neutral-100 group-hover:text-emerald-400 transition-colors line-clamp-2 leading-snug">
                    {book.title}
                  </h3>

                  {/* Author */}
                  {book.author && (
                    <p className="text-[11px] text-neutral-400 truncate mt-0.5" title={book.author}>
                      {book.author}
                    </p>
                  )}
                </div>

                {/* Bottom Progress Area */}
                <div className="mt-auto pt-1.5 border-t border-neutral-800/60">
                  <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-neutral-400 mb-1">
                    <span className="truncate">
                      {(book.format === 'epub' || book.filename?.toLowerCase().endsWith('.epub')) && (!book.progress?.page || book.progress.page <= 1)
                        ? t('progress')
                        : t('pageOf', { page: book.progress?.page || 1, total: book.progress?.total_pages || '?' })}
                    </span>
                    <span className="font-semibold text-emerald-400 shrink-0 ml-1">{percent}%</span>
                  </div>

                  {/* Green Progress Bar */}
                  <div className="w-full h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full transition-all duration-300"
                      style={{ width: `${percent}%` }}
                    />
                  </div>

                  {/* Action & Size Footer */}
                  <div className="flex items-center justify-between mt-1.5 text-[10px] sm:text-[11px]">
                    <span className="text-neutral-500 truncate">{book.size_formatted}</span>
                    <div className="px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 group-hover:bg-emerald-500 group-hover:text-neutral-950 font-medium text-[10px] sm:text-[11px] transition-colors flex items-center gap-1 shrink-0">
                      <Bookmark className="w-3 h-3" />
                      <span>{t('readButton')}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
