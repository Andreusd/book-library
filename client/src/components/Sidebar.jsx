import React, { useState } from 'react';
import { Library, Layers, Search, Folder, Heart, Bookmark, Home } from 'lucide-react';
import { useI18n } from '../i18n';

export default function Sidebar({ 
  shelves, 
  totalBooks, 
  favoriteCount = 0,
  continueReadingCount = 0,
  selectedShelf, 
  onSelectShelf,
  onShelfContextMenu,
  isOpen,
  onClose
}) {
  const [shelfFilter, setShelfFilter] = useState('');
  const { t } = useI18n();

  const filteredShelves = shelves.filter(s => 
    s.name.toLowerCase().includes(shelfFilter.toLowerCase())
  );

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 lg:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside className={`
        fixed top-0 bottom-0 left-0 z-40 bg-neutral-925 border-r border-neutral-850 flex flex-col transition-all duration-300 ease-in-out shrink-0 overflow-hidden
        lg:static lg:h-screen lg:sticky lg:top-0
        ${isOpen 
          ? 'w-72 translate-x-0 opacity-100' 
          : 'w-72 -translate-x-full opacity-0 pointer-events-none lg:w-0 lg:border-r-0'
        }
      `}>
        {/* Inner wrapper to keep content width consistent during smooth collapse animation */}
        <div className="w-72 flex flex-col h-full shrink-0">
          {/* Brand Header */}
          <div className="h-16 px-5 border-b border-neutral-850 flex items-center shrink-0 bg-neutral-900/40">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center shadow-lg shadow-amber-500/20 text-neutral-950 shrink-0">
                <Library className="w-5 h-5 font-bold" />
              </div>
              <div className="min-w-0">
                <h1 className="text-sm font-bold text-neutral-100 tracking-tight truncate">{t('appTitle')}</h1>
                <p className="text-[11px] text-neutral-400 truncate">
                  {t('shelfCount', { books: totalBooks, shelves: shelves.length })}
                </p>
              </div>
            </div>
          </div>

          {/* Shelf Filter Input */}
          <div className="p-3 border-b border-neutral-850/60">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
              <input
                type="text"
                placeholder={t('filterShelvesPlaceholder')}
                value={shelfFilter}
                onChange={(e) => setShelfFilter(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-neutral-900 border border-neutral-800 rounded-lg text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-amber-500/50"
              />
            </div>
          </div>

          {/* Shelves List */}
          <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
            {/* All Books Option */}
            <button
              onClick={() => {
                onSelectShelf(null);
              }}
              className={`
                w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors
                ${selectedShelf === null 
                  ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30' 
                  : 'text-neutral-300 hover:bg-neutral-850 hover:text-white'}
              `}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Home className={`w-4 h-4 shrink-0 ${selectedShelf === null ? 'text-amber-400' : 'text-neutral-400'}`} />
                <span className="truncate">{t('allBooks')}</span>
              </div>
              <span className={`
                text-[11px] px-2 py-0.5 rounded-full font-mono font-semibold
                ${selectedShelf === null ? 'bg-amber-500/20 text-amber-300' : 'bg-neutral-800 text-neutral-400'}
              `}>
                {totalBooks}
              </span>
            </button>

            {/* Continue Reading Option (if any) */}
            {continueReadingCount > 0 && (
              <button
                onClick={() => {
                  onSelectShelf('continue-reading');
                }}
                className={`
                  w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors
                  ${selectedShelf === 'continue-reading' 
                    ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' 
                    : 'text-neutral-300 hover:bg-neutral-850 hover:text-white'}
                `}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Bookmark className={`w-4 h-4 shrink-0 ${selectedShelf === 'continue-reading' ? 'fill-emerald-500 text-emerald-500' : 'text-emerald-400'}`} />
                  <span className="truncate">{t('continueReading')}</span>
                </div>
                <span className={`
                  text-[11px] px-2 py-0.5 rounded-full font-mono font-semibold
                  ${selectedShelf === 'continue-reading' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-neutral-800 text-neutral-400'}
                `}>
                  {continueReadingCount}
                </span>
              </button>
            )}

            {/* Favorites Option (if any) */}
            {favoriteCount > 0 && (
              <button
                onClick={() => {
                  onSelectShelf('favorites');
                }}
                className={`
                  w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors
                  ${selectedShelf === 'favorites' 
                    ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30' 
                    : 'text-neutral-300 hover:bg-neutral-850 hover:text-white'}
                `}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Heart className={`w-4 h-4 shrink-0 ${selectedShelf === 'favorites' ? 'fill-rose-500 text-rose-500' : 'text-rose-400'}`} />
                  <span className="truncate">{t('favorites')}</span>
                </div>
                <span className={`
                  text-[11px] px-2 py-0.5 rounded-full font-mono font-semibold
                  ${selectedShelf === 'favorites' ? 'bg-rose-500/20 text-rose-300' : 'bg-neutral-800 text-neutral-400'}
                `}>
                  {favoriteCount}
                </span>
              </button>
            )}

            <div className="pt-2 pb-1 px-3">
              <span className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">
                {t('categories', { count: filteredShelves.length })}
              </span>
            </div>

            {/* Individual Shelves */}
            {filteredShelves.map((s) => {
              const isSelected = selectedShelf === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => {
                    onSelectShelf(s.id);
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    if (onShelfContextMenu) {
                      onShelfContextMenu(e, s);
                    }
                  }}
                  className={`
                    w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors
                    ${isSelected 
                      ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30' 
                      : 'text-neutral-300 hover:bg-neutral-850 hover:text-white'}
                  `}
                  title={s.custom_name ? `${s.name} (${t('originalFolderLabel', { folder: s.folder })})` : s.name}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Folder className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-amber-400' : 'text-neutral-500'}`} />
                    <span className="truncate text-left">{s.name}</span>
                  </div>
                  <div className="flex items-center shrink-0 ml-2">
                    <span className={`
                      text-[11px] px-1.5 py-0.2 rounded font-mono
                      ${isSelected ? 'bg-amber-500/20 text-amber-300' : 'bg-neutral-850 text-neutral-400'}
                    `}>
                      {s.book_count}
                    </span>
                  </div>
                </button>
              );
            })}
          </nav>
        </div>
      </aside>
    </>
  );
}
