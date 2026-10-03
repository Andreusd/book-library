import React from 'react';
import { BookOpen } from 'lucide-react';
import ShelfIcon from './ShelfIcon';
import { useI18n } from '../i18n';
import { getFolderCovers } from '../utils/folderUtils';
import { useBookActions } from '../hooks/useBookActions';

export default function FolderCard({
  folder,
  covers,
  books = [],
  cardId,
  isHighlighted: propIsHighlighted,
  onSelectFolder,
  onContextMenu,
  className = ''
}) {
  const { t } = useI18n();
  const actions = useBookActions();
  const folderCovers = covers !== undefined ? covers : getFolderCovers(folder, books);
  const effectiveCardId = cardId || (folder?.id ? `folder-${folder.id}` : null);
  const isHighlighted = propIsHighlighted !== undefined
    ? propIsHighlighted
    : Boolean(
        actions.highlightedCardId &&
        (actions.highlightedCardId === effectiveCardId ||
         actions.highlightedCardId === folder?.id)
      );

  return (
    <div
      data-card-id={effectiveCardId}
      data-folder-id={folder?.id}
      data-nav-card="true"
      data-highlighted={isHighlighted ? "true" : undefined}
      tabIndex={0}
      role="button"
      aria-label={folder?.name}
      aria-selected={isHighlighted}
      onClick={() => {
        if (actions.setHighlightedCardId && effectiveCardId) {
          actions.setHighlightedCardId(effectiveCardId);
        }
        if (onSelectFolder) onSelectFolder(folder.id);
      }}
      onContextMenu={(e) => {
        if (onContextMenu) {
          e.preventDefault();
          onContextMenu(e, folder);
        }
      }}
      className={`group relative cursor-pointer rounded-xl sm:rounded-2xl p-2.5 sm:p-3 flex flex-col items-center justify-between transition-all duration-300 shadow-sm select-none isolate scroll-mt-24 focus:outline-none ${
        isHighlighted
          ? 'scale-[1.03] z-10 border-2 border-amber-400 ring-4 ring-amber-400/90 ring-offset-2 ring-offset-neutral-950 shadow-2xl shadow-amber-500/40 bg-neutral-800/95 -translate-y-1'
          : 'bg-neutral-900/60 hover:bg-neutral-800/90 border border-neutral-800 hover:border-amber-500/40 hover:shadow-xl hover:-translate-y-1'
      } ${className}`}
    >
      {/* Thumbnail Stack Container */}
      <div className="relative w-full h-32 sm:h-36 flex items-center justify-center my-0.5 isolate">
        {folderCovers.length === 0 ? (
          /* Empty state placeholder */
          <div className="w-15 sm:w-16 aspect-[1/1.45] rounded-md bg-neutral-800/40 border border-neutral-700/40 flex flex-col items-center justify-center text-neutral-500 gap-1 shadow-inner">
            <ShelfIcon icon={folder.icon} className="w-5 h-5 text-neutral-600" />
            <span className="text-[10px] text-neutral-600 font-medium">{t('empty')}</span>
          </div>
        ) : folderCovers.length === 1 ? (
          /* Single book cover */
          <div className="relative w-16 sm:w-18 aspect-[1/1.45] rounded-md overflow-hidden shadow-lg border border-neutral-700/70 group-hover:border-amber-500/50 group-hover:scale-105 transition-all duration-300 bg-neutral-950">
            <div className="absolute inset-0 flex items-center justify-center bg-neutral-900 text-neutral-600">
              <BookOpen className="w-5 h-5 opacity-30" />
            </div>
            <img
              src={folderCovers[0]}
              alt=""
              loading="lazy"
              className="relative z-10 w-full h-full object-cover"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
          </div>
        ) : folderCovers.length === 2 ? (
          /* 2 Books Stack */
          <>
            {/* Back Cover */}
            <div className="absolute w-15 sm:w-17 aspect-[1/1.45] rounded-md overflow-hidden shadow-md border border-neutral-700/60 -rotate-8 -translate-x-3 -translate-y-1 opacity-70 group-hover:-rotate-12 group-hover:-translate-x-4 transition-all duration-300 bg-neutral-950 z-10">
              <div className="absolute inset-0 flex items-center justify-center bg-neutral-900 text-neutral-600">
                <BookOpen className="w-4 h-4 opacity-30" />
              </div>
              <img
                src={folderCovers[1]}
                alt=""
                loading="lazy"
                className="relative z-10 w-full h-full object-cover"
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
            </div>
            {/* Front Cover */}
            <div className="relative w-15 sm:w-17 aspect-[1/1.45] rounded-md overflow-hidden shadow-xl border border-neutral-600/80 rotate-2 translate-x-1 translate-y-1 group-hover:rotate-0 group-hover:scale-105 transition-all duration-300 bg-neutral-950 z-20">
              <div className="absolute inset-0 flex items-center justify-center bg-neutral-900 text-neutral-600">
                <BookOpen className="w-4 h-4 opacity-30" />
              </div>
              <img
                src={folderCovers[0]}
                alt=""
                loading="lazy"
                className="relative z-10 w-full h-full object-cover"
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
            </div>
          </>
        ) : (
          /* 3+ Books Stack (Fanned Deck) */
          <>
            {/* Back Left Cover */}
            <div className="absolute w-14 sm:w-16 aspect-[1/1.45] rounded-md overflow-hidden shadow-md border border-neutral-700/50 -rotate-12 -translate-x-4 -translate-y-1 opacity-60 group-hover:-rotate-16 group-hover:-translate-x-5 transition-all duration-300 bg-neutral-950 z-10">
              <div className="absolute inset-0 flex items-center justify-center bg-neutral-900 text-neutral-600">
                <BookOpen className="w-4 h-4 opacity-25" />
              </div>
              <img
                src={folderCovers[2]}
                alt=""
                loading="lazy"
                className="relative z-10 w-full h-full object-cover"
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
            </div>
            {/* Middle Right Cover */}
            <div className="absolute w-14 sm:w-16 aspect-[1/1.45] rounded-md overflow-hidden shadow-lg border border-neutral-700/70 rotate-8 translate-x-3.5 -translate-y-0.5 opacity-80 group-hover:rotate-12 group-hover:translate-x-5 transition-all duration-300 bg-neutral-950 z-20">
              <div className="absolute inset-0 flex items-center justify-center bg-neutral-900 text-neutral-600">
                <BookOpen className="w-4 h-4 opacity-25" />
              </div>
              <img
                src={folderCovers[1]}
                alt=""
                loading="lazy"
                className="relative z-10 w-full h-full object-cover"
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
            </div>
            {/* Front Center Cover */}
            <div className="relative w-14 sm:w-16 aspect-[1/1.45] rounded-md overflow-hidden shadow-2xl border border-neutral-600/90 rotate-0 translate-x-0 translate-y-1 group-hover:scale-105 group-hover:translate-y-0 transition-all duration-300 bg-neutral-950 z-30">
              <div className="absolute inset-0 flex items-center justify-center bg-neutral-900 text-neutral-600">
                <BookOpen className="w-4 h-4 opacity-30" />
              </div>
              <img
                src={folderCovers[0]}
                alt=""
                loading="lazy"
                className="relative z-10 w-full h-full object-cover"
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
            </div>
          </>
        )}
      </div>

      {/* Folder Details */}
      <div className="w-full text-center mt-1.5 pt-1.5 border-t border-neutral-800/60">
        <div className="flex items-center justify-center min-h-[2.25rem] mb-0.5 px-1">
          <h3 
            className="text-xs font-semibold text-neutral-200 group-hover:text-amber-400 transition-colors line-clamp-2 leading-snug break-words text-center"
            title={folder.name}
          >
            <ShelfIcon icon={folder.icon} className="inline-block w-3.5 h-3.5 text-amber-500/90 mr-1.5 -mt-0.5 align-middle shrink-0" />
            {folder.name}
          </h3>
        </div>
        <span className="inline-block text-[11px] text-neutral-400 font-medium">
          {folder.book_count === 1
            ? t('folderBooksCount_one')
            : t('folderBooksCount', { count: folder.book_count })}
        </span>
      </div>
    </div>
  );
}
