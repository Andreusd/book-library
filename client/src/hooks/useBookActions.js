import { useContext } from 'react';
import { BookActionsContext } from '../contexts/bookActionsContext';

/**
 * Hook to consume book actions anywhere in the component hierarchy.
 * Returns safe no-op fallbacks if used outside BookActionsProvider.
 */
export function useBookActions() {
  const ctx = useContext(BookActionsContext);
  if (!ctx) {
    return {
      openReader: () => {},
      openDetails: () => {},
      openContextMenu: () => {},
      toggleFavorite: () => {},
      selectTag: () => {},
      isFavorite: () => false,
      showFileExtension: true,
    };
  }
  return ctx;
}
