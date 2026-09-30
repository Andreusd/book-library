import React from 'react';
import { Plus } from 'lucide-react';
import { getTagColorConfig } from '../utils/tagColors';
import { useI18n } from '../i18n';

/**
 * Section header displaying the current shelf, folder, or tag title,
 * matching item counts or search result statistics, and action buttons.
 */
export default function ShelfHeader({
  selectedShelf,
  debouncedQuery,
  shelves,
  tags,
  books,
  totalBooks,
  isTagFilter,
  currentTagObj,
  currentShelfObj,
  onOpenTagManager,
}) {
  const { t } = useI18n();

  if (!selectedShelf && !debouncedQuery) {
    return null;
  }

  return (
    <div className="flex items-center justify-between mb-6 pb-2 border-b border-neutral-800">
      <div>
        <h2 className="text-lg sm:text-xl font-bold text-neutral-100 tracking-tight flex items-center gap-2">
          {selectedShelf === 'continue-reading'
            ? t('continueReading')
            : selectedShelf === 'favorites' 
              ? t('favorites') 
              : selectedShelf === 'folders'
                ? t('folders')
                : selectedShelf === 'all-books'
                  ? t('allBooksLibrary')
                  : selectedShelf === 'tags'
                    ? t('tags')
                  : isTagFilter && currentTagObj
                    ? (
                      <>
                        <span className={`w-3 h-3 rounded-full ${getTagColorConfig(currentTagObj.color).dot} shrink-0`} />
                        <span>{currentTagObj.name}</span>
                      </>
                    )
                    : currentShelfObj 
                      ? currentShelfObj.name 
                      : t('allBooksLibrary')}
        </h2>
        <p className="text-xs text-neutral-400 mt-0.5">
          {debouncedQuery 
            ? t('searchResults', { 
                query: debouncedQuery, 
                count: selectedShelf === 'folders'
                  ? shelves.filter(s => s.name.toLowerCase().includes(debouncedQuery.toLowerCase())).length
                  : selectedShelf === 'tags'
                    ? tags.filter(tg => tg.name.toLowerCase().includes(debouncedQuery.toLowerCase())).length
                    : books.length 
              })
            : selectedShelf === 'folders'
              ? t('foldersCount', { count: shelves.length })
              : selectedShelf === 'all-books'
                ? t('allBooksCount', { count: totalBooks || books.length })
                : selectedShelf === 'tags'
                  ? (tags.length === 1 ? (t('tagsCount_one') || '(1 tag)') : (t('tagsCount', { count: tags.length }) || `(${tags.length} tags)`))
                : isTagFilter
                  ? t('booksTaggedCount', { count: books.length })
                  : t('booksInShelf', { count: books.length })}
        </p>
      </div>

      {selectedShelf === 'tags' && (
        <button
          type="button"
          onClick={onOpenTagManager}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 text-indigo-300 text-xs font-medium transition cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{t('manageTags')}</span>
        </button>
      )}
    </div>
  );
}
