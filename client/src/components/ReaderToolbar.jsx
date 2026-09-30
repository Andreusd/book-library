import React from 'react';
import { 
  ArrowLeft, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, 
  Maximize2, Minimize2, Moon, Sun, ListTree,
  MessageSquare, Heart, Settings, SlidersHorizontal, X,
  RotateCcw, StretchHorizontal,
  Search, Headphones
} from 'lucide-react';
import { useI18n } from '../i18n';

/**
 * Isolated Reader Toolbar component containing all navigation,
 * zoom, search, TTS, display mode, and settings toggles.
 */
export default function ReaderToolbar({
  book,
  shouldShowExtension,
  onClose,
  hasOutline,
  outlineOpen,
  setOutlineOpen,
  hasPrev,
  hasNext,
  goToPrevPage,
  goToNextPage,
  pageInput,
  setPageInput,
  handlePageSubmit,
  handlePageInputBlur,
  totalPages,
  progressPercent,
  handleZoomIn,
  handleZoomOut,
  handleResetZoom,
  fitWidth,
  searchOpen,
  onToggleSearch,
  ttsOpen,
  toggleTts,
  invertColors,
  onToggleInvertColors,
  favState,
  handleToggleFav,
  commentsDrawerOpen,
  setCommentsDrawerOpen,
  annotationsCount = 0,
  isFullscreen,
  toggleFullscreen,
  readerSettingsOpen,
  setReaderSettingsOpen,
  // Reader settings options
  centerVertically,
  toggleCenterVertically,
  showBottomProgress,
  toggleBottomProgress,
  trackpadSwipeEnabled,
  setTrackpadSwipeEnabled,
  floatingButtonsEnabled,
  setFloatingButtonsEnabled,
  upDownFlipEnabled,
  setUpDownFlipEnabled,
  isDualPage,
  toggleDualPage,
  dualCoverStandalone,
  toggleDualCover,
  bookTextureEnabled,
  toggleBookTexture,
  isContinuous,
  toggleScrollMode,
  continuousPageSpacing,
  toggleContinuousPageSpacing,
  // Header visibility & hover handlers
  isHeaderShowing,
  headerPinned,
  toggleHeaderPinned,
  onMouseEnterHeader,
  onMouseLeaveHeader,
}) {
  const { t } = useI18n();

  const btnClass = invertColors 
    ? 'bg-neutral-800/80 hover:bg-neutral-700 text-neutral-300 hover:text-white' 
    : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700 hover:text-neutral-900 border border-neutral-200';

  const btnActiveClass = invertColors 
    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' 
    : 'bg-amber-500/20 text-amber-700 border border-amber-500/40';

  const dividerClass = invertColors ? 'bg-neutral-700' : 'bg-neutral-300';
  const textTitleClass = invertColors ? 'text-neutral-100' : 'text-neutral-900';
  const textSubClass = invertColors ? 'text-neutral-400' : 'text-neutral-500';
  const inputClass = invertColors 
    ? 'bg-neutral-950 border-neutral-700 text-neutral-200 focus:border-amber-500' 
    : 'bg-white border-neutral-300 text-neutral-900 focus:border-amber-500';
  const pageSlashClass = invertColors ? 'text-neutral-400' : 'text-neutral-500';
  const percentClass = invertColors ? 'text-amber-400' : 'text-amber-600 font-semibold';
  const badgeClass = invertColors 
    ? 'bg-rose-950 text-rose-300 border-rose-500/40' 
    : 'bg-rose-50 text-rose-700 border-rose-200';

  return (
    <>
      {/* Invisible top hover zone to trigger header when hidden and unpinned */}
      {!headerPinned && !isHeaderShowing && (
        <div 
          onMouseEnter={onMouseEnterHeader}
          className="fixed top-0 left-0 right-0 h-4 z-40 bg-transparent pointer-events-auto"
        />
      )}
      <header 
        onMouseEnter={onMouseEnterHeader}
        onMouseLeave={onMouseLeaveHeader}
      className={`fixed top-0 left-0 right-0 z-40 h-14 border-b flex items-center px-3 sm:px-4 transition-all duration-300 select-none ${
        invertColors 
          ? 'bg-neutral-900/95 border-neutral-800 backdrop-blur shadow-md' 
          : 'bg-white/95 border-neutral-200 backdrop-blur shadow-sm'
      } ${
        headerPinned 
          ? 'translate-y-0 opacity-100' 
          : `${
              isHeaderShowing
                ? 'translate-y-0 opacity-100 pointer-events-auto' 
                : '-translate-y-full opacity-0 pointer-events-none'
            }`
      }`}
    >
      {/* Left: Navigation & Book Title */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0 max-w-[calc(50%-90px)] sm:max-w-[calc(50%-110px)] md:max-w-[calc(50%-130px)] z-10">
        <button 
          onClick={onClose}
          className={`h-7 flex items-center gap-1.5 px-2.5 rounded-lg transition text-xs font-medium shrink-0 cursor-pointer ${btnClass}`}
          title={t('backToLibraryTitle')}
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">{t('backToLibrary')}</span>
        </button>

        {/* Toggle PDF Index / Table of Contents Button (if available) */}
        {hasOutline && (
          <button
            onClick={() => setOutlineOpen(prev => !prev)}
            className={`h-7 w-7 flex items-center justify-center rounded-lg transition shrink-0 cursor-pointer ${
              outlineOpen ? btnActiveClass : btnClass
            }`}
            title={outlineOpen ? t('hideIndex') : t('showIndex')}
          >
            <ListTree className="w-4 h-4" />
          </button>
        )}
        
        <div className={`h-4 w-px mx-0.5 hidden sm:block shrink-0 ${dividerClass}`} />

        <div className="min-w-0 flex-1">
          <h1 className={`text-sm font-semibold truncate ${textTitleClass}`} title={book?.title}>
            {book?.title}
          </h1>
          <div className={`flex items-center gap-1.5 text-xs truncate ${textSubClass}`}>
            <span className="truncate">{book?.shelf_display} • {book?.size_formatted}</span>
            {shouldShowExtension && (
              <span className={`px-1 py-0.2 text-[8px] font-bold rounded uppercase shrink-0 border ${badgeClass}`}>
                PDF
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Center Page Controls - Always Centralized */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-2 z-10">
        <button 
          onClick={goToPrevPage}
          disabled={!hasPrev}
          className={`h-7 w-7 flex items-center justify-center rounded-lg disabled:opacity-30 transition cursor-pointer ${btnClass}`}
          title={t('prevPageTitle')}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <form onSubmit={handlePageSubmit} className="flex items-center text-xs font-mono">
          <input 
            type="text"
            value={pageInput}
            onChange={(e) => setPageInput(e.target.value)}
            onBlur={handlePageInputBlur}
            className={`w-14 sm:w-16 h-7 text-center py-0 rounded focus:outline-none ${inputClass}`}
          />
          <span className={`mx-1.5 ${pageSlashClass}`}>/</span>
          <span className={pageSlashClass}>{totalPages}</span>
        </form>

        <button 
          onClick={goToNextPage}
          disabled={!hasNext}
          className={`h-7 w-7 flex items-center justify-center rounded-lg disabled:opacity-30 transition cursor-pointer ${btnClass}`}
          title={t('nextPageTitle')}
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        <span className={`text-xs ml-1 hidden md:inline-block ${percentClass}`}>
          {progressPercent}%
        </span>
      </div>

      {/* Right Tools */}
      <div className="flex items-center gap-1.5 ml-auto z-10">
        {/* Zoom controls */}
        <button 
          onClick={() => handleZoomOut()}
          className={`h-7 w-7 flex items-center justify-center rounded-lg transition cursor-pointer ${btnClass}`}
          title={t('zoomOutTitle')}
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        
        <button 
          onClick={handleResetZoom}
          className={`h-7 w-7 flex items-center justify-center rounded-lg transition cursor-pointer hidden sm:inline-flex ${btnClass}`}
          title={t('resetWidthTitle')}
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        <button 
          onClick={() => fitWidth()}
          className={`h-7 w-7 flex items-center justify-center rounded-lg transition cursor-pointer hidden sm:inline-flex ${btnClass}`}
          title={t('fitWidth')}
        >
          <StretchHorizontal className="w-4 h-4" />
        </button>

        <button 
          onClick={() => handleZoomIn()}
          className={`h-7 w-7 flex items-center justify-center rounded-lg transition cursor-pointer ${btnClass}`}
          title={t('zoomInTitle')}
        >
          <ZoomIn className="w-4 h-4" />
        </button>

        <div className={`h-4 w-px mx-1 hidden sm:block ${dividerClass}`} />

        {/* In-Book Full-Text Search Toggle */}
        <button 
          onClick={onToggleSearch}
          className={`h-7 w-7 flex items-center justify-center rounded-lg transition shrink-0 cursor-pointer ${
            searchOpen ? btnActiveClass : btnClass
          }`}
          title={searchOpen ? t('searchClose') : t('searchInBook')}
        >
          <Search className="w-4 h-4" />
        </button>

        {/* Read Aloud (Text-to-Speech) Toggle */}
        <button 
          onClick={toggleTts}
          className={`h-7 w-7 flex items-center justify-center rounded-lg transition shrink-0 cursor-pointer ${
            ttsOpen ? btnActiveClass : btnClass
          }`}
          title={ttsOpen ? t('stopSpeech') : t('readAloudTitle')}
        >
          <Headphones className="w-4 h-4" />
        </button>

        {/* Invert Dark / Light */}
        <button 
          onClick={onToggleInvertColors}
          className={`h-7 w-7 flex items-center justify-center rounded-lg transition shrink-0 cursor-pointer ${
            invertColors ? btnActiveClass : btnClass
          }`}
          title={t('nightModeTitle')}
        >
          {invertColors ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
        </button>

        {/* Favorite Toggle */}
        <button 
          onClick={handleToggleFav}
          className={`h-7 w-7 flex items-center justify-center rounded-lg transition shrink-0 cursor-pointer ${
            favState 
              ? 'bg-rose-500/20 text-rose-500 border border-rose-500/30' 
              : btnClass
          }`}
          title={favState ? t('removeFromFavorites') : t('addToFavorites')}
        >
          <Heart className={`w-4 h-4 ${favState ? 'fill-rose-500 text-rose-500' : ''}`} />
        </button>

        {/* Comments & Highlights Drawer Toggle */}
        <button 
          onClick={() => setCommentsDrawerOpen(prev => !prev)}
          className={`h-7 w-7 flex items-center justify-center rounded-lg transition shrink-0 cursor-pointer ${
            commentsDrawerOpen ? btnActiveClass : btnClass
          }`}
          title={commentsDrawerOpen ? t('hideComments') : (annotationsCount > 0 ? `${t('showComments')} (${annotationsCount})` : t('showComments'))}
        >
          <MessageSquare className="w-4 h-4" />
        </button>

        {/* Fullscreen */}
        <button 
          onClick={toggleFullscreen}
          className={`h-7 w-7 flex items-center justify-center rounded-lg transition cursor-pointer ${btnClass}`}
          title={t('fullscreenTitle')}
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>

        {/* Reader Settings Popover */}
        <div className="relative">
          <button 
            onClick={() => setReaderSettingsOpen(prev => !prev)}
            className={`h-7 w-7 flex items-center justify-center rounded-lg transition shrink-0 cursor-pointer ${
              readerSettingsOpen ? btnActiveClass : btnClass
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
                invertColors 
                  ? 'bg-neutral-900 border-neutral-700 shadow-2xl shadow-black/80 text-neutral-100' 
                  : 'bg-white border-neutral-200 shadow-2xl shadow-neutral-900/15 text-neutral-800'
              }`}>
                <div className={`flex items-center justify-between pb-2.5 mb-2.5 border-b shrink-0 ${invertColors ? 'border-neutral-800' : 'border-neutral-200'}`}>
                  <div className="flex items-center gap-2">
                    <SlidersHorizontal className="w-4 h-4 text-amber-500" />
                    <h3 className={`text-xs font-bold uppercase tracking-wider ${invertColors ? 'text-neutral-100' : 'text-neutral-900'}`}>{t('readerSettings')}</h3>
                  </div>
                  <button 
                    onClick={() => setReaderSettingsOpen(false)}
                    className={`p-1 rounded-md transition cursor-pointer ${invertColors ? 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800' : 'text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100'}`}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-1.5 reader-settings-scroll flex-1 pr-1 overflow-y-auto">
                  {/* Centralize Page Vertically */}
                  <label className={`flex items-start justify-between gap-3 p-2.5 rounded-xl transition-colors cursor-pointer group ${invertColors ? 'hover:bg-neutral-800/60' : 'hover:bg-neutral-100'}`}>
                    <div className="min-w-0 flex-1">
                      <span className={`text-xs font-semibold block transition-colors ${invertColors ? 'text-neutral-100 group-hover:text-amber-300' : 'text-neutral-900 group-hover:text-amber-600'}`}>
                        {t('centerVertically')}
                      </span>
                      <span className={`text-[11px] leading-snug block mt-0.5 ${invertColors ? 'text-neutral-300' : 'text-neutral-500'}`}>
                        {t('centerVerticallyDesc')}
                      </span>
                    </div>
                    <div className="relative inline-flex items-center cursor-pointer shrink-0 mt-0.5">
                      <input 
                        type="checkbox"
                        checked={centerVertically}
                        onChange={toggleCenterVertically}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-neutral-800 border border-neutral-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500 peer-checked:border-amber-500"></div>
                    </div>
                  </label>

                  {/* Bottom Progress Bar */}
                  <label className={`flex items-start justify-between gap-3 p-2.5 rounded-xl transition-colors cursor-pointer group ${invertColors ? 'hover:bg-neutral-800/60' : 'hover:bg-neutral-100'}`}>
                    <div className="min-w-0 flex-1">
                      <span className={`text-xs font-semibold block transition-colors ${invertColors ? 'text-neutral-100 group-hover:text-amber-300' : 'text-neutral-900 group-hover:text-amber-600'}`}>
                        {t('bottomProgressBar')}
                      </span>
                      <span className={`text-[11px] leading-snug block mt-0.5 ${invertColors ? 'text-neutral-300' : 'text-neutral-500'}`}>
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
                      <div className="w-9 h-5 bg-neutral-800 border border-neutral-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500 peer-checked:border-amber-500"></div>
                    </div>
                  </label>

                  {/* Trackpad Swipe */}
                  <label className={`flex items-start justify-between gap-3 p-2.5 rounded-xl transition-colors cursor-pointer group ${invertColors ? 'hover:bg-neutral-800/60' : 'hover:bg-neutral-100'}`}>
                    <div className="min-w-0 flex-1">
                      <span className={`text-xs font-semibold block transition-colors ${invertColors ? 'text-neutral-100 group-hover:text-amber-300' : 'text-neutral-900 group-hover:text-amber-600'}`}>
                        {t('trackpadSwipe')}
                      </span>
                      <span className={`text-[11px] leading-snug block mt-0.5 ${invertColors ? 'text-neutral-300' : 'text-neutral-500'}`}>
                        {t('trackpadSwipeDesc')}
                      </span>
                    </div>
                    <div className="relative inline-flex items-center cursor-pointer shrink-0 mt-0.5">
                      <input 
                        type="checkbox"
                        checked={trackpadSwipeEnabled}
                        onChange={() => {
                          setTrackpadSwipeEnabled((prev) => {
                            const next = !prev;
                            try { localStorage.setItem('reader_trackpad_swipe', String(next)); } catch {}
                            return next;
                          });
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-neutral-800 border border-neutral-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500 peer-checked:border-amber-500"></div>
                    </div>
                  </label>

                  {/* Floating Buttons */}
                  <label className={`flex items-start justify-between gap-3 p-2.5 rounded-xl transition-colors cursor-pointer group ${invertColors ? 'hover:bg-neutral-800/60' : 'hover:bg-neutral-100'}`}>
                    <div className="min-w-0 flex-1">
                      <span className={`text-xs font-semibold block transition-colors ${invertColors ? 'text-neutral-100 group-hover:text-amber-300' : 'text-neutral-900 group-hover:text-amber-600'}`}>
                        {t('floatingSideButtons')}
                      </span>
                      <span className={`text-[11px] leading-snug block mt-0.5 ${invertColors ? 'text-neutral-300' : 'text-neutral-500'}`}>
                        {t('floatingSideButtonsDesc')}
                      </span>
                    </div>
                    <div className="relative inline-flex items-center cursor-pointer shrink-0 mt-0.5">
                      <input 
                        type="checkbox"
                        checked={floatingButtonsEnabled}
                        onChange={() => {
                          setFloatingButtonsEnabled((prev) => {
                            const next = !prev;
                            try { localStorage.setItem('reader_floating_buttons', String(next)); } catch {}
                            return next;
                          });
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-neutral-800 border border-neutral-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500 peer-checked:border-amber-500"></div>
                    </div>
                  </label>

                  {/* Vertical Keys Page Flip */}
                  <label className={`flex items-start justify-between gap-3 p-2.5 rounded-xl transition-colors cursor-pointer group ${invertColors ? 'hover:bg-neutral-800/60' : 'hover:bg-neutral-100'}`}>
                    <div className="min-w-0 flex-1">
                      <span className={`text-xs font-semibold block transition-colors ${invertColors ? 'text-neutral-100 group-hover:text-amber-300' : 'text-neutral-900 group-hover:text-amber-600'}`}>
                        {t('upDownPageFlip')}
                      </span>
                      <span className={`text-[11px] leading-snug block mt-0.5 ${invertColors ? 'text-neutral-300' : 'text-neutral-500'}`}>
                        {t('upDownPageFlipDesc')}
                      </span>
                    </div>
                    <div className="relative inline-flex items-center cursor-pointer shrink-0 mt-0.5">
                      <input 
                        type="checkbox"
                        checked={upDownFlipEnabled}
                        onChange={() => {
                          setUpDownFlipEnabled((prev) => {
                            const next = !prev;
                            try { localStorage.setItem('reader_up_down_flip', String(next)); } catch {}
                            return next;
                          });
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-neutral-800 border border-neutral-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500 peer-checked:border-amber-500"></div>
                    </div>
                  </label>

                  {/* Dual Page Mode */}
                  <label className={`flex items-start justify-between gap-3 p-2.5 rounded-xl transition-colors cursor-pointer group ${invertColors ? 'hover:bg-neutral-800/60' : 'hover:bg-neutral-100'}`}>
                    <div className="min-w-0 flex-1">
                      <span className={`text-xs font-semibold block transition-colors ${invertColors ? 'text-neutral-100 group-hover:text-amber-300' : 'text-neutral-900 group-hover:text-amber-600'}`}>
                        {t('dualPageSetting')}
                      </span>
                      <span className={`text-[11px] leading-snug block mt-0.5 ${invertColors ? 'text-neutral-300' : 'text-neutral-500'}`}>
                        {t('dualPageSettingDesc')}
                      </span>
                    </div>
                    <div className="relative inline-flex items-center cursor-pointer shrink-0 mt-0.5">
                      <input 
                        type="checkbox"
                        checked={isDualPage}
                        onChange={toggleDualPage}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-neutral-800 border border-neutral-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500 peer-checked:border-amber-500"></div>
                    </div>
                  </label>

                  {/* Dual Cover Standalone */}
                  {isDualPage && (
                    <label className={`flex items-start justify-between gap-3 p-2.5 rounded-xl transition-colors cursor-pointer group pl-6 ${invertColors ? 'hover:bg-neutral-800/60' : 'hover:bg-neutral-100'}`}>
                      <div className="min-w-0 flex-1">
                        <span className={`text-xs font-semibold block transition-colors ${invertColors ? 'text-neutral-100 group-hover:text-amber-300' : 'text-neutral-900 group-hover:text-amber-600'}`}>
                          {t('dualCoverStandalone')}
                        </span>
                        <span className={`text-[11px] leading-snug block mt-0.5 ${invertColors ? 'text-neutral-300' : 'text-neutral-500'}`}>
                          {t('dualCoverStandaloneDesc')}
                        </span>
                      </div>
                      <div className="relative inline-flex items-center cursor-pointer shrink-0 mt-0.5">
                        <input 
                          type="checkbox"
                          checked={dualCoverStandalone}
                          onChange={toggleDualCover}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-neutral-800 border border-neutral-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500 peer-checked:border-amber-500"></div>
                      </div>
                    </label>
                  )}

                  {/* Paper Book Texture */}
                  <label className={`flex items-start justify-between gap-3 p-2.5 rounded-xl transition-colors cursor-pointer group ${invertColors ? 'hover:bg-neutral-800/60' : 'hover:bg-neutral-100'}`}>
                    <div className="min-w-0 flex-1">
                      <span className={`text-xs font-semibold block transition-colors ${invertColors ? 'text-neutral-100 group-hover:text-amber-300' : 'text-neutral-900 group-hover:text-amber-600'}`}>
                        {t('bookTexture')}
                      </span>
                      <span className={`text-[11px] leading-snug block mt-0.5 ${invertColors ? 'text-neutral-300' : 'text-neutral-500'}`}>
                        {t('bookTextureDesc')}
                      </span>
                    </div>
                    <div className="relative inline-flex items-center cursor-pointer shrink-0 mt-0.5">
                      <input 
                        type="checkbox"
                        checked={bookTextureEnabled}
                        onChange={toggleBookTexture}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-neutral-800 border border-neutral-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500 peer-checked:border-amber-500"></div>
                    </div>
                  </label>

                  {/* Continuous Scroll Mode */}
                  <label className={`flex items-start justify-between gap-3 p-2.5 rounded-xl transition-colors cursor-pointer group ${invertColors ? 'hover:bg-neutral-800/60' : 'hover:bg-neutral-100'}`}>
                    <div className="min-w-0 flex-1">
                      <span className={`text-xs font-semibold block transition-colors ${invertColors ? 'text-neutral-100 group-hover:text-amber-300' : 'text-neutral-900 group-hover:text-amber-600'}`}>
                        {t('verticalScrollMode')}
                      </span>
                      <span className={`text-[11px] leading-snug block mt-0.5 ${invertColors ? 'text-neutral-300' : 'text-neutral-500'}`}>
                        {t('verticalScrollDesc')}
                      </span>
                    </div>
                    <div className="relative inline-flex items-center cursor-pointer shrink-0 mt-0.5">
                      <input 
                        type="checkbox"
                        checked={isContinuous}
                        onChange={toggleScrollMode}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-neutral-800 border border-neutral-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500 peer-checked:border-amber-500"></div>
                    </div>
                  </label>

                  {/* Spacing between continuous pages */}
                  {isContinuous && (
                    <label className={`flex items-start justify-between gap-3 p-2.5 rounded-xl transition-colors cursor-pointer group pl-6 ${invertColors ? 'hover:bg-neutral-800/60' : 'hover:bg-neutral-100'}`}>
                      <div className="min-w-0 flex-1">
                        <span className={`text-xs font-semibold block transition-colors ${invertColors ? 'text-neutral-100 group-hover:text-amber-300' : 'text-neutral-900 group-hover:text-amber-600'}`}>
                          {t('continuousPageSpacing')}
                        </span>
                        <span className={`text-[11px] leading-snug block mt-0.5 ${invertColors ? 'text-neutral-300' : 'text-neutral-500'}`}>
                          {t('continuousPageSpacingDesc')}
                        </span>
                      </div>
                      <div className="relative inline-flex items-center cursor-pointer shrink-0 mt-0.5">
                        <input 
                          type="checkbox"
                          checked={continuousPageSpacing}
                          onChange={toggleContinuousPageSpacing}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-neutral-800 border border-neutral-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500 peer-checked:border-amber-500"></div>
                      </div>
                    </label>
                  )}

                  {/* Pin Header */}
                  <label className={`flex items-start justify-between gap-3 p-2.5 rounded-xl transition-colors cursor-pointer group ${invertColors ? 'hover:bg-neutral-800/60' : 'hover:bg-neutral-100'}`}>
                    <div className="min-w-0 flex-1">
                      <span className={`text-xs font-semibold block transition-colors ${invertColors ? 'text-neutral-100 group-hover:text-amber-300' : 'text-neutral-900 group-hover:text-amber-600'}`}>
                        {t('keepHeaderPinned')}
                      </span>
                      <span className={`text-[11px] leading-snug block mt-0.5 ${invertColors ? 'text-neutral-300' : 'text-neutral-500'}`}>
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
                      <div className="w-9 h-5 bg-neutral-800 border border-neutral-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500 peer-checked:border-amber-500"></div>
                    </div>
                  </label>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
    </>
  );
}
