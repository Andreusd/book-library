import React from 'react';
import ContextMenu from './ContextMenu';
import ShelfContextMenu from './ShelfContextMenu';
import ShelfRenameModal from './ShelfRenameModal';
import ShelfIconModal from './ShelfIconModal';
import TagManagerModal from './TagManagerModal';
import BookDetailsModal from './BookDetailsModal';
import SettingsModal from './SettingsModal';

/**
 * Encapsulates all modal dialogs and context menus used across the library dashboard.
 */
export default function AppModals({
  modals,
  activeLibraryId,
  favoriteIds,
  tags,
  showFileExtension,
  onToggleFileExtension,
  onOpenReader,
  onToggleFavorite,
  onMarkStatus,
  onSaveShelfName,
  onResetShelfName,
  onSaveShelfIcon,
  onBookTagsUpdated,
  onTagsUpdated,
  onLibraryChanged,
  onNavigateToShelf,
}) {
  return (
    <>
      {/* Book Context Menu */}
      {modals.contextMenu.isOpen && modals.contextMenu.book && (
        <ContextMenu
          x={modals.contextMenu.x}
          y={modals.contextMenu.y}
          book={modals.contextMenu.book}
          isFavorite={favoriteIds.has(modals.contextMenu.book.id)}
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
      {modals.shelfContextMenu.isOpen && modals.shelfContextMenu.shelf && (
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
      <ShelfRenameModal
        shelf={modals.renameModal.shelf}
        isOpen={modals.renameModal.isOpen}
        onClose={modals.closeRenameModal}
        onSave={onSaveShelfName}
      />

      {/* Shelf Icon Picker Modal */}
      <ShelfIconModal
        shelf={modals.iconModal.shelf}
        isOpen={modals.iconModal.isOpen}
        onClose={modals.closeIconModal}
        onSave={onSaveShelfIcon}
      />

      {/* Virtual Tag Manager Modal */}
      <TagManagerModal
        isOpen={modals.tagModal.isOpen}
        onClose={modals.closeTagModal}
        book={modals.tagModal.book}
        tags={tags}
        libraryId={activeLibraryId}
        onTagsUpdated={onTagsUpdated}
        onBookTagsUpdated={onBookTagsUpdated}
      />

      {/* Book Details & Metadata Inspector Modal */}
      <BookDetailsModal
        isOpen={modals.detailsModal.isOpen}
        onClose={modals.closeDetailsModal}
        book={modals.detailsModal.book}
        isFavorite={modals.detailsModal.book ? favoriteIds.has(modals.detailsModal.book.id) : false}
        onOpenReader={onOpenReader}
        onToggleFavorite={onToggleFavorite}
        onMarkStatus={onMarkStatus}
        onManageTags={(book) => {
          modals.closeDetailsModal();
          modals.openTagModal(book);
        }}
        onSelectTag={(tg) => {
          modals.closeDetailsModal();
          onNavigateToShelf(`tag:${tg.id}`);
        }}
        showFileExtension={showFileExtension}
      />

      {/* Library Settings Modal */}
      <SettingsModal
        isOpen={modals.settingsOpen}
        onClose={() => modals.setSettingsOpen(false)}
        showFileExtension={showFileExtension}
        onToggleFileExtension={onToggleFileExtension}
        onLibraryChanged={onLibraryChanged}
      />
    </>
  );
}
