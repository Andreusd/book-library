import React, { useState } from 'react';
import { 
  Library, Search, Folder, Heart, Bookmark, Home, 
  ChevronDown, Check, Plus, Settings
} from 'lucide-react';
import ShelfIcon from './ShelfIcon';
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
  onClose,
  libraries = [],
  activeLibraryId = '',
  onSwitchLibrary,
  onOpenSettings
}) {
  const [shelfFilter, setShelfFilter] = useState('');
  const [libraryDropdownOpen, setLibraryDropdownOpen] = useState(false);
  const { t } = useI18n();

  const activeLibrary = libraries.find(l => l.id === activeLibraryId) || libraries[0];

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
        fixed top-0 bottom-0 left-0 z-40 bg-neutral-900 border-r border-neutral-800 flex flex-col transition-all duration-300 ease-in-out shrink-0 overflow-hidden
        lg:static lg:h-screen lg:sticky lg:top-0
        ${isOpen 
          ? 'w-72 translate-x-0 opacity-100' 
          : 'w-72 -translate-x-full opacity-0 pointer-events-none lg:w-0 lg:border-r-0'
        }
      `}>
        {/* Inner wrapper to keep content width consistent during smooth collapse animation */}
        <div className="w-72 flex flex-col h-full shrink-0">
          {/* Brand Header */}
          <div className="h-16 px-5 border-b border-neutral-800 flex items-center shrink-0 bg-neutral-900/40">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center shadow-lg shadow-amber-500/20 text-neutral-950 shrink-0">
                <Library className="w-5 h-5 font-bold" />
              </div>
              <div className="min-w-0">
                <h1 className="text-sm font-bold text-neutral-100 tracking-tight truncate">{t('appTitle')}</h1>
                <p className="text-[11px] text-neutral-400 truncate">
                  {t('shelfCount', { books: totalBooks, folders: shelves.length })}
                </p>
              </div>
            </div>
          </div>

          {/* Library Switcher Selector */}
          <div className="p-3 border-b border-neutral-800/80 bg-neutral-900/20">
            <div className="relative">
              <button
                type="button"
                onClick={() => setLibraryDropdownOpen(!libraryDropdownOpen)}
                className="w-full flex items-center justify-between p-2 rounded-xl bg-neutral-950/70 hover:bg-neutral-800/80 border border-neutral-800 text-left transition cursor-pointer group"
                title={activeLibrary?.path || ''}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-6 h-6 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                    <Folder className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[9px] text-neutral-400 font-semibold uppercase tracking-wider leading-none mb-0.5">{t('activeLibrary')}</p>
                    <p className="text-xs font-bold text-neutral-100 truncate group-hover:text-amber-300 transition">
                      {activeLibrary?.name || 'Library'}
                    </p>
                  </div>
                </div>
                <ChevronDown className={`w-3.5 h-3.5 text-neutral-400 transition-transform duration-200 shrink-0 ml-1.5 ${libraryDropdownOpen ? 'rotate-180 text-amber-400' : ''}`} />
              </button>

              {/* Dropdown Menu */}
              {libraryDropdownOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setLibraryDropdownOpen(false)} 
                  />
                  <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-neutral-900 border border-neutral-750 rounded-xl shadow-2xl py-1.5 animate-in fade-in zoom-in-95 duration-100">
                    <div className="px-2.5 py-1 text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">
                      {t('libraries')} ({libraries.length})
                    </div>
                    <div className="max-h-56 overflow-y-auto py-0.5">
                      {libraries.map((lib) => {
                        const isSelected = lib.id === activeLibraryId;
                        return (
                          <button
                            key={lib.id}
                            type="button"
                            onClick={() => {
                              setLibraryDropdownOpen(false);
                              if (onSwitchLibrary && !isSelected) {
                                onSwitchLibrary(lib.id);
                              }
                            }}
                            className={`w-full flex items-center justify-between px-3 py-2 text-xs transition text-left cursor-pointer ${
                              isSelected 
                                ? 'bg-amber-500/15 text-amber-300 font-semibold' 
                                : 'text-neutral-300 hover:bg-neutral-800 hover:text-white'
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <Folder className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-amber-400' : 'text-neutral-500'}`} />
                              <span className="truncate">{lib.name}</span>
                            </div>
                            {isSelected && <Check className="w-3.5 h-3.5 text-amber-400 shrink-0 ml-1.5" />}
                          </button>
                        );
                      })}
                    </div>
                    <div className="border-t border-neutral-800 mt-1 pt-1 px-1">
                      <button
                        type="button"
                        onClick={() => {
                          setLibraryDropdownOpen(false);
                          if (onOpenSettings) onOpenSettings();
                        }}
                        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-amber-400 hover:bg-amber-500/15 transition cursor-pointer font-medium"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>{t('manageLibraries')}</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Shelf / Folder Filter Input */}
          <div className="p-3 border-b border-neutral-800">
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

          {/* Folders List */}
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
                  : 'text-neutral-300 hover:bg-neutral-800 hover:text-white'}
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
                    : 'text-neutral-300 hover:bg-neutral-800 hover:text-white'}
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
                    : 'text-neutral-300 hover:bg-neutral-800 hover:text-white'}
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

            {/* Individual Folders */}
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
                      : 'text-neutral-300 hover:bg-neutral-800 hover:text-white'}
                  `}
                  title={s.custom_name ? `${s.name} (${t('originalFolderLabel', { folder: s.folder })})` : s.name}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <ShelfIcon icon={s.icon} className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-amber-400' : 'text-neutral-400'}`} />
                    <span className="truncate text-left">{s.name}</span>
                  </div>
                  <div className="flex items-center shrink-0 ml-2">
                    <span className={`
                      text-[11px] px-1.5 py-0.2 rounded font-mono
                      ${isSelected ? 'bg-amber-500/20 text-amber-300' : 'bg-neutral-800 text-neutral-400'}
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
