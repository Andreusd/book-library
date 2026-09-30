import React from 'react';
import {
  ArrowLeft, ChevronLeft, ChevronRight, ZoomIn, ZoomOut,
  Maximize2, Minimize2, Moon, Sun, ListTree,
  Heart, X, PanelTopClose, PanelTopOpen, Palette,
  MessageSquare, Search, Headphones, Settings, SlidersHorizontal
} from 'lucide-react';
import { useI18n } from '../i18n';

/**
 * Dedicated top navigation and controls toolbar for the EPUB reader.
 */
export default function EpubToolbar({
  book,
  shouldShowExtension,
  theme,
  fontSize,
  pageInfo,
  pageInput,
  setPageInput,
  handlePageSubmit,
  locationInfo,
  flipPrev,
  flipNext,
  changeFontSize,
  resetFontSize,
  applyTheme,
  searchOpen,
  setSearchOpen,
  handleCloseSearch,
  ttsOpen,
  toggleTts,
  favState,
  handleFavToggle,
  commentsDrawerOpen,
  setCommentsDrawerOpen,
  annotationsCount = 0,
  tocOpen,
  setTocOpen,
  headerPinned,
  toggleHeaderPinned,
  isHeaderShowing,
  isFullscreen,
  toggleFullscreen,
  handleClose,
  onMouseEnterHeader,
  onMouseLeaveHeader,
  readerSettingsOpen,
  setReaderSettingsOpen,
  showBottomProgress,
  toggleBottomProgress,
  trackpadSwipeEnabled,
  toggleTrackpadSwipe,
  floatingButtonsEnabled,
  toggleFloatingButtons,
  upDownFlipEnabled,
  toggleUpDownFlip,
  onResizeRendition,
}) {
  const { t } = useI18n();

  const headerTheme = {
    dark: {
      bar: 'bg-black border-neutral-900 text-neutral-200',
      title: 'text-neutral-100',
      subtitle: 'text-neutral-400',
      chapter: 'text-neutral-300',
      btn: 'bg-neutral-800/80 hover:bg-neutral-700 text-neutral-300 hover:text-white',
      btnActive: 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
      divider: 'bg-neutral-700',
      badge: 'bg-indigo-950 text-indigo-300 border-indigo-500/40',
      input: 'bg-neutral-950 border-neutral-700 text-neutral-200 focus:border-amber-500',
      pageSlash: 'text-neutral-400',
      percentage: 'text-amber-400',
      toolGroup: 'bg-neutral-900 border-neutral-800',
      toolBtn: 'text-neutral-400 hover:text-white hover:bg-neutral-800',
      iconBtn: 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800',
      iconBtnActive: 'bg-amber-500/20 border-amber-500/50 text-amber-400',
    },
    sepia: {
      bar: 'bg-[#fbf0d9] border-[#e5d5b5] text-[#433422]',
      title: 'text-[#292014]',
      subtitle: 'text-[#7c6a53]',
      chapter: 'text-[#5a4833]',
      btn: 'bg-[#efe0c2] hover:bg-[#e4d2b0] text-[#433422] hover:text-[#292014] border border-[#e5d5b5]',
      btnActive: 'bg-amber-500/20 text-amber-800 border border-amber-600/40',
      divider: 'bg-[#d8c5a0]',
      badge: 'bg-[#ebd8b7] text-[#78350f] border-[#d8c5a0]',
      input: 'bg-[#fbf0d9] border-[#d8c5a0] text-[#292014] focus:border-amber-600',
      pageSlash: 'text-[#7c6a53]',
      percentage: 'text-amber-700 font-semibold',
      toolGroup: 'bg-[#efe0c2] border-[#e5d5b5]',
      toolBtn: 'text-[#5a4833] hover:text-[#292014] hover:bg-[#e4d2b0]',
      iconBtn: 'bg-[#efe0c2] border-[#e5d5b5] text-[#5a4833] hover:text-[#292014] hover:bg-[#e4d2b0]',
      iconBtnActive: 'bg-amber-500/20 border-amber-600/50 text-amber-800',
    },
    light: {
      bar: 'bg-white border-neutral-200 text-neutral-700',
      title: 'text-neutral-900',
      subtitle: 'text-neutral-500',
      chapter: 'text-neutral-700',
      btn: 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700 hover:text-neutral-900 border border-neutral-200',
      btnActive: 'bg-amber-500/20 text-amber-700 border border-amber-500/40',
      divider: 'bg-neutral-300',
      badge: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      input: 'bg-white border-neutral-300 text-neutral-900 focus:border-amber-500',
      pageSlash: 'text-neutral-500',
      percentage: 'text-amber-600 font-semibold',
      toolGroup: 'bg-neutral-100 border-neutral-200',
      toolBtn: 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200',
      iconBtn: 'bg-neutral-100 border-neutral-200 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200',
      iconBtnActive: 'bg-amber-500/20 border-amber-500/50 text-amber-700',
    }
  };

  const ht = headerTheme[theme] || headerTheme.dark;

  return (
    <header
      onMouseEnter={onMouseEnterHeader}
      onMouseLeave={onMouseLeaveHeader}
      className={`fixed top-0 inset-x-0 z-40 h-14 border-b px-4 flex items-center justify-between select-none transition-all duration-300 ease-in-out ${
        ht.bar
      } ${
        isHeaderShowing ? 'translate-y-0 opacity-100 pointer-events-auto' : '-translate-y-full opacity-0 pointer-events-none'
      }`}
    >
      {/* Left: Back, TOC & Book Title */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0 max-w-[calc(50%-90px)] sm:max-w-[calc(50%-110px)] md:max-w-[calc(50%-130px)] z-10">
        <button
          onClick={handleClose}
          className={`h-7 flex items-center gap-1.5 px-2.5 rounded-lg transition text-xs font-medium shrink-0 cursor-pointer ${ht.btn}`}
          title={t('backToLibraryTitle')}
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">{t('backToLibrary')}</span>
        </button>

        {/* Toggle EPUB Table of Contents Button */}
        <button
          onClick={() => setTocOpen(prev => !prev)}
          className={`h-7 w-7 flex items-center justify-center rounded-lg transition shrink-0 cursor-pointer ${
            tocOpen ? ht.btnActive : ht.btn
          }`}
          title={tocOpen ? t('hideIndex') : t('showIndex')}
        >
          <ListTree className="w-4 h-4" />
        </button>

        <div className={`h-4 w-px mx-0.5 hidden sm:block shrink-0 ${ht.divider}`} />

        <div className="min-w-0 flex-1">
          <h1 className={`text-xs sm:text-sm font-semibold truncate ${ht.title}`} title={book?.title}>
            {book?.title}
          </h1>
          <div className={`flex items-center gap-1.5 text-[10px] sm:text-xs truncate ${ht.subtitle}`}>
            {book?.author && <span className="text-amber-500 font-medium truncate">{book.author}</span>}
            {book?.author && <span>•</span>}
            {locationInfo?.chapter ? (
              <span className={`truncate ${ht.chapter}`} title={locationInfo.chapter}>{locationInfo.chapter}</span>
            ) : (
              <span className="truncate">{book?.shelf_display || book?.folder_display}</span>
            )}
            {shouldShowExtension && (
              <span className={`px-1 py-0.2 text-[8px] font-bold rounded uppercase shrink-0 border ${ht.badge}`}>
                EPUB
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Center Page Controls - Always Centralized */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-2 z-10">
        <button
          onClick={flipPrev}
          disabled={pageInfo?.total > 0 && pageInfo?.page <= 1}
          className={`h-7 w-7 flex items-center justify-center rounded-lg disabled:opacity-30 transition cursor-pointer ${ht.btn}`}
          title={t('prevPageTitle')}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <form onSubmit={handlePageSubmit} className="flex items-center text-xs font-mono">
          <input
            type="text"
            value={pageInput}
            onChange={(e) => setPageInput(e.target.value)}
            onBlur={handlePageSubmit}
            className={`w-14 sm:w-16 h-7 text-center py-0 rounded focus:outline-none ${ht.input}`}
          />
          {pageInfo?.total > 0 && (
            <>
              <span className={`mx-1.5 ${ht.pageSlash}`}>/</span>
              <span className={ht.pageSlash}>{pageInfo.total}</span>
            </>
          )}
        </form>

        <button
          onClick={flipNext}
          disabled={pageInfo?.total > 0 && pageInfo?.page >= pageInfo?.total}
          className={`h-7 w-7 flex items-center justify-center rounded-lg disabled:opacity-30 transition cursor-pointer ${ht.btn}`}
          title={t('nextPageTitle')}
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        <span className={`text-xs ml-1 hidden md:inline-block ${ht.percentage}`}>
          {locationInfo?.percentage}%
        </span>
      </div>

      {/* Right: Actions (Font Scaling, Theme, Fullscreen) */}
      <div className="flex items-center gap-1 sm:gap-2 ml-auto z-10">
        {/* Font Size Adjustments */}
        <div className={`flex items-center rounded-lg p-0.5 border ${ht.toolGroup}`}>
          <button
            onClick={() => changeFontSize(-10)}
            className={`p-1 rounded transition cursor-pointer ${ht.toolBtn}`}
            title="Decrease Font Size (-)"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={resetFontSize}
            className={`px-1.5 text-[11px] font-mono transition cursor-pointer ${
              theme === 'dark'
                ? 'text-neutral-300 hover:text-amber-400'
                : theme === 'sepia'
                ? 'text-[#433422] hover:text-amber-700'
                : 'text-neutral-700 hover:text-amber-600'
            }`}
            title="Reset Font Size"
          >
            {fontSize}%
          </button>
          <button
            onClick={() => changeFontSize(10)}
            className={`p-1 rounded transition cursor-pointer ${ht.toolBtn}`}
            title="Increase Font Size (+)"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Reading Theme Picker (Dark, Light, Sepia) */}
        <div className={`flex items-center rounded-lg p-0.5 border ${ht.toolGroup}`}>
          <button
            onClick={() => applyTheme('dark')}
            className={`p-1 rounded transition cursor-pointer ${
              theme === 'dark'
                ? 'bg-neutral-800 text-amber-400'
                : theme === 'sepia'
                ? 'text-[#7c6a53] hover:text-[#292014]'
                : 'text-neutral-500 hover:text-neutral-900'
            }`}
            title="Dark Mode"
          >
            <Moon className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => applyTheme('sepia')}
            className={`p-1 rounded transition cursor-pointer ${
              theme === 'sepia'
                ? 'bg-[#5f4b32] text-[#fbf0d9] shadow-sm'
                : theme === 'dark'
                ? 'text-neutral-400 hover:text-white'
                : 'text-neutral-500 hover:text-neutral-900'
            }`}
            title="Sepia Mode"
          >
            <Palette className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => applyTheme('light')}
            className={`p-1 rounded transition cursor-pointer ${
              theme === 'light'
                ? 'bg-white text-neutral-900 shadow-sm border border-neutral-200/80'
                : theme === 'sepia'
                ? 'text-[#7c6a53] hover:text-[#292014]'
                : 'text-neutral-400 hover:text-white'
            }`}
            title="Light Mode"
          >
            <Sun className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* In-Book Full-Text Search Toggle */}
        <button
          onClick={() => {
            if (searchOpen) {
              handleCloseSearch();
            } else {
              setSearchOpen(true);
            }
          }}
          className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
            searchOpen ? ht.iconBtnActive : ht.iconBtn
          }`}
          title={searchOpen ? t('searchClose') : t('searchInBook')}
        >
          <Search className="w-4 h-4" />
        </button>

        {/* Read Aloud (Text-to-Speech) Toggle */}
        <button
          onClick={toggleTts}
          className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
            ttsOpen ? ht.iconBtnActive : ht.iconBtn
          }`}
          title={ttsOpen ? t('stopSpeech') : t('readAloudTitle')}
        >
          <Headphones className="w-4 h-4" />
        </button>

        {/* Favorite Toggle */}
        <button
          onClick={handleFavToggle}
          className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
            favState
              ? 'bg-rose-500/10 border-rose-500/40 text-rose-500'
              : ht.iconBtn
          }`}
          title={favState ? t('removeFromFavorites') : t('addToFavorites')}
        >
          <Heart className={`w-4 h-4 ${favState ? 'fill-rose-500 text-rose-500' : ''}`} />
        </button>

        {/* Comments & Highlights Drawer Toggle */}
        <button
          onClick={() => {
            setCommentsDrawerOpen(prev => {
              const next = !prev;
              if (onResizeRendition) {
                setTimeout(onResizeRendition, 150);
              }
              return next;
            });
          }}
          className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
            commentsDrawerOpen ? ht.iconBtnActive : ht.iconBtn
          }`}
          title={commentsDrawerOpen ? t('hideComments') : (annotationsCount > 0 ? `${t('showComments')} (${annotationsCount})` : t('showComments'))}
        >
          <div className="relative">
            <MessageSquare className="w-4 h-4" />
            {annotationsCount > 0 && (
              <span className={`absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-400 ring-2 ${
                theme === 'dark' ? 'ring-neutral-900' : theme === 'sepia' ? 'ring-[#fbf0d9]' : 'ring-white'
              }`} />
            )}
          </div>
        </button>

        {/* Header Pin Toggle */}
        <button
          onClick={toggleHeaderPinned}
          className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
            headerPinned ? ht.iconBtnActive : ht.iconBtn
          }`}
          title={headerPinned ? t('unpinHeaderTitle') : t('pinHeaderTitle')}
        >
          {headerPinned ? <PanelTopClose className="w-4 h-4" /> : <PanelTopOpen className="w-4 h-4" />}
        </button>

        {/* Fullscreen Button */}
        <button
          onClick={toggleFullscreen}
          className={`p-1.5 rounded-lg border transition-colors hidden sm:block cursor-pointer ${ht.iconBtn}`}
          title={t('fullscreenTitle')}
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>

        {/* Reader Settings Popover */}
        <div className="relative">
          <button
            onClick={() => setReaderSettingsOpen(prev => !prev)}
            className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
              readerSettingsOpen ? ht.iconBtnActive : ht.iconBtn
            }`}
            title={t('readerSettings')}
          >
            <Settings className="w-4 h-4" />
          </button>

          {readerSettingsOpen && (
            <>
              <div
                className="fixed inset-0 z-40 bg-transparent"
                onClick={() => setReaderSettingsOpen(false)}
              />
              <div className={`absolute right-0 top-full mt-2 w-72 sm:w-80 max-h-[calc(100vh-5.5rem)] flex flex-col rounded-2xl p-3.5 z-50 text-left select-none animate-in fade-in zoom-in-95 duration-150 border ${
                theme === 'dark'
                  ? 'bg-neutral-900 border-neutral-700 shadow-2xl shadow-black/80 text-neutral-100'
                  : theme === 'sepia'
                  ? 'bg-[#fbf0d9] border-[#d8c5a0] shadow-2xl shadow-neutral-900/15 text-[#292014]'
                  : 'bg-white border-neutral-200 shadow-2xl shadow-neutral-900/15 text-neutral-800'
              }`}>
                <div className={`flex items-center justify-between pb-2.5 mb-2.5 border-b shrink-0 ${
                  theme === 'dark' ? 'border-neutral-800' : theme === 'sepia' ? 'border-[#d8c5a0]' : 'border-neutral-200'
                }`}>
                  <div className="flex items-center gap-2">
                    <SlidersHorizontal className="w-4 h-4 text-amber-500" />
                    <h3 className={`text-xs font-bold uppercase tracking-wider ${
                      theme === 'dark' ? 'text-neutral-100' : theme === 'sepia' ? 'text-[#292014]' : 'text-neutral-900'
                    }`}>{t('readerSettings')}</h3>
                  </div>
                  <button
                    onClick={() => setReaderSettingsOpen(false)}
                    className={`p-1 rounded-md transition cursor-pointer ${
                      theme === 'dark'
                        ? 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800'
                        : theme === 'sepia'
                        ? 'text-[#7c6a53] hover:text-[#292014] hover:bg-[#efe0c2]'
                        : 'text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100'
                    }`}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-1.5 reader-settings-scroll flex-1 pr-1">
                  {/* Toggle Bottom Progress Bar */}
                  <label className={`flex items-start justify-between gap-3 p-2.5 rounded-xl transition-colors cursor-pointer group ${
                    theme === 'dark' ? 'hover:bg-neutral-800/60' : theme === 'sepia' ? 'hover:bg-[#efe0c2]/60' : 'hover:bg-neutral-100'
                  }`}>
                    <div className="min-w-0 flex-1">
                      <span className={`text-xs font-semibold block transition-colors ${
                        theme === 'dark' ? 'text-neutral-100 group-hover:text-amber-300' : theme === 'sepia' ? 'text-[#292014] group-hover:text-amber-700' : 'text-neutral-900 group-hover:text-amber-600'
                      }`}>
                        {t('bottomProgressBar')}
                      </span>
                      <span className={`text-[11px] leading-snug block mt-0.5 ${
                        theme === 'dark' ? 'text-neutral-300' : theme === 'sepia' ? 'text-[#7c6a53]' : 'text-neutral-500'
                      }`}>
                        {t('bottomProgressBarDesc')}
                      </span>
                    </div>
                    <div className="relative inline-flex items-center cursor-pointer shrink-0 mt-0.5">
                      <input
                        type="checkbox"
                        checked={showBottomProgress}
                        onChange={toggleBottomProgress}
                        className="sr-only peer"
                      />
                      <div className={`w-9 h-5 ${theme === 'dark' ? 'bg-neutral-800 border-neutral-700' : 'bg-neutral-300 border-neutral-300'} border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500 peer-checked:border-amber-500`}></div>
                    </div>
                  </label>

                  {/* Toggle Trackpad Swipe */}
                  <label className={`flex items-start justify-between gap-3 p-2.5 rounded-xl transition-colors cursor-pointer group ${
                    theme === 'dark' ? 'hover:bg-neutral-800/60' : theme === 'sepia' ? 'hover:bg-[#efe0c2]/60' : 'hover:bg-neutral-100'
                  }`}>
                    <div className="min-w-0 flex-1">
                      <span className={`text-xs font-semibold block transition-colors ${
                        theme === 'dark' ? 'text-neutral-100 group-hover:text-amber-300' : theme === 'sepia' ? 'text-[#292014] group-hover:text-amber-700' : 'text-neutral-900 group-hover:text-amber-600'
                      }`}>
                        {t('trackpadSwipe')}
                      </span>
                      <span className={`text-[11px] leading-snug block mt-0.5 ${
                        theme === 'dark' ? 'text-neutral-300' : theme === 'sepia' ? 'text-[#7c6a53]' : 'text-neutral-500'
                      }`}>
                        {t('trackpadSwipeDesc')}
                      </span>
                    </div>
                    <div className="relative inline-flex items-center cursor-pointer shrink-0 mt-0.5">
                      <input
                        type="checkbox"
                        checked={trackpadSwipeEnabled}
                        onChange={toggleTrackpadSwipe}
                        className="sr-only peer"
                      />
                      <div className={`w-9 h-5 ${theme === 'dark' ? 'bg-neutral-800 border-neutral-700' : 'bg-neutral-300 border-neutral-300'} border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500 peer-checked:border-amber-500`}></div>
                    </div>
                  </label>

                  {/* Toggle Floating Side Buttons */}
                  <label className={`flex items-start justify-between gap-3 p-2.5 rounded-xl transition-colors cursor-pointer group ${
                    theme === 'dark' ? 'hover:bg-neutral-800/60' : theme === 'sepia' ? 'hover:bg-[#efe0c2]/60' : 'hover:bg-neutral-100'
                  }`}>
                    <div className="min-w-0 flex-1">
                      <span className={`text-xs font-semibold block transition-colors ${
                        theme === 'dark' ? 'text-neutral-100 group-hover:text-amber-300' : theme === 'sepia' ? 'text-[#292014] group-hover:text-amber-700' : 'text-neutral-900 group-hover:text-amber-600'
                      }`}>
                        {t('floatingSideButtons')}
                      </span>
                      <span className={`text-[11px] leading-snug block mt-0.5 ${
                        theme === 'dark' ? 'text-neutral-300' : theme === 'sepia' ? 'text-[#7c6a53]' : 'text-neutral-500'
                      }`}>
                        {t('floatingSideButtonsDesc')}
                      </span>
                    </div>
                    <div className="relative inline-flex items-center cursor-pointer shrink-0 mt-0.5">
                      <input
                        type="checkbox"
                        checked={floatingButtonsEnabled}
                        onChange={toggleFloatingButtons}
                        className="sr-only peer"
                      />
                      <div className={`w-9 h-5 ${theme === 'dark' ? 'bg-neutral-800 border-neutral-700' : 'bg-neutral-300 border-neutral-300'} border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500 peer-checked:border-amber-500`}></div>
                    </div>
                  </label>

                  {/* Toggle Up/Down Arrow Page Flip */}
                  <label className={`flex items-start justify-between gap-3 p-2.5 rounded-xl transition-colors cursor-pointer group ${
                    theme === 'dark' ? 'hover:bg-neutral-800/60' : theme === 'sepia' ? 'hover:bg-[#efe0c2]/60' : 'hover:bg-neutral-100'
                  }`}>
                    <div className="min-w-0 flex-1">
                      <span className={`text-xs font-semibold block transition-colors ${
                        theme === 'dark' ? 'text-neutral-100 group-hover:text-amber-300' : theme === 'sepia' ? 'text-[#292014] group-hover:text-amber-700' : 'text-neutral-900 group-hover:text-amber-600'
                      }`}>
                        {t('upDownPageFlip')}
                      </span>
                      <span className={`text-[11px] leading-snug block mt-0.5 ${
                        theme === 'dark' ? 'text-neutral-300' : theme === 'sepia' ? 'text-[#7c6a53]' : 'text-neutral-500'
                      }`}>
                        {t('upDownPageFlipDesc')}
                      </span>
                    </div>
                    <div className="relative inline-flex items-center cursor-pointer shrink-0 mt-0.5">
                      <input
                        type="checkbox"
                        checked={upDownFlipEnabled}
                        onChange={toggleUpDownFlip}
                        className="sr-only peer"
                      />
                      <div className={`w-9 h-5 ${theme === 'dark' ? 'bg-neutral-800 border-neutral-700' : 'bg-neutral-300 border-neutral-300'} border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500 peer-checked:border-amber-500`}></div>
                    </div>
                  </label>

                  {/* Toggle Keep Header Pinned */}
                  <label className={`flex items-start justify-between gap-3 p-2.5 rounded-xl transition-colors cursor-pointer group ${
                    theme === 'dark' ? 'hover:bg-neutral-800/60' : theme === 'sepia' ? 'hover:bg-[#efe0c2]/60' : 'hover:bg-neutral-100'
                  }`}>
                    <div className="min-w-0 flex-1">
                      <span className={`text-xs font-semibold block transition-colors ${
                        theme === 'dark' ? 'text-neutral-100 group-hover:text-amber-300' : theme === 'sepia' ? 'text-[#292014] group-hover:text-amber-700' : 'text-neutral-900 group-hover:text-amber-600'
                      }`}>
                        {t('keepHeaderPinned')}
                      </span>
                      <span className={`text-[11px] leading-snug block mt-0.5 ${
                        theme === 'dark' ? 'text-neutral-300' : theme === 'sepia' ? 'text-[#7c6a53]' : 'text-neutral-500'
                      }`}>
                        {t('keepHeaderPinnedDesc')}
                      </span>
                    </div>
                    <div className="relative inline-flex items-center cursor-pointer shrink-0 mt-0.5">
                      <input
                        type="checkbox"
                        checked={headerPinned}
                        onChange={toggleHeaderPinned}
                        className="sr-only peer"
                      />
                      <div className={`w-9 h-5 ${theme === 'dark' ? 'bg-neutral-800 border-neutral-700' : 'bg-neutral-300 border-neutral-300'} border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500 peer-checked:border-amber-500`}></div>
                    </div>
                  </label>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
