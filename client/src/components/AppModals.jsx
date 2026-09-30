import React from 'react';
import ContextMenu from './ContextMenu';
import ShelfContextMenu from './ShelfContextMenu';
import ShelfRenameModal from './ShelfRenameModal';
import ShelfIconModal from './ShelfIconModal';
import TagManagerModal from './TagManagerModal';
import BookDetailsModal from './BookDetailsModal';
import SettingsModal from './SettingsModal';
import { useSettings } from '../hooks/useSettings';

/**
 * Encapsulates all modal dialogs and context menus used across the library dashboard.
 * Consumes libraryData and global settings, collapsing 16 props into 2 while preserving full backwards compatibility.
 */
export default function AppModals({
  modals,
  libraryData,
  // Backwards-compatible prop overrides
  activeLibraryId: propActiveLibraryId,
  favoriteIds: propFavoriteIds,
  tags: propTags,
  showFileExtension: propShowFileExtension,
  onToggleFileExtension: propOnToggleFileExtension,
  onOpenReader: propOnOpenReader,
  onToggleFavorite: propOnToggleFavorite,
  onMarkStatus: propOnMarkStatus,
  onSaveShelfName: propOnSaveShelfName,
  onResetShelfName: propOnResetShelfName,
  onSaveShelfIcon: propOnSaveShelfIcon,
  onBookTagsUpdated: propOnBookTagsUpdated,
  onTagsUpdated: propOnTagsUpdated,
  onLibraryChanged: propOnLibraryChanged,
  onNavigateToShelf: propOnNavigateToShelf,
}) {
  const settings = useSettings();

  const activeLibraryId = propActiveLibraryId !== undefined ? propActiveLibraryId : libraryData?.activeLibraryId;
  const favoriteIds = propFavoriteIds !== undefined ? propFavoriteIds : (libraryData?.favoriteIds || new Set());
  const tags = propTags !== undefined ? propTags : (libraryData?.tags || []);

  const showFileExtension = propShowFileExtension !== undefined ? propShowFileExtension : settings.showFileExtension;
  const onToggleFileExtension = propOnToggleFileExtension || settings.setShowFileExtension;
  const bookAnimations = settings.bookAnimations;
  const onToggleBookAnimations = settings.setBookAnimations;

  const onOpenReader = propOnOpenReader || libraryData?.openReader;
  const onToggleFavorite = propOnToggleFavorite || libraryData?.handleToggleFavorite;
  const onMarkStatus = propOnMarkStatus || libraryData?.handleMarkStatus;
  const onSaveShelfName = propOnSaveShelfName || libraryData?.handleSaveShelfName;
  const onResetShelfName = propOnResetShelfName || libraryData?.handleResetShelfName;
  const onSaveShelfIcon = propOnSaveShelfIcon || libraryData?.handleSaveShelfIcon;
  const onBookTagsUpdated = propOnBookTagsUpdated || libraryData?.handleBookTagsUpdated;
  const onTagsUpdated = propOnTagsUpdated || (() => libraryData?.loadTags && libraryData.loadTags(activeLibraryId));
  const onLibraryChanged = propOnLibraryChanged || libraryData?.handleLibraryChanged;
  const onNavigateToShelf = propOnNavigateToShelf || libraryData?.navigateToShelf;

  const isFavoriteBook = (bookId) => {
    if (!bookId) return false;
    if (favoriteIds instanceof Set) {
      return favoriteIds.has(bookId);
    }
    if (Array.isArray(favoriteIds)) {
      return favoriteIds.includes(bookId);
    }
    return Boolean(favoriteIds?.[bookId]);
  };

  return (
    <>
      {/* Book Context Menu */}
      {modals?.contextMenu?.isOpen && modals.contextMenu.book && (
        <ContextMenu
          x={modals.contextMenu.x}
          y={modals.contextMenu.y}
          book={modals.contextMenu.book}
          isFavorite={isFavoriteBook(modals.contextMenu.book.id)}
          onClose={modals.closeBookContextMenu}
          onOpenReader={onOpenReader}
          onToggleFavorite={onToggleFavorite}
          onOpenDetails={(book) => {
            modals.closeBookContextMenu();
            modals.openDetailsModal(book);
          }}
          onManageTags={(book) => {
            modals.closeBookContextMenu();
            modals.openTagModal(book);
          }}
          onMarkStatus={onMarkStatus}
        />
      )}

      {/* Shelf Context Menu */}
      {modals?.shelfContextMenu?.isOpen && modals.shelfContextMenu.shelf && (
        <ShelfContextMenu
          x={modals.shelfContextMenu.x}
          y={modals.shelfContextMenu.y}
          shelf={modals.shelfContextMenu.shelf}
          onClose={modals.closeShelfContextMenu}
          onOpenRename={modals.openRenameModal}
          onOpenIconModal={modals.openIconModal}
          onResetName={onResetShelfName}
        />
      )}

      {/* Shelf Virtual Rename Modal */}
      {modals?.renameModal && (
        <ShelfRenameModal
          shelf={modals.renameModal.shelf}
          isOpen={modals.renameModal.isOpen}
          onClose={modals.closeRenameModal}
          onSave={onSaveShelfName}
        />
      )}

      {/* Shelf Icon Picker Modal */}
      {modals?.iconModal && (
        <ShelfIconModal
          shelf={modals.iconModal.shelf}
          isOpen={modals.iconModal.isOpen}
          onClose={modals.closeIconModal}
          onSave={onSaveShelfIcon}
        />
      )}

      {/* Virtual Tag Manager Modal */}
      {modals?.tagModal && (
        <TagManagerModal
          isOpen={modals.tagModal.isOpen}
          onClose={modals.closeTagModal}
          book={modals.tagModal.book}
          tags={tags}
          libraryId={activeLibraryId}
          onTagsUpdated={onTagsUpdated}
          onBookTagsUpdated={onBookTagsUpdated}
        />
      )}

      {/* Book Details & Metadata Inspector Modal */}
      {modals?.detailsModal && (
        <BookDetailsModal
          isOpen={modals.detailsModal.isOpen}
          onClose={modals.closeDetailsModal}
          book={modals.detailsModal.book}
          isFavorite={modals.detailsModal.book ? isFavoriteBook(modals.detailsModal.book.id) : false}
          onOpenReader={onOpenReader}
          onToggleFavorite={onToggleFavorite}
          onMarkStatus={onMarkStatus}
          onManageTags={(book) => {
            modals.closeDetailsModal();
            modals.openTagModal(book);
          }}
          onSelectTag={(tg) => {
            modals.closeDetailsModal();
            if (onNavigateToShelf) {
              onNavigateToShelf(`tag:${tg.id}`);
            }
          }}
          showFileExtension={showFileExtension}
        />
      )}

      {/* Library Settings Modal */}
      <SettingsModal
        isOpen={Boolean(modals?.settingsOpen)}
        onClose={() => modals?.setSettingsOpen && modals.setSettingsOpen(false)}
        showFileExtension={showFileExtension}
        onToggleFileExtension={onToggleFileExtension}
        bookAnimations={bookAnimations}
        onToggleBookAnimations={onToggleBookAnimations}
        onLibraryChanged={onLibraryChanged}
      />
    </>
  );
}
