import React from 'react';
import { SlidersHorizontal, X } from 'lucide-react';
import { useI18n } from '../i18n';

function ToggleItem({
  title,
  description,
  checked,
  onChange,
  theme = 'dark',
  nested = false,
}) {
  const isDark = theme === 'dark';
  const isSepia = theme === 'sepia';

  const hoverBg = isDark ? 'hover:bg-neutral-800/60' : isSepia ? 'hover:bg-[#efe0c2]/60' : 'hover:bg-neutral-100';
  const titleColor = isDark
    ? 'text-neutral-100 group-hover:text-amber-300'
    : isSepia
    ? 'text-[#292014] group-hover:text-amber-700'
    : 'text-neutral-900 group-hover:text-amber-600';
  const descColor = isDark ? 'text-neutral-300' : isSepia ? 'text-[#7c6a53]' : 'text-neutral-500';
  const toggleOffBg = isDark ? 'bg-neutral-800 border-neutral-700' : 'bg-neutral-300 border-neutral-300';

  return (
    <label className={`flex items-start justify-between gap-3 p-2.5 rounded-xl transition-colors cursor-pointer group ${nested ? 'pl-6' : ''} ${hoverBg}`}>
      <div className="min-w-0 flex-1">
        <span className={`text-xs font-semibold block transition-colors ${titleColor}`}>
          {title}
        </span>
        {description && (
          <span className={`text-[11px] leading-snug block mt-0.5 ${descColor}`}>
            {description}
          </span>
        )}
      </div>
      <div className="relative inline-flex items-center cursor-pointer shrink-0 mt-0.5">
        <input
          type="checkbox"
          checked={Boolean(checked)}
          onChange={onChange}
          className="sr-only peer"
        />
        <div className={`w-9 h-5 ${toggleOffBg} border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500 peer-checked:border-amber-500`}></div>
      </div>
    </label>
  );
}

/**
 * Shared modal popover for Reader Settings in PDF and EPUB viewers.
 */
export default function ReaderSettingsPopover({
  isOpen,
  onClose,
  theme = 'dark',
  invertColors,
  // Universal settings
  showBottomProgress,
  toggleBottomProgress,
  trackpadSwipeEnabled,
  toggleTrackpadSwipe,
  floatingButtonsEnabled,
  toggleFloatingButtons,
  upDownFlipEnabled,
  toggleUpDownFlip,
  // PDF-specific settings
  centerVertically,
  toggleCenterVertically,
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
  // Header pin
  headerPinned,
  toggleHeaderPinned,
}) {
  const { t } = useI18n();

  if (!isOpen) return null;

  // Resolve active theme string
  const resolvedTheme = typeof invertColors === 'boolean'
    ? (invertColors ? 'dark' : 'light')
    : theme;

  const isDark = resolvedTheme === 'dark';
  const isSepia = resolvedTheme === 'sepia';

  const containerTheme = isDark
    ? 'bg-neutral-900 border-neutral-700 shadow-2xl shadow-black/80 text-neutral-100'
    : isSepia
    ? 'bg-[#fbf0d9] border-[#d8c5a0] shadow-2xl shadow-neutral-900/15 text-[#292014]'
    : 'bg-white border-neutral-200 shadow-2xl shadow-neutral-900/15 text-neutral-800';

  const headerBorder = isDark ? 'border-neutral-800' : isSepia ? 'border-[#d8c5a0]' : 'border-neutral-200';
  const headerTitle = isDark ? 'text-neutral-100' : isSepia ? 'text-[#292014]' : 'text-neutral-900';
  const closeBtn = isDark
    ? 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800'
    : isSepia
    ? 'text-[#7c6a53] hover:text-[#292014] hover:bg-[#efe0c2]'
    : 'text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100';

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-transparent"
        onClick={onClose}
      />
      <div className={`absolute right-0 top-full mt-2 w-72 sm:w-80 max-h-[calc(100vh-5.5rem)] flex flex-col rounded-2xl p-3.5 z-50 text-left select-none animate-in fade-in zoom-in-95 duration-150 border ${containerTheme}`}>
        <div className={`flex items-center justify-between pb-2.5 mb-2.5 border-b shrink-0 ${headerBorder}`}>
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-amber-500" />
            <h3 className={`text-xs font-bold uppercase tracking-wider ${headerTitle}`}>
              {t('readerSettings')}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`p-1 rounded-md transition cursor-pointer ${closeBtn}`}
            aria-label={t('close')}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="space-y-1.5 reader-settings-scroll flex-1 pr-1 overflow-y-auto">
          {/* Center Page Vertically (PDF) */}
          {toggleCenterVertically && (
            <ToggleItem
              title={t('centerPageVertically')}
              description={t('centerPageVerticallyDesc')}
              checked={centerVertically}
              onChange={toggleCenterVertically}
              theme={resolvedTheme}
            />
          )}

          {/* Bottom Progress Bar */}
          {toggleBottomProgress && (
            <ToggleItem
              title={t('bottomProgressBar')}
              description={t('bottomProgressBarDesc')}
              checked={showBottomProgress}
              onChange={toggleBottomProgress}
              theme={resolvedTheme}
            />
          )}

          {/* Trackpad Swipe */}
          {toggleTrackpadSwipe && (
            <ToggleItem
              title={t('trackpadSwipeNavigation')}
              description={t('trackpadSwipeDesc')}
              checked={trackpadSwipeEnabled}
              onChange={toggleTrackpadSwipe}
              theme={resolvedTheme}
            />
          )}

          {/* Floating Navigation Buttons */}
          {toggleFloatingButtons && (
            <ToggleItem
              title={t('floatingSideButtons')}
              description={t('floatingSideButtonsDesc')}
              checked={floatingButtonsEnabled}
              onChange={toggleFloatingButtons}
              theme={resolvedTheme}
            />
          )}

          {/* Up/Down Arrow Page Flip */}
          {toggleUpDownFlip && (
            <ToggleItem
              title={t('upDownPageFlip')}
              description={t('upDownPageFlipDesc')}
              checked={upDownFlipEnabled}
              onChange={toggleUpDownFlip}
              theme={resolvedTheme}
            />
          )}

          {/* Dual Page Mode (PDF) */}
          {toggleDualPage && (
            <ToggleItem
              title={t('dualPageSetting')}
              description={t('dualPageSettingDesc')}
              checked={isDualPage}
              onChange={toggleDualPage}
              theme={resolvedTheme}
            />
          )}

          {/* Dual Cover Standalone (PDF) */}
          {isDualPage && toggleDualCover && (
            <ToggleItem
              title={t('dualCoverStandalone')}
              description={t('dualCoverStandaloneDesc')}
              checked={dualCoverStandalone}
              onChange={toggleDualCover}
              theme={resolvedTheme}
              nested
            />
          )}

          {/* Paper Texture (PDF) */}
          {toggleBookTexture && (
            <ToggleItem
              title={t('bookTexture')}
              description={t('bookTextureDesc')}
              checked={bookTextureEnabled}
              onChange={toggleBookTexture}
              theme={resolvedTheme}
            />
          )}

          {/* Continuous Scroll Mode (PDF) */}
          {toggleScrollMode && (
            <ToggleItem
              title={t('verticalScrollMode')}
              description={t('verticalScrollDesc')}
              checked={isContinuous}
              onChange={toggleScrollMode}
              theme={resolvedTheme}
            />
          )}

          {/* Continuous Page Spacing (PDF) */}
          {isContinuous && toggleContinuousPageSpacing && (
            <ToggleItem
              title={t('continuousPageSpacing')}
              description={t('continuousPageSpacingDesc')}
              checked={continuousPageSpacing}
              onChange={toggleContinuousPageSpacing}
              theme={resolvedTheme}
              nested
            />
          )}

          {/* Header Pin Toggle */}
          {toggleHeaderPinned && (
            <ToggleItem
              title={t('keepHeaderPinned')}
              description={t('keepHeaderPinnedDesc')}
              checked={headerPinned}
              onChange={toggleHeaderPinned}
              theme={resolvedTheme}
            />
          )}
        </div>
      </div>
    </>
  );
}
