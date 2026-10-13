import React from 'react';
import { 
  Library, Folder, BookOpen, Plus, ArrowRight, Settings, 
  AlertTriangle, User, Sparkles
} from 'lucide-react';
import { useI18n } from '../i18n';
import LanguageSelector from './LanguageSelector';
import { getGoogleLoginUrl, getLogoutUrl } from '../services/cognitoAuth';

export default function LibrarySelector({
  libraries = [],
  onSelectLibrary,
  onOpenSettings,
  onAddNewLibrary,
  currentUser = '',
}) {
  const { t } = useI18n();

  const handleLibraryClick = (libraryId) => {
    if (!currentUser) {
      if (typeof window !== 'undefined') {
        window.location.href = getGoogleLoginUrl();
      }
      return;
    }
    onSelectLibrary(libraryId);
  };


  return (
    <div className="h-screen bg-neutral-950 text-neutral-100 flex flex-col overflow-y-auto lg:overflow-hidden selection:bg-amber-500/30 selection:text-amber-200">
      {/* Top Header Bar */}
      <header className="h-15 sm:h-16 px-6 sm:px-8 border-b border-neutral-800/80 bg-neutral-900/60 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center shadow-md shadow-amber-500/20 text-neutral-950 shrink-0 font-bold">
            <Library className="w-5 h-5 font-bold" />
          </div>
          <div>
            <h1 className="text-sm sm:text-base font-bold text-neutral-100 tracking-tight leading-tight">
              {t('appTitle')}
            </h1>
            <p className="text-[11px] text-neutral-400 font-medium">
              {t('libraries')}
            </p>
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-2.5">
          {currentUser ? (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-200 text-xs font-medium shadow-xs">
                <div className="w-4 h-4 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <User className="w-2.5 h-2.5" />
                </div>
                <span className="font-semibold tracking-wide truncate max-w-[140px] sm:max-w-[200px]" title={currentUser}>
                  {currentUser}
                </span>
              </div>
              <button
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    localStorage.removeItem('book_library_auth');
                    localStorage.removeItem('book_library_user');
                    window.location.href = getLogoutUrl();
                  }
                }}
                className="px-2.5 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-700 text-neutral-400 hover:text-neutral-200 transition text-xs font-medium cursor-pointer"
                title="Sair"
              >
                Sair
              </button>
            </div>
          ) : (
            <a
              href={getGoogleLoginUrl()}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white hover:bg-neutral-100 text-neutral-900 transition text-xs font-bold cursor-pointer shadow-xs border border-neutral-200"
              title="Entrar com o Google"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span>Entrar com o Google</span>
            </a>
          )}

          {/* Language Switcher with Flags */}
          <LanguageSelector />

          {/* Settings / Manage Button */}
          <button
            onClick={onOpenSettings}
            className="p-2 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-amber-400 hover:border-amber-500/30 transition shadow-xs cursor-pointer"
            title={t('settings')}
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 max-w-[1400px] w-full mx-auto px-6 sm:px-10 py-6 sm:py-8 lg:py-10 flex flex-col justify-center">
        {/* Google Authentication Prompt Banner when not logged in */}
        {!currentUser && (
          <div className="max-w-md w-full mx-auto mb-6 p-6 rounded-2xl bg-neutral-900/95 border border-amber-500/40 shadow-2xl backdrop-blur-md text-center shrink-0 animate-in fade-in duration-200">
            <div className="w-12 h-12 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto mb-3">
              <User className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-neutral-100 mb-1">
              Login Necessário
            </h3>
            <p className="text-xs text-neutral-400 mb-5 leading-relaxed">
              Para acessar seus livros e sincronizar o progresso de leitura com a nuvem, autentique-se com sua conta Google autorizada.
            </p>
            <a
              href={getGoogleLoginUrl()}
              className="w-full py-3 px-4 bg-white hover:bg-neutral-100 text-neutral-900 font-bold text-sm rounded-xl shadow-lg transition flex items-center justify-center gap-3 cursor-pointer border border-neutral-200"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span>Entrar com o Google</span>
            </a>
          </div>
        )}

        {/* Hero Section */}
        <div className="text-center max-w-2xl mx-auto mb-6 sm:mb-8 shrink-0">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-neutral-100 tracking-tight leading-tight">
            {t('selectLibraryTitle')}
          </h2>

          <p className="text-xs sm:text-sm text-neutral-400 mt-2 leading-relaxed">
            {currentUser ? (
              <span className="inline-flex items-center gap-2 text-neutral-300">
                <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>{t('currentUser', { name: currentUser })}</span>
              </span>
            ) : (
              t('selectLibrarySubtitle')
            )}
          </p>
        </div>


        {/* Libraries Grid (Only visible when user is authenticated) */}
        {currentUser ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-7">
            {libraries.map((lib) => {
              const hasCovers = lib.sample_covers && lib.sample_covers.length > 0;
              const bookCount = lib.book_count || 0;
              const folderCount = lib.folder_count || 0;
              const isValid = lib.valid !== false;

              return (
                <div
                  key={lib.id}
                  onClick={() => handleLibraryClick(lib.id)}
                  className="group relative bg-neutral-900/70 hover:bg-neutral-900 border border-neutral-800 hover:border-amber-500/50 rounded-2xl p-5 sm:p-6 transition-all duration-300 shadow-lg hover:shadow-amber-500/10 hover:-translate-y-1 flex flex-col justify-between cursor-pointer overflow-hidden isolate"
                >
                  {/* Visual Cover Preview Stack */}
                  <div className="w-full h-44 sm:h-48 md:h-52 mb-4 relative rounded-xl bg-neutral-950/80 border border-neutral-800/80 flex items-center justify-center overflow-hidden isolate">
                    {hasCovers ? (
                      <div className="relative w-full h-full flex items-center justify-center p-3">
                        {lib.sample_covers.slice(0, 4).map((coverUrl, idx) => {
                          const total = Math.min(lib.sample_covers.length, 4);
                          const rotations = [-8, -3, 3, 8];
                          const xOffsets = [-30, -10, 10, 30];
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
                              className="absolute w-20 sm:w-22 md:w-24 aspect-[1/1.45] rounded-md shadow-2xl transition-transform duration-300 group-hover:scale-105 border border-white/10 overflow-hidden bg-neutral-900"
                            >
                              <img
                                src={coverUrl}
                                alt=""
                                className="w-full h-full object-cover"
                                loading="lazy"
                              />
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
                      <h3 className="text-lg font-bold text-neutral-100 group-hover:text-amber-300 transition-colors truncate leading-snug">
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
                    <div className="mt-3.5 flex items-center gap-2 flex-wrap">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-neutral-800/80 text-neutral-300 text-xs font-medium">
                        <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                        {bookCount === 1 ? t('bookCountBadge_one') : t('bookCountBadge', { count: bookCount })}
                      </span>

                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-neutral-800/80 text-neutral-300 text-xs font-medium">
                        <Folder className="w-3.5 h-3.5 text-amber-400" />
                        {folderCount === 1 ? t('folderCountBadge_one') : t('folderCountBadge', { count: folderCount })}
                      </span>

                      {!isValid && (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs font-semibold">
                          <AlertTriangle className="w-3 h-3" />
                          {lib.error || 'Error'}
                        </span>
                      )}
                    </div>

                    {/* Open Library Button */}
                    <div className="mt-4 pt-3.5 border-t border-neutral-800/80">
                      <button
                        type="button"
                        className="w-full py-2.5 px-4 rounded-xl bg-amber-500/15 hover:bg-amber-500 text-amber-400 hover:text-neutral-950 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all duration-200 border border-amber-500/30 group-hover:border-amber-500/60 shadow-xs cursor-pointer"
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
              className="group border-2 border-dashed border-neutral-800 hover:border-amber-500/50 bg-neutral-900/30 hover:bg-neutral-900/60 rounded-2xl p-6 transition-all duration-300 flex flex-col items-center justify-center text-center cursor-pointer min-h-[350px] lg:min-h-[390px]"
            >
              <div className="w-14 h-14 rounded-2xl bg-neutral-800 group-hover:bg-amber-500/20 border border-neutral-700 group-hover:border-amber-500/40 flex items-center justify-center text-neutral-400 group-hover:text-amber-400 transition-all duration-300 shadow-lg mb-3.5">
                <Plus className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-neutral-200 group-hover:text-amber-300 transition-colors">
                {t('addNewLibraryCard')}
              </h3>
              <p className="text-xs text-neutral-400 max-w-[220px] mt-1.5 leading-relaxed">
                {t('addNewLibraryCardDesc')}
              </p>
            </div>
          </div>
        ) : null}

        {/* Empty state if no libraries exist and logged in */}
        {currentUser && libraries.length === 0 && (
          <div className="text-center py-10 max-w-md mx-auto">
            <div className="w-12 h-12 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto mb-3">
              <Library className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-neutral-100">{t('noLibrariesTitle')}</h3>
            <p className="text-xs text-neutral-400 mt-1 mb-4 leading-relaxed">
              {t('noLibrariesDesc')}
            </p>
            <button
              onClick={onAddNewLibrary || onOpenSettings}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold rounded-lg inline-flex items-center gap-1.5 shadow-md shadow-amber-500/20 transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t('addNewLibrary')}</span>
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
