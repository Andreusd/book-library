import React from 'react';
import ContinueReading from './ContinueReading';
import FavoriteBooks from './FavoriteBooks';
import LibraryFolders from './LibraryFolders';
import LibraryTags from './LibraryTags';

/**
 * Homepage carousels displayed when browsing the library root without an active filter.
 * Renders Continue Reading, Favorite Books, Folders, and Tags carousels.
 * Book interactions are automatically provided via BookActionsContext.
 */
export default function LibraryHome({
  selectedShelf,
  debouncedQuery,
  continueReading = [],
  favorites = [],
  shelves = [],
  tags = [],
  books = [],
  navigateToShelf,
  modals,
  onShelfContextMenu,
  onOpenTagManager,
  // Backwards-compatible optional prop overrides
  openReader,
  handleOpenDetails,
  handleToggleFavorite,
  showFileExtension,
}) {
  if (selectedShelf || debouncedQuery) {
    return null;
  }

  const handleShelfContext = onShelfContextMenu || modals?.openShelfContextMenu;
  const handleOpenTags = onOpenTagManager || (() => modals?.openTagModal(null));

  return (
    <>
      {/* Continue Reading Shelf */}
      {continueReading.length > 0 && (
        <ContinueReading 
          books={continueReading} 
          onSelectBook={openReader} 
          onOpenDetails={handleOpenDetails}
          onContextMenu={modals?.openBookContextMenu}
          onViewAll={() => navigateToShelf && navigateToShelf('continue-reading')}
          onSelectTag={(tg) => navigateToShelf && navigateToShelf(`tag:${tg.id}`)}
          showFileExtension={showFileExtension}
        />
      )}

      {/* Favorite Books Shelf */}
      {favorites.length > 0 && (
        <FavoriteBooks
          books={favorites}
          onSelectBook={openReader} 
          onOpenDetails={handleOpenDetails}
          onContextMenu={modals?.openBookContextMenu}
          onToggleFavorite={handleToggleFavorite}
          onViewAll={() => navigateToShelf && navigateToShelf('favorites')}
          onSelectTag={(tg) => navigateToShelf && navigateToShelf(`tag:${tg.id}`)}
          showFileExtension={showFileExtension}
        />
      )}

      {/* Folders Carousel */}
      {shelves.length > 0 && (
        <LibraryFolders
          folders={shelves}
          books={books}
          onSelectFolder={(folderId) => navigateToShelf && navigateToShelf(folderId)}
          onContextMenu={handleShelfContext}
          onViewAll={() => navigateToShelf && navigateToShelf('folders')}
        />
      )}

      {/* Tags Carousel */}
      {tags.length > 0 && (
        <LibraryTags
          tags={tags}
          books={books}
          onSelectTag={(tg) => navigateToShelf && navigateToShelf(`tag:${tg.id}`)}
          onViewAll={() => navigateToShelf && navigateToShelf('tags')}
          onOpenTagManager={handleOpenTags}
        />
      )}
    </>
  );
}
