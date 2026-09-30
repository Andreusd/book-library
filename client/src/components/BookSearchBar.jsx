import React, { useRef, useEffect } from 'react';
import { 
  Search, ChevronUp, ChevronDown, X, Loader2, 
  CaseSensitive, WholeWord 
} from 'lucide-react';
import { useI18n } from '../i18n';

/**
 * Universal In-Book Search Bar component for PDF and EPUB readers.
 * Accepts a consolidated `search` controller object or individual props for full backwards compatibility.
 * Features:
 * - Match counter (current / total, searching spinner, zero-results notice)
 * - Next / Previous navigation with keyboard shortcuts (Enter / Shift+Enter)
 * - Match Case (Aa) & Whole Word (\b) option toggles
 * - Floating glassmorphic styling matching digital library aesthetic
 */
export default function BookSearchBar({
  search,
  isOpen: propIsOpen,
  onClose: propOnClose,
  query: propQuery,
  onQueryChange: propOnQueryChange,
  onNext: propOnNext,
  onPrev: propOnPrev,
  currentIndex: propCurrentIndex,
  totalMatches: propTotalMatches,
  isSearching: propIsSearching,
  caseSensitive: propCaseSensitive,
  onToggleCaseSensitive: propOnToggleCaseSensitive,
  entireWord: propEntireWord,
  onToggleEntireWord: propOnToggleEntireWord,
  theme: propTheme,
}) {
  const { t } = useI18n();
  const inputRef = useRef(null);

  const isOpen = propIsOpen !== undefined ? propIsOpen : (search?.isOpen ?? search?.searchOpen ?? false);
  const onClose = propOnClose || search?.onClose || search?.handleCloseSearch;
  const query = propQuery !== undefined ? propQuery : (search?.query ?? search?.searchQuery ?? '');
  const onQueryChange = propOnQueryChange || search?.onQueryChange || search?.setSearchQuery;
  const onNext = propOnNext || search?.onNext || search?.jumpNextEpubMatch || search?.jumpNextMatch;
  const onPrev = propOnPrev || search?.onPrev || search?.jumpPrevEpubMatch || search?.jumpPrevMatch;
  const currentIndex = propCurrentIndex !== undefined 
    ? propCurrentIndex 
    : (search?.currentIndex ?? search?.currentSearchIdx ?? 0);
  const totalMatches = propTotalMatches !== undefined 
    ? propTotalMatches 
    : (search?.totalMatches ?? search?.searchResults?.length ?? 0);
  const isSearching = propIsSearching !== undefined ? propIsSearching : Boolean(search?.isSearching);
  const caseSensitive = propCaseSensitive !== undefined ? propCaseSensitive : Boolean(search?.caseSensitive);
  const onToggleCaseSensitive = propOnToggleCaseSensitive || search?.onToggleCaseSensitive || (search?.setCaseSensitive ? () => search.setCaseSensitive(prev => !prev) : undefined);
  const entireWord = propEntireWord !== undefined ? propEntireWord : Boolean(search?.entireWord);
  const onToggleEntireWord = propOnToggleEntireWord || search?.onToggleEntireWord || (search?.setEntireWord ? () => search.setEntireWord(prev => !prev) : undefined);
  const theme = propTheme !== undefined ? propTheme : (search?.theme || 'dark');

  // Auto-focus input when search bar opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isLight = theme === 'light';
  const isSepia = theme === 'sepia';

  const containerBg = isLight
    ? 'bg-white/95 border-slate-300/90 text-slate-800 shadow-xl'
    : isSepia
    ? 'bg-[#f4ebd9]/95 border-[#d6c4aa] text-[#433422] shadow-xl'
    : 'bg-zinc-950/90 border-zinc-800/90 text-zinc-100 shadow-2xl';

  const inputBg = isLight
    ? 'text-slate-900 placeholder-slate-400'
    : isSepia
    ? 'text-[#2e2316] placeholder-[#8c7355]'
    : 'text-zinc-100 placeholder-zinc-500';

  const buttonHover = isLight
    ? 'hover:bg-slate-200/70 text-slate-600 hover:text-slate-900 active:bg-slate-300/70'
    : isSepia
    ? 'hover:bg-[#e4d5bc] text-[#5c4934] hover:text-[#2e2316] active:bg-[#d8c5a8]'
    : 'hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 active:bg-zinc-700';

  const badgeActive = isLight
    ? 'bg-amber-100 text-amber-800 border-amber-300'
    : isSepia
    ? 'bg-[#edd9b9] text-[#433422] border-[#cbb391]'
    : 'bg-amber-500/20 text-amber-300 border-amber-500/40';

  const badgeInactive = isLight
    ? 'text-slate-400 hover:text-slate-700 border-transparent hover:bg-slate-100'
    : isSepia
    ? 'text-[#8c7355] hover:text-[#433422] border-transparent hover:bg-[#ebdcc4]'
    : 'text-zinc-500 hover:text-zinc-300 border-transparent hover:bg-zinc-800/60';

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose?.();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (e.shiftKey) {
        onPrev?.();
      } else {
        onNext?.();
      }
    }
  };

  return (
    <div className={`fixed top-18 right-4 sm:right-8 z-50 flex flex-col gap-2 p-2 sm:p-2.5 rounded-2xl border backdrop-blur-md transition-all duration-200 animate-in fade-in slide-in-from-top-3 ${containerBg} max-w-[calc(100vw-2rem)] sm:max-w-md w-84 select-none`}>
      {/* Top row: search input and controls */}
      <div className="flex items-center gap-1.5 w-full">
        <Search className={`w-4 h-4 ml-1.5 shrink-0 ${isLight ? 'text-slate-400' : isSepia ? 'text-[#8c7355]' : 'text-zinc-500'}`} />
        
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => onQueryChange?.(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t('searchInBookPlaceholder') || 'Find in book...'}
          className={`flex-1 bg-transparent text-xs sm:text-sm font-medium focus:outline-none px-1.5 py-1 ${inputBg}`}
        />

        {query && (
          <button
            type="button"
            onClick={() => onQueryChange?.('')}
            className={`p-1 rounded-lg transition-colors cursor-pointer ${buttonHover}`}
            title={t('clearSearch') || 'Clear'}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}

        <div className={`h-4 w-px mx-0.5 ${isLight ? 'bg-slate-200' : isSepia ? 'bg-[#d6c4aa]' : 'bg-zinc-800'}`} />

        {/* Previous Match */}
        <button
          type="button"
          onClick={onPrev}
          disabled={totalMatches === 0}
          className={`p-1.5 rounded-lg transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${buttonHover}`}
          title={t('prevMatch') || 'Previous match (Shift+Enter)'}
          aria-label="Previous match"
        >
          <ChevronUp className="w-4 h-4" />
        </button>

        {/* Next Match */}
        <button
          type="button"
          onClick={onNext}
          disabled={totalMatches === 0}
          className={`p-1.5 rounded-lg transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${buttonHover}`}
          title={t('nextMatch') || 'Next match (Enter)'}
          aria-label="Next match"
        >
          <ChevronDown className="w-4 h-4" />
        </button>

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${buttonHover}`}
          title={t('closeSearch') || 'Close search (Esc)'}
          aria-label="Close search"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Bottom row: Match count and filter toggles */}
      <div className={`flex items-center justify-between pt-1.5 border-t text-[11px] font-medium px-1 ${isLight ? 'border-slate-200/80 text-slate-500' : isSepia ? 'border-[#dfcfb9] text-[#715c44]' : 'border-zinc-800/80 text-zinc-400'}`}>
        <div className="flex items-center gap-1.5 min-h-[1.25rem]">
          {isSearching ? (
            <span className="flex items-center gap-1.5 text-amber-500 font-semibold animate-pulse">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>{t('searching') || 'Searching...'}</span>
            </span>
          ) : query ? (
            totalMatches > 0 ? (
              <span>
                {t('matchCount', { current: currentIndex + 1, total: totalMatches }) || `${currentIndex + 1} of ${totalMatches}`}
              </span>
            ) : (
              <span className="text-rose-500 font-medium">
                {t('noMatchesFound') || 'No matches'}
              </span>
            )
          ) : (
            <span className="opacity-60">{t('typeToSearch') || 'Type to search'}</span>
          )}
        </div>

        {/* Filter Option Buttons: Case Sensitive & Whole Word */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onToggleCaseSensitive}
            className={`px-1.5 py-0.5 rounded-md border text-[10px] font-semibold transition-all cursor-pointer flex items-center gap-0.5 ${caseSensitive ? badgeActive : badgeInactive}`}
            title={t('matchCase') || 'Match Case (Aa)'}
          >
            <CaseSensitive className="w-3 h-3" />
            <span className="hidden sm:inline">Aa</span>
          </button>

          <button
            type="button"
            onClick={onToggleEntireWord}
            className={`px-1.5 py-0.5 rounded-md border text-[10px] font-semibold transition-all cursor-pointer flex items-center gap-0.5 ${entireWord ? badgeActive : badgeInactive}`}
            title={t('wholeWord') || 'Match Whole Word (\\b)'}
          >
            <WholeWord className="w-3 h-3" />
            <span className="hidden sm:inline">Word</span>
          </button>
        </div>
      </div>
    </div>
  );
}
