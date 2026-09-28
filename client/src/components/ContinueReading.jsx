import React, { useRef, useState } from 'react';
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
    const scrollAmount = 340;
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
            ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
            : 'flex gap-4 overflow-x-auto no-scrollbar scroll-smooth py-1 px-0.5'
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
              className={`group cursor-pointer bg-neutral-900/60 hover:bg-neutral-800 border border-neutral-800 hover:border-emerald-500/40 rounded-xl p-3 gap-3.5 transition-all duration-200 shadow-sm hover:shadow-md flex select-none ${
                !isGridView ? 'w-72 sm:w-80 shrink-0' : 'w-full'
              }`}
            >
              {/* Mini Cover */}
              <div className="w-16 aspect-[1/1.45] rounded-md overflow-hidden bg-neutral-950 shrink-0 border border-neutral-800 shadow relative">
                <img
                  src={book.cover_url}
                  alt={book.title}
                  loading="lazy"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                {shouldShowExtension && (
                  <div className="absolute bottom-1 right-1 z-10 pointer-events-none">
                    <span className={`px-1 py-0.2 text-[8px] font-bold tracking-wider rounded backdrop-blur-md uppercase shadow-sm ${
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
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                      <span className="text-[10px] font-medium text-emerald-500/90 uppercase tracking-wider truncate">
                        {book.shelf_display}
                      </span>
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
                            className={`text-[8px] px-1 py-0.2 rounded font-medium border ${cfg.badge} truncate max-w-[80px] hover:brightness-125 transition cursor-pointer`}
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
                  <h3 className="text-xs font-semibold text-neutral-200 group-hover:text-emerald-400 transition-colors line-clamp-2 leading-tight mt-0.5">
                    {book.title}
                  </h3>
                </div>

                <div className="mt-2">
                  <div className="flex items-center justify-between text-[11px] text-neutral-400 mb-1.5">
                    <span>
                      {(book.format === 'epub' || book.filename?.toLowerCase().endsWith('.epub')) && (!book.progress?.page || book.progress.page <= 1)
                        ? t('progress')
                        : t('pageOf', { page: book.progress?.page || 1, total: book.progress?.total_pages || '?' })}
                    </span>
                    <span className="font-semibold text-emerald-400">{percent}%</span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full transition-all duration-300"
                      style={{ width: `${percent}%` }}
                    />
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
