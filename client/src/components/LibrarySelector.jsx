import React from 'react';
import { 
  Library, Folder, BookOpen, Plus, ArrowRight, Settings, 
  Globe, AlertTriangle, CheckCircle2 
} from 'lucide-react';
import { useI18n } from '../i18n';
import LanguageSelector from './LanguageSelector';

export default function LibrarySelector({
  libraries = [],
  onSelectLibrary,
  onOpenSettings,
  onAddNewLibrary
}) {
  const { t } = useI18n();

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col selection:bg-amber-500/30 selection:text-amber-200">
      {/* Top Header Bar */}
      <header className="h-16 px-4 sm:px-8 border-b border-neutral-800/80 bg-neutral-900/60 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center shadow-lg shadow-amber-500/20 text-neutral-950 shrink-0 font-bold">
            <Library className="w-5 h-5 font-bold" />
          </div>
          <div>
            <h1 className="text-base font-bold text-neutral-100 tracking-tight leading-tight">
              {t('appTitle')}
            </h1>
            <p className="text-[11px] text-neutral-400 font-medium">
              {t('libraries')}
            </p>
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-2.5">
          {/* Language Switcher with US and BR Flags */}
          <LanguageSelector />

          {/* Settings / Manage Button */}
          <button
            onClick={onOpenSettings}
            className="p-2 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-amber-400 hover:border-amber-500/30 transition shadow-sm cursor-pointer"
            title={t('settings')}
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 flex flex-col justify-center">
        {/* Hero Section */}
        <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold mb-4">
            <Library className="w-3.5 h-3.5" />
            <span>{t('selectLibraryTitle')}</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-neutral-100 tracking-tight leading-tight">
            {t('selectLibraryTitle')}
          </h2>
          <p className="text-xs sm:text-sm text-neutral-400 mt-2.5 leading-relaxed">
            {t('selectLibrarySubtitle')}
          </p>
        </div>

        {/* Libraries Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-7">
          {libraries.map((lib) => {
            const hasCovers = lib.sample_covers && lib.sample_covers.length > 0;
            const bookCount = lib.book_count || 0;
            const folderCount = lib.folder_count || 0;
            const isValid = lib.valid !== false;

            return (
              <div
                key={lib.id}
                onClick={() => onSelectLibrary(lib.id)}
                className="group relative bg-neutral-900/70 hover:bg-neutral-900 border border-neutral-800 hover:border-amber-500/50 rounded-2xl p-6 transition-all duration-300 shadow-xl hover:shadow-amber-500/10 hover:-translate-y-1.5 flex flex-col justify-between cursor-pointer overflow-hidden isolate"
              >
                {/* Visual Cover Preview Stack */}
                <div className="w-full h-44 sm:h-48 mb-6 relative rounded-xl bg-neutral-950/80 border border-neutral-800/80 flex items-center justify-center overflow-hidden isolate">
                  {hasCovers ? (
                    <div className="relative w-full h-full flex items-center justify-center p-4">
                      {lib.sample_covers.slice(0, 4).map((coverUrl, idx) => {
                        const total = Math.min(lib.sample_covers.length, 4);
                        // Fan out / stacked rotation angles
                        const rotations = [-7, -2, 3, 8];
                        const xOffsets = [-24, -8, 8, 24];
                        const zIndexes = [10, 20, 30, 40];

                        const rot = total === 1 ? 0 : rotations[idx] || 0;
                        const xOff = total === 1 ? 0 : xOffsets[idx] || 0;
                        const zIdx = zIndexes[idx] || 10;

                        return (
                          <div
                            key={idx}
                            style={{
                              transform: `translateX(${xOff}px) rotate(${rot}deg)`,
                              zIndex: zIdx,
                            }}
                            className="absolute w-20 sm:w-24 aspect-[1/1.45] rounded-md shadow-2xl transition-transform duration-300 group-hover:scale-105 border border-white/10 overflow-hidden bg-neutral-900"
                          >
                            <img
                              src={coverUrl}
                              alt=""
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                            {/* Realistic Spine shadow effect */}
                            <div className="absolute inset-y-0 left-0 w-2.5 bg-gradient-to-r from-black/60 to-transparent pointer-events-none" />
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-2 text-neutral-600">
                      <Folder className="w-12 h-12 text-neutral-700 group-hover:text-amber-500/60 transition-colors" />
                      <span className="text-xs text-neutral-500 font-medium">
                        {isValid ? t('noBooksFound') : t('pathNotFound')}
                      </span>
                    </div>
                  )}

                  {/* Format tag badge */}
                  <div className="absolute top-2.5 right-2.5 z-10">
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-neutral-900/90 text-neutral-300 border border-neutral-750 backdrop-blur-md">
                      PDF • EPUB
                    </span>
                  </div>
                </div>

                {/* Library Details */}
                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-neutral-100 group-hover:text-amber-300 transition-colors truncate">
                      {lib.name}
                    </h3>
                    <p 
                      className="text-xs font-mono text-neutral-400 mt-1 truncate flex items-center gap-1.5" 
                      title={lib.path}
                    >
                      <Folder className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                      <span className="truncate">{lib.path}</span>
                    </p>
                  </div>

                  {/* Statistics Badges */}
                  <div className="mt-4 flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-neutral-800/80 text-neutral-300 text-xs font-medium">
                      <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                      {bookCount === 1 ? t('bookCountBadge_one') : t('bookCountBadge', { count: bookCount })}
                    </span>

                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-neutral-800/80 text-neutral-300 text-xs font-medium">
                      <Folder className="w-3.5 h-3.5 text-amber-400" />
                      {folderCount === 1 ? t('folderCountBadge_one') : t('folderCountBadge', { count: folderCount })}
                    </span>

                    {!isValid && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-500/15 border border-rose-500/30 text-rose-400 text-[11px] font-semibold">
                        <AlertTriangle className="w-3 h-3" />
                        {lib.error || 'Error'}
                      </span>
                    )}
                  </div>

                  {/* Open Library Button */}
                  <div className="mt-5 pt-4 border-t border-neutral-800/80">
                    <button
                      type="button"
                      className="w-full py-2.5 px-4 rounded-xl bg-amber-500/15 hover:bg-amber-500 text-amber-400 hover:text-neutral-950 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all duration-200 border border-amber-500/30 group-hover:border-amber-500/60 shadow-sm cursor-pointer"
                    >
                      <span>{t('openLibrary')}</span>
                      <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Add New Library Card */}
          <div
            onClick={onAddNewLibrary || onOpenSettings}
            className="group border-2 border-dashed border-neutral-800 hover:border-amber-500/50 bg-neutral-900/30 hover:bg-neutral-900/60 rounded-2xl p-6 transition-all duration-300 flex flex-col items-center justify-center text-center cursor-pointer min-h-[340px]"
          >
            <div className="w-14 h-14 rounded-2xl bg-neutral-800 group-hover:bg-amber-500/20 border border-neutral-700 group-hover:border-amber-500/40 flex items-center justify-center text-neutral-400 group-hover:text-amber-400 transition-all duration-300 shadow-lg mb-4">
              <Plus className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-neutral-200 group-hover:text-amber-300 transition-colors">
              {t('addNewLibraryCard')}
            </h3>
            <p className="text-xs text-neutral-400 max-w-xs mt-2 leading-relaxed">
              {t('addNewLibraryCardDesc')}
            </p>
          </div>
        </div>

        {/* Empty state if no libraries exist */}
        {libraries.length === 0 && (
          <div className="text-center py-16 max-w-md mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto mb-4">
              <Library className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-neutral-100">{t('noLibrariesTitle')}</h3>
            <p className="text-xs text-neutral-400 mt-2 mb-6 leading-relaxed">
              {t('noLibrariesDesc')}
            </p>
            <button
              onClick={onAddNewLibrary || onOpenSettings}
              className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold rounded-xl inline-flex items-center gap-2 shadow-xl shadow-amber-500/20 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{t('addNewLibrary')}</span>
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
