import React, { useMemo } from 'react';
import { BookActionsContext } from './bookActionsContext';

/**
 * Provider that supplies book interaction callbacks and favorite status
 * to nested components, eliminating deep prop drilling through carousels and grids.
 */
export function BookActionsProvider({
  children,
  openReader,
  openDetails,
  openContextMenu,
  toggleFavorite,
  selectTag,
  favoriteIds,
  showFileExtension,
}) {
  const value = useMemo(() => {
    const isFavorite = (bookId) => {
      if (!bookId) return false;
      if (favoriteIds instanceof Set) {
        return favoriteIds.has(bookId);
      }
      if (Array.isArray(favoriteIds)) {
        return favoriteIds.includes(bookId);
      }
      return Boolean(favoriteIds?.[bookId]);
    };

    return {
      openReader: openReader || (() => {}),
      openDetails: openDetails || (() => {}),
      openContextMenu: openContextMenu || (() => {}),
      toggleFavorite: toggleFavorite || (() => {}),
      selectTag: selectTag || (() => {}),
      isFavorite,
      showFileExtension: Boolean(showFileExtension),
    };
  }, [
    openReader,
    openDetails,
    openContextMenu,
    toggleFavorite,
    selectTag,
    favoriteIds,
    showFileExtension,
  ]);

  return (
    <BookActionsContext.Provider value={value}>
      {children}
    </BookActionsContext.Provider>
  );
}
