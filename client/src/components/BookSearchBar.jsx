import React, { useRef, useEffect } from 'react';
import { 
  Search, ChevronUp, ChevronDown, X, Loader2, 
  CaseSensitive, WholeWord 
} from 'lucide-react';
import { useI18n } from '../i18n';

/**
 * Universal In-Book Search Bar component for PDF and EPUB readers.
 * Features:
 * - Match counter (current / total, searching spinner, zero-results notice)
 * - Next / Previous navigation with keyboard shortcuts (Enter / Shift+Enter)
 * - Match Case (Aa) & Whole Word (\b) option toggles
 * - Floating glassmorphic styling matching digital library aesthetic
 */
export default function BookSearchBar({
  isOpen,
  onClose,
  query,
  onQueryChange,
  onNext,
  onPrev,
  currentIndex = 0,
  totalMatches = 0,
  isSearching = false,
  caseSensitive = false,
  onToggleCaseSensitive,
  entireWord = false,
  onToggleEntireWord,
  theme = 'dark',
}) {
  const { t } = useI18n();
  const inputRef = useRef(null);

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

  const btnHover = isLight
    ? 'hover:bg-slate-200/80 text-slate-600 hover:text-slate-900'
    : isSepia
    ? 'hover:bg-[#e4d4bd] text-[#5c4731] hover:text-[#2e2316]'
    : 'hover:bg-zinc-800/80 text-zinc-400 hover:text-zinc-100';

  const btnActive = isLight
    ? 'bg-amber-100 text-amber-800 border-amber-300'
    : isSepia
    ? 'bg-[#dfc499] text-[#422d15] border-[#c4a673]'
    : 'bg-amber-500/20 text-amber-300 border-amber-500/40';

  const countBadge = isLight
    ? 'bg-slate-100 text-slate-700 border-slate-200'
    : isSepia
    ? 'bg-[#eae0cd] text-[#433422] border-[#d4c2a8]'
    : 'bg-zinc-900 text-zinc-300 border-zinc-800';

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
    <div 
      className={`fixed top-16 right-4 sm:right-8 z-50 flex items-center gap-1.5 p-1.5 pl-3 rounded-2xl backdrop-blur-xl border ${containerBg} animate-in fade-in slide-in-from-top-2 duration-150 select-none max-w-[calc(100vw-32px)]`}
      role="search"
      aria-label={t('searchInBook') || 'Search in book'}
      onClick={(e) => e.stopPropagation()}
    >
      <Search className="w-4 h-4 shrink-0 text-amber-500/80" />

      {/* Search Input */}
      <div className="relative flex items-center">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => onQueryChange?.(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t('searchInBookPlaceholder') || 'Find in book...'}
          className={`w-36 sm:w-56 bg-transparent text-xs sm:text-sm font-normal focus:outline-none pr-5 ${inputBg}`}
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              onQueryChange?.('');
              inputRef.current?.focus();
            }}
            className="absolute right-0 p-0.5 text-zinc-400 hover:text-zinc-200"
            title="Clear"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div className="h-4 w-px bg-zinc-700/40 mx-0.5 shrink-0" />

      {/* Match Count / Status Indicator */}
      <div className="flex items-center shrink-0 min-w-[50px] justify-center text-xs">
        {isSearching ? (
          <span className="flex items-center gap-1 text-amber-400 font-medium">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            {totalMatches > 0 && <span className="font-mono text-[11px]">{totalMatches}</span>}
          </span>
        ) : query && totalMatches > 0 ? (
          <span className={`px-2 py-0.5 rounded-full border text-[11px] font-mono font-medium ${countBadge}`}>
            {currentIndex} / {totalMatches}
          </span>
        ) : query && !isSearching && totalMatches === 0 ? (
          <span className="text-rose-400 font-medium text-[11px] px-1">
            0 / 0
          </span>
        ) : null}
      </div>

      {/* Prev / Next Navigation Buttons */}
      <div className="flex items-center gap-0.5 shrink-0">
        <button
          type="button"
          onClick={onPrev}
          disabled={totalMatches === 0}
          title={t('searchPrevMatch') || 'Previous match (Shift+Enter)'}
          className={`p-1.5 rounded-lg transition-colors disabled:opacity-30 disabled:pointer-events-none ${btnHover}`}
        >
          <ChevronUp className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={totalMatches === 0}
          title={t('searchNextMatch') || 'Next match (Enter)'}
          className={`p-1.5 rounded-lg transition-colors disabled:opacity-30 disabled:pointer-events-none ${btnHover}`}
        >
          <ChevronDown className="w-4 h-4" />
        </button>
      </div>

      <div className="h-4 w-px bg-zinc-700/40 mx-0.5 shrink-0 hidden sm:block" />

      {/* Case Sensitive & Whole Word Toggles */}
      <div className="hidden sm:flex items-center gap-0.5 shrink-0">
        {onToggleCaseSensitive && (
          <button
            type="button"
            onClick={onToggleCaseSensitive}
            title={t('searchMatchCase') || 'Match case'}
            className={`p-1.5 rounded-lg text-xs font-semibold border transition-all ${
              caseSensitive ? btnActive : `border-transparent ${btnHover}`
            }`}
          >
            <CaseSensitive className="w-4 h-4" />
          </button>
        )}
        {onToggleEntireWord && (
          <button
            type="button"
            onClick={onToggleEntireWord}
            title={t('searchEntireWord') || 'Whole words'}
            className={`p-1.5 rounded-lg text-xs font-semibold border transition-all ${
              entireWord ? btnActive : `border-transparent ${btnHover}`
            }`}
          >
            <WholeWord className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="h-4 w-px bg-zinc-700/40 mx-0.5 shrink-0" />

      {/* Close Button */}
      <button
        type="button"
        onClick={onClose}
        title={t('searchClose') || 'Close search (Esc)'}
        className={`p-1.5 rounded-lg transition-colors ${btnHover}`}
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
