import React, { useRef, useState } from 'react';
import { Folder, ChevronLeft, ChevronRight, LayoutGrid, Layers, BookOpen } from 'lucide-react';
import ShelfIcon from './ShelfIcon';
import { useI18n } from '../i18n';

export default function LibraryFolders({
  folders = [],
  books = [],
  onSelectFolder,
  onContextMenu
}) {
  const { t } = useI18n();
  const scrollContainerRef = useRef(null);
  const [isGridView, setIsGridView] = useState(false);

  if (!folders || folders.length === 0) return null;

  const scroll = (direction) => {
    if (!scrollContainerRef.current) return;
    const scrollAmount = 360;
    scrollContainerRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth'
    });
  };

  const getFolderCovers = (folder) => {
    if (folder.sample_covers && folder.sample_covers.length > 0) {
      return folder.sample_covers;
    }
    if (books && books.length > 0) {
      const matching = books.filter(b => b.shelf === folder.id || b.folder === folder.id);
      return matching.slice(0, 4).map(b => b.cover_url);
    }
    return [];
  };

  const showControls = folders.length > 4;

  return (
    <section className="mb-10">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Folder className="w-5 h-5 text-amber-500 fill-amber-500/20" />
          <h2 className="text-base font-semibold text-neutral-100">{t('foldersInLibrary')}</h2>
          <span className="text-xs text-neutral-500 font-normal">
            {t('foldersCount', { count: folders.length })}
          </span>
        </div>

        {showControls && (
          <div className="flex items-center gap-2">
            {/* Toggle View (Carousel / Grid) */}
            <button
              onClick={() => setIsGridView(prev => !prev)}
              className="text-xs font-medium text-neutral-400 hover:text-amber-400 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-neutral-900/60 hover:bg-neutral-800 border border-neutral-800 transition-colors cursor-pointer"
              title={isGridView ? t('collapseFolders') : t('viewAllFolders')}
            >
              {isGridView ? (
                <>
                  <Layers className="w-3.5 h-3.5" />
                  <span>{t('collapseFolders')}</span>
                </>
              ) : (
                <>
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>{t('viewAllFolders')}</span>
                </>
              )}
            </button>

            {/* Scroll Navigation Buttons (Only in carousel mode) */}
            {!isGridView && (
              <div className="flex items-center gap-1 pl-1 border-l border-neutral-800">
                <button
                  onClick={() => scroll('left')}
                  className="p-1 rounded-lg text-neutral-400 hover:text-neutral-200 bg-neutral-900/60 hover:bg-neutral-800 border border-neutral-800 transition-colors cursor-pointer"
                  aria-label="Scroll left"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => scroll('right')}
                  className="p-1 rounded-lg text-neutral-400 hover:text-neutral-200 bg-neutral-900/60 hover:bg-neutral-800 border border-neutral-800 transition-colors cursor-pointer"
                  aria-label="Scroll right"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Folders Container */}
      <div
        ref={scrollContainerRef}
        className={
          isGridView
            ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-5'
            : folders.length <= 4
              ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 sm:gap-5'
              : 'flex gap-4 sm:gap-5 overflow-x-auto no-scrollbar scroll-smooth py-1 px-0.5'
        }
      >
        {folders.map(folder => {
          const covers = getFolderCovers(folder);

          return (
            <div
              key={folder.id}
              onClick={() => onSelectFolder(folder.id)}
              onContextMenu={(e) => {
                if (onContextMenu) {
                  e.preventDefault();
                  onContextMenu(e, folder);
                }
              }}
              className={`group relative cursor-pointer bg-neutral-900/60 hover:bg-neutral-800/90 border border-neutral-800 hover:border-amber-500/40 rounded-2xl p-3.5 sm:p-4 flex flex-col items-center justify-between transition-all duration-300 shadow-sm hover:shadow-xl hover:-translate-y-1 select-none ${
                !isGridView && folders.length > 4 ? 'w-44 sm:w-48 shrink-0' : 'w-full'
              }`}
            >
              {/* Thumbnail Stack Container */}
              <div className="relative w-full h-36 sm:h-40 flex items-center justify-center my-1">
                {covers.length === 0 ? (
                  /* Empty state placeholder */
                  <div className="w-20 aspect-[1/1.45] rounded-lg bg-neutral-800/40 border border-neutral-700/40 flex flex-col items-center justify-center text-neutral-500 gap-1.5 shadow-inner">
                    <ShelfIcon icon={folder.icon} className="w-6 h-6 text-neutral-600" />
                    <span className="text-[10px] text-neutral-600 font-medium">Empty</span>
                  </div>
                ) : covers.length === 1 ? (
                  /* Single book cover */
                  <div className="relative w-20 sm:w-22 aspect-[1/1.45] rounded-md overflow-hidden shadow-lg border border-neutral-700/70 group-hover:border-amber-500/50 group-hover:scale-105 transition-all duration-300 bg-neutral-950">
                    <div className="absolute inset-0 flex items-center justify-center bg-neutral-900 text-neutral-600">
                      <BookOpen className="w-6 h-6 opacity-30" />
                    </div>
                    <img
                      src={covers[0]}
                      alt=""
                      loading="lazy"
                      className="relative z-10 w-full h-full object-cover"
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  </div>
                ) : covers.length === 2 ? (
                  /* 2 Books Stack */
                  <>
                    {/* Back Cover */}
                    <div className="absolute w-19 sm:w-21 aspect-[1/1.45] rounded-md overflow-hidden shadow-md border border-neutral-700/60 -rotate-8 -translate-x-3.5 -translate-y-1 opacity-70 group-hover:-rotate-12 group-hover:-translate-x-5 transition-all duration-300 bg-neutral-950 z-10">
                      <div className="absolute inset-0 flex items-center justify-center bg-neutral-900 text-neutral-600">
                        <BookOpen className="w-5 h-5 opacity-30" />
                      </div>
                      <img
                        src={covers[1]}
                        alt=""
                        loading="lazy"
                        className="relative z-10 w-full h-full object-cover"
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    </div>
                    {/* Front Cover */}
                    <div className="relative w-19 sm:w-21 aspect-[1/1.45] rounded-md overflow-hidden shadow-xl border border-neutral-600/80 rotate-2 translate-x-1 translate-y-1 group-hover:rotate-0 group-hover:scale-105 transition-all duration-300 bg-neutral-950 z-20">
                      <div className="absolute inset-0 flex items-center justify-center bg-neutral-900 text-neutral-600">
                        <BookOpen className="w-5 h-5 opacity-30" />
                      </div>
                      <img
                        src={covers[0]}
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
                    <div className="absolute w-18 sm:w-20 aspect-[1/1.45] rounded-md overflow-hidden shadow-md border border-neutral-700/50 -rotate-12 -translate-x-5 -translate-y-1 opacity-60 group-hover:-rotate-16 group-hover:-translate-x-7 transition-all duration-300 bg-neutral-950 z-10">
                      <div className="absolute inset-0 flex items-center justify-center bg-neutral-900 text-neutral-600">
                        <BookOpen className="w-5 h-5 opacity-25" />
                      </div>
                      <img
                        src={covers[2]}
                        alt=""
                        loading="lazy"
                        className="relative z-10 w-full h-full object-cover"
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    </div>
                    {/* Middle Right Cover */}
                    <div className="absolute w-18 sm:w-20 aspect-[1/1.45] rounded-md overflow-hidden shadow-lg border border-neutral-700/70 rotate-8 translate-x-4 -translate-y-0.5 opacity-80 group-hover:rotate-12 group-hover:translate-x-6 transition-all duration-300 bg-neutral-950 z-20">
                      <div className="absolute inset-0 flex items-center justify-center bg-neutral-900 text-neutral-600">
                        <BookOpen className="w-5 h-5 opacity-25" />
                      </div>
                      <img
                        src={covers[1]}
                        alt=""
                        loading="lazy"
                        className="relative z-10 w-full h-full object-cover"
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    </div>
                    {/* Front Center Cover */}
                    <div className="relative w-18 sm:w-20 aspect-[1/1.45] rounded-md overflow-hidden shadow-2xl border border-neutral-600/90 rotate-0 translate-x-0 translate-y-1.5 group-hover:scale-105 group-hover:translate-y-0 transition-all duration-300 bg-neutral-950 z-30">
                      <div className="absolute inset-0 flex items-center justify-center bg-neutral-900 text-neutral-600">
                        <BookOpen className="w-5 h-5 opacity-30" />
                      </div>
                      <img
                        src={covers[0]}
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
              <div className="w-full text-center mt-2 pt-2 border-t border-neutral-800/60">
                <div className="flex items-center justify-center gap-1.5 mb-1 px-1">
                  <ShelfIcon icon={folder.icon} className="w-3.5 h-3.5 text-amber-500/90 shrink-0" />
                  <h3 className="text-xs font-semibold text-neutral-200 group-hover:text-amber-400 transition-colors truncate">
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
        })}
      </div>
    </section>
  );
}
