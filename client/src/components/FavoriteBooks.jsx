import React from 'react';
import { Heart, ChevronRight } from 'lucide-react';
import BookCard from './BookCard';
import { useI18n } from '../i18n';

export default function FavoriteBooks({ 
  books = [], 
  onSelectBook, 
  onContextMenu, 
  onToggleFavorite,
  onViewAll
}) {
  const { t } = useI18n();

  if (!books || books.length === 0) return null;

  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Heart className="w-5 h-5 text-rose-500 fill-rose-500" />
          <h2 className="text-base font-semibold text-neutral-100">{t('favorites')}</h2>
          <span className="text-xs text-neutral-500 font-normal">
            {t('favoriteBooksCount', { count: books.length })}
          </span>
        </div>
        {onViewAll && books.length > 2 && (
          <button
            onClick={onViewAll}
            className="text-xs font-medium text-rose-400 hover:text-rose-300 flex items-center gap-1 transition-colors cursor-pointer"
          >
            <span>{t('viewAll')}</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5 sm:gap-6 overflow-hidden">
        {books.slice(0, 6).map((book, idx) => {
          const visibilityClass =
            idx < 2 ? 'block' :
            idx === 2 ? 'hidden sm:block' :
            idx === 3 ? 'hidden md:block' :
            idx === 4 ? 'hidden lg:block' :
            'hidden xl:block';

          return (
            <div key={`fav-${book.id}`} className={visibilityClass}>
              <BookCard
                book={book}
                isFavorite={true}
                onSelectBook={onSelectBook}
                onContextMenu={onContextMenu}
                onToggleFavorite={onToggleFavorite}
              />
            </div>
          );
        })}
      </div>
    </section>
  );
}
