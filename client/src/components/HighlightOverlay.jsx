import React, { useState } from 'react';
import { MessageSquare, Trash2, Edit3, Check, X } from 'lucide-react';
import { useI18n } from '../i18n';

const COLOR_STYLES = {
  yellow: {
    bg: 'bg-amber-400/35 hover:bg-amber-400/50',
    border: 'border-b-2 border-amber-400/80',
    badge: 'bg-amber-500 text-neutral-950',
    accent: 'text-amber-400',
  },
  green: {
    bg: 'bg-emerald-400/35 hover:bg-emerald-400/50',
    border: 'border-b-2 border-emerald-400/80',
    badge: 'bg-emerald-500 text-neutral-950',
    accent: 'text-emerald-400',
  },
  blue: {
    bg: 'bg-sky-400/35 hover:bg-sky-400/50',
    border: 'border-b-2 border-sky-400/80',
    badge: 'bg-sky-500 text-neutral-950',
    accent: 'text-sky-400',
  },
  purple: {
    bg: 'bg-purple-400/35 hover:bg-purple-400/50',
    border: 'border-b-2 border-purple-400/80',
    badge: 'bg-purple-500 text-neutral-950',
    accent: 'text-purple-400',
  },
  rose: {
    bg: 'bg-rose-400/35 hover:bg-rose-400/50',
    border: 'border-b-2 border-rose-400/80',
    badge: 'bg-rose-500 text-neutral-950',
    accent: 'text-rose-400',
  },
};

export default function HighlightOverlay({ 
  annotations = [], 
  onUpdateComment, 
  onDeleteAnnotation,
  invertColors = false 
}) {
  const { t } = useI18n();
  const [activeAnnotation, setActiveAnnotation] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState('');

  const handleOpenPopover = (e, ann) => {
    e.stopPropagation();
    setActiveAnnotation(ann);
    setIsEditing(false);
    setEditText(ann.comment || '');
  };

  const handleSaveEdit = (e) => {
    e.stopPropagation();
    if (activeAnnotation && onUpdateComment) {
      onUpdateComment(activeAnnotation.id, editText.trim());
      setActiveAnnotation(prev => prev ? { ...prev, comment: editText.trim() } : null);
    }
    setIsEditing(false);
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    if (activeAnnotation && onDeleteAnnotation) {
      onDeleteAnnotation(activeAnnotation.id);
      setActiveAnnotation(null);
    }
  };

  return (
    <div className="absolute inset-0 pointer-events-none z-15 overflow-hidden">
      {annotations.map((ann) => {
        const colorStyle = COLOR_STYLES[ann.color] || COLOR_STYLES.yellow;
        const rects = ann.rects || [];
        if (rects.length === 0) return null;

        // Find last rect to place the sticky note badge
        const lastRect = rects[rects.length - 1];

        return (
          <React.Fragment key={ann.id}>
            {/* Highlight Rectangle segments */}
            {rects.map((r, i) => (
              <div
                key={i}
                onClick={(e) => handleOpenPopover(e, ann)}
                className={`
                  absolute cursor-pointer pointer-events-auto rounded-xs transition-colors
                  ${colorStyle.bg} ${colorStyle.border}
                `}
                style={{
                  left: `${r.xPct * 100}%`,
                  top: `${r.yPct * 100}%`,
                  width: `${r.wPct * 100}%`,
                  height: `${r.hPct * 100}%`,
                  mixBlendMode: invertColors ? 'screen' : 'multiply',
                }}
                title={ann.comment ? `Note: ${ann.comment}` : ann.text}
              />
            ))}

            {/* Note indicator badge if comment exists */}
            {ann.comment && (
              <div
                onClick={(e) => handleOpenPopover(e, ann)}
                className={`
                  absolute cursor-pointer pointer-events-auto -translate-y-1/2 translate-x-1/2 
                  w-4 h-4 rounded-full flex items-center justify-center shadow-md transition-transform hover:scale-125
                  ${colorStyle.badge} z-20
                `}
                style={{
                  left: `${(lastRect.xPct + lastRect.wPct) * 100}%`,
                  top: `${lastRect.yPct * 100}%`,
                }}
                title={ann.comment}
              >
                <MessageSquare className="w-2.5 h-2.5" />
              </div>
            )}
          </React.Fragment>
        );
      })}

      {/* Active Annotation Popover */}
      {activeAnnotation && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs pointer-events-auto"
          onClick={() => setActiveAnnotation(null)}
        >
          <div 
            className="w-full max-w-sm bg-neutral-900 border border-neutral-750 rounded-xl shadow-2xl p-4 text-xs text-neutral-200 animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-neutral-800">
              <span className="font-semibold text-neutral-300 flex items-center gap-1.5">
                <span className={`w-2.5 h-2.5 rounded-full ${COLOR_STYLES[activeAnnotation.color]?.badge || 'bg-amber-400'}`} />
                <span>{t('pageBadge', { page: activeAnnotation.page })}</span>
              </span>
              <button
                onClick={() => setActiveAnnotation(null)}
                className="p-1 rounded text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800 transition"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Quote snippet */}
            <blockquote className="italic text-neutral-400 border-l-2 border-neutral-700 pl-2.5 py-0.5 mb-3 max-h-24 overflow-y-auto leading-relaxed">
              "{activeAnnotation.text}"
            </blockquote>

            {/* Comment Body / Editor */}
            {isEditing ? (
              <div className="space-y-2 mb-3">
                <textarea
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  placeholder={t('addCommentPlaceholder')}
                  rows={3}
                  className="w-full p-2 text-xs bg-neutral-950 border border-neutral-750 rounded-lg text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-amber-500"
                  autoFocus
                />
                <div className="flex items-center justify-end gap-1.5">
                  <button
                    onClick={() => setIsEditing(false)}
                    className="px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-750 text-neutral-300 text-xs"
                  >
                    {t('cancel')}
                  </button>
                  <button
                    onClick={handleSaveEdit}
                    className="px-2.5 py-1 rounded bg-amber-500 hover:bg-amber-400 text-neutral-950 font-semibold text-xs flex items-center gap-1"
                  >
                    <Check className="w-3 h-3" />
                    <span>{t('saveComment')}</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="mb-3">
                {activeAnnotation.comment ? (
                  <p className="text-xs text-neutral-100 whitespace-pre-wrap bg-neutral-950/60 p-2.5 rounded-lg border border-neutral-850">
                    {activeAnnotation.comment}
                  </p>
                ) : (
                  <p className="text-[11px] text-neutral-500 italic">
                    {t('noCommentsDesc')}
                  </p>
                )}
              </div>
            )}

            {/* Footer Actions */}
            {!isEditing && (
              <div className="flex items-center justify-between pt-2 border-t border-neutral-800/80">
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded hover:bg-neutral-800 text-neutral-300 hover:text-white transition"
                >
                  <Edit3 className="w-3.5 h-3.5 text-neutral-400" />
                  <span>{activeAnnotation.comment ? t('editComment') : t('addComment')}</span>
                </button>

                <button
                  onClick={handleDelete}
                  className="flex items-center gap-1 px-2 py-1 rounded hover:bg-rose-950/40 text-neutral-400 hover:text-rose-400 transition"
                  title={t('deleteComment')}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{t('removeHighlight')}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
