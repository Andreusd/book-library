import React from 'react';
import { BookOpen, Folder, FolderOpen, Plus, Settings, Tag } from 'lucide-react';
import BookCard from './BookCard';
import FolderCard from './FolderCard';
import TagCard from './TagCard';
import AllBooks from './AllBooks';
import { useI18n } from '../i18n';

/**
 * Main content body for the library view.
 * Renders folder grids, tag grids, loading skeletons, AllBooks carousel,
 * the active books grid, or appropriate empty/setup prompt states.
 * Book interactions are automatically provided via BookActionsContext.
 */
export default function LibraryContent({
  selectedShelf,
  debouncedQuery,
  shelves = [],
  tags = [],
  books = [],
  totalBooks = 0,
  loading = false,
  navigateToShelf,
  modals,
  setSearchQuery,
  // Backwards-compatible optional prop overrides
  favoriteIds,
  openReader,
  handleOpenDetails,
  handleToggleFavorite,
  showFileExtension,
}) {
  const { t } = useI18n();

  if (selectedShelf === 'folders') {
    const displayFolders = debouncedQuery
      ? shelves.filter(s => s.name.toLowerCase().includes(debouncedQuery.toLowerCase()))
      : shelves;

    if (displayFolders.length === 0) {
      return (
        <div className="text-center py-20 flex flex-col items-center justify-center">
          <div className="w-16 h-16 rounded-2xl bg-neutral-900 flex items-center justify-center text-neutral-600 mb-4">
            <Folder className="w-8 h-8 text-neutral-600" />
          </div>
          <h3 className="text-base font-semibold text-neutral-300">{t('noBooksFound')}</h3>
          <p className="text-xs text-neutral-500 mt-1 max-w-sm">
            {t('noBooksDesc')}
          </p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5 sm:gap-6">
        {displayFolders.map((folder) => (
          <FolderCard
            key={folder.id}
            folder={folder}
            books={books}
            onSelectFolder={(folderId) => navigateToShelf && navigateToShelf(folderId)}
            onContextMenu={modals?.openShelfContextMenu}
            className="w-full"
          />
        ))}
      </div>
    );
  }

  if (selectedShelf === 'tags') {
    const displayTags = debouncedQuery
      ? tags.filter(tg => tg.name.toLowerCase().includes(debouncedQuery.toLowerCase()))
      : tags;

    if (displayTags.length === 0) {
      return (
        <div className="text-center py-20 flex flex-col items-center justify-center">
          <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-4">
            <Tag className="w-8 h-8 text-indigo-400" />
          </div>
          <h3 className="text-base font-semibold text-neutral-300">
            {debouncedQuery ? t('noBooksFound') : (t('noTagsFound') || 'No tags found')}
          </h3>
          <p className="text-xs text-neutral-500 mt-1 max-w-sm">
            {debouncedQuery ? t('noBooksDesc') : (t('noTagsDesc') || 'Create tags to organize and categorize your books across folders.')}
          </p>
          <button
            type="button"
            onClick={() => modals?.openTagModal(null)}
            className="mt-4 flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-500 text-white font-medium text-xs hover:bg-indigo-600 transition shadow-lg shadow-indigo-500/20 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{t('createNewTag')}</span>
          </button>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5 sm:gap-6">
        {displayTags.map((tag) => (
          <TagCard
            key={tag.id}
            tag={tag}
            books={books}
            onSelectTag={(tg) => navigateToShelf && navigateToShelf(`tag:${tg.id}`)}
            className="w-full"
          />
        ))}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5 sm:gap-6">
        {[...Array(12)].map((_, i) => (
          <div key={i} className="flex flex-col gap-2">
            <div className="w-full aspect-[1/1.45] bg-neutral-900 rounded-md animate-pulse" />
            <div className="h-3.5 bg-neutral-900 rounded w-3/4 animate-pulse" />
            <div className="h-3 bg-neutral-900 rounded w-1/2 animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  if (books.length > 0) {
    if (!selectedShelf && !debouncedQuery) {
      return (
        <AllBooks
          books={books}
          favoriteIds={favoriteIds}
          onSelectBook={openReader}
          onOpenDetails={handleOpenDetails}
          onContextMenu={modals?.openBookContextMenu}
          onToggleFavorite={handleToggleFavorite}
          onViewAll={() => navigateToShelf && navigateToShelf('all-books')}
          onSelectTag={(tg) => navigateToShelf && navigateToShelf(`tag:${tg.id}`)}
          showFileExtension={showFileExtension}
        />
      );
    }

    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5 sm:gap-6">
        {books.map((book) => (
          <BookCard
            key={book.id}
            cardId={`grid-${book.id}`}
            book={book}
            isFavorite={favoriteIds !== undefined ? favoriteIds.has(book.id) : undefined}
            onSelectBook={openReader}
            onOpenDetails={handleOpenDetails}
            onContextMenu={modals?.openBookContextMenu}
            onToggleFavorite={handleToggleFavorite}
            onSelectTag={(tg) => navigateToShelf && navigateToShelf(`tag:${tg.id}`)}
            showFileExtension={showFileExtension}
          />
        ))}
      </div>
    );
  }

  if (totalBooks === 0 && !debouncedQuery) {
    return (
      <div className="text-center py-20 flex flex-col items-center justify-center max-w-md mx-auto">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-4 shadow-lg shadow-amber-500/10">
          <FolderOpen className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-neutral-100">{t('setupPromptTitle')}</h3>
        <p className="text-xs text-neutral-400 mt-2 mb-6 leading-relaxed">
          {t('setupPromptDesc')}
        </p>
        <button
          onClick={() => modals?.setSettingsOpen(true)}
          className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold rounded-xl inline-flex items-center gap-2 shadow-xl shadow-amber-500/20 transition cursor-pointer"
        >
          <Settings className="w-4 h-4" />
          <span>{t('configureLibrary')}</span>
        </button>
      </div>
    );
  }

  return (
    <div className="text-center py-20 flex flex-col items-center justify-center">
      <div className="w-16 h-16 rounded-2xl bg-neutral-900 flex items-center justify-center text-neutral-600 mb-4">
        <BookOpen className="w-8 h-8" />
      </div>
      <h3 className="text-base font-semibold text-neutral-300">{t('noBooksFound')}</h3>
      <p className="text-xs text-neutral-500 mt-1 max-w-sm">
        {t('noBooksDesc')}
      </p>
      {debouncedQuery && (
        <button
          onClick={() => setSearchQuery && setSearchQuery('')}
          className="mt-4 px-3 py-1.5 text-xs rounded-lg bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 transition"
        >
          {t('clearSearch')}
        </button>
      )}
    </div>
  );
}
