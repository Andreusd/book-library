import React from 'react';
import { Bookmark } from 'lucide-react';
import { useI18n } from '../i18n';

export default function ContinueReading({ books, onSelectBook, onContextMenu }) {
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
      <div className="flex items-center gap-2 mb-4">
        <Bookmark className="w-5 h-5 text-amber-500" />
        <h2 className="text-base font-semibold text-neutral-100">{t('continueReading')}</h2>
        <span className="text-xs text-neutral-500 font-normal">
          {t('booksInProgress', { count: inProgressBooks.length })}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
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
              className="group cursor-pointer bg-neutral-900/60 hover:bg-neutral-850 border border-neutral-800 hover:border-amber-500/40 rounded-xl p-3 flex gap-3.5 transition-all duration-200 shadow-sm hover:shadow-md"
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
                  <span className="text-[10px] font-medium text-amber-500/90 uppercase tracking-wider">
                    {book.shelf_display}
                  </span>
                  <h3 className="text-xs font-semibold text-neutral-200 group-hover:text-amber-400 transition-colors line-clamp-2 leading-tight mt-0.5">
                    {book.title}
                  </h3>
                </div>

                <div className="mt-2">
                  <div className="flex items-center justify-between text-[11px] text-neutral-400 mb-1.5">
                    <span>
                      {t('pageOf', { page: book.progress?.page || 1, total: book.progress?.total_pages || '?' })}
                    </span>
                    <span className="font-semibold text-amber-400">{percent}%</span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-amber-600 to-amber-400 rounded-full"
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
