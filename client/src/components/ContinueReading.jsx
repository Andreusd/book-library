import React from 'react';
import { Bookmark, ChevronRight } from 'lucide-react';
import { useI18n } from '../i18n';

export default function ContinueReading({ books, onSelectBook, onContextMenu, onViewAll }) {
  const { t } = useI18n();

  const inProgressBooks = (books || []).filter(
    b => b.progress && 
         b.progress.status !== 'not_started' && 
         b.progress.status !== 'completed' && 
         b.progress.page > 1 && 
         b.progress.percent < 100
  );

  if (inProgressBooks.length === 0) return null;

  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Bookmark className="w-5 h-5 text-emerald-500 fill-emerald-500" />
          <h2 className="text-base font-semibold text-neutral-100">{t('continueReading')}</h2>
          <span className="text-xs text-neutral-500 font-normal">
            {t('booksInProgress', { count: inProgressBooks.length })}
          </span>
        </div>
        {onViewAll && inProgressBooks.length > 1 && (
          <button
            onClick={onViewAll}
            className="text-xs font-medium text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition-colors cursor-pointer"
          >
            <span>{t('viewAll')}</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 overflow-hidden">
        {inProgressBooks.slice(0, 4).map((book, idx) => {
          const percent = book.progress ? Math.round(book.progress.percent) : 0;
          const visibilityClass = 
            idx === 0 ? 'flex' :
            idx === 1 ? 'hidden sm:flex' :
            idx === 2 ? 'hidden lg:flex' :
            'hidden xl:flex';

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
              className={`group cursor-pointer bg-neutral-900/60 hover:bg-neutral-850 border border-neutral-800 hover:border-emerald-500/40 rounded-xl p-3 gap-3.5 transition-all duration-200 shadow-sm hover:shadow-md ${visibilityClass}`}
            >
              {/* Mini Cover */}
              <div className="w-16 aspect-[1/1.45] rounded-md overflow-hidden bg-neutral-950 shrink-0 border border-neutral-800 shadow relative">
                <img
                  src={book.cover_url}
                  alt={book.title}
                  loading="lazy"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>

              {/* Info & Progress */}
              <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                <div>
                  <span className="text-[10px] font-medium text-emerald-500/90 uppercase tracking-wider">
                    {book.shelf_display}
                  </span>
                  <h3 className="text-xs font-semibold text-neutral-200 group-hover:text-emerald-400 transition-colors line-clamp-2 leading-tight mt-0.5">
                    {book.title}
                  </h3>
                </div>

                <div className="mt-2">
                  <div className="flex items-center justify-between text-[11px] text-neutral-400 mb-1.5">
                    <span>
                      {t('pageOf', { page: book.progress?.page || 1, total: book.progress?.total_pages || '?' })}
                    </span>
                    <span className="font-semibold text-emerald-400">{percent}%</span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full"
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
