import React from 'react';
import { Heart } from 'lucide-react';
import BookCard from './BookCard';
import { useI18n } from '../i18n';

export default function FavoriteBooks({ 
  books = [], 
  onSelectBook, 
  onContextMenu, 
  onToggleFavorite 
}) {
  const { t } = useI18n();

  if (!books || books.length === 0) return null;

  return (
    <section className="mb-8">
      <div className="flex items-center gap-2 mb-4">
        <Heart className="w-5 h-5 text-rose-500 fill-rose-500" />
        <h2 className="text-base font-semibold text-neutral-100">{t('favorites')}</h2>
        <span className="text-xs text-neutral-500 font-normal">
          {t('favoriteBooksCount', { count: books.length })}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5 sm:gap-6">
        {books.map((book) => (
          <BookCard
            key={`fav-${book.id}`}
            book={book}
            isFavorite={true}
            onSelectBook={onSelectBook}
            onContextMenu={onContextMenu}
            onToggleFavorite={onToggleFavorite}
          />
        ))}
      </div>
    </section>
  );
}
