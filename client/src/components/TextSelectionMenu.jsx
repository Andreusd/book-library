import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, Copy, Check, X, Bookmark 
} from 'lucide-react';
import { useI18n } from '../i18n';

const COLORS = [
  { id: 'yellow', bg: 'bg-amber-400', ring: 'focus:ring-amber-400', name: 'colorYellow' },
  { id: 'green', bg: 'bg-emerald-400', ring: 'focus:ring-emerald-400', name: 'colorGreen' },
  { id: 'blue', bg: 'bg-sky-400', ring: 'focus:ring-sky-400', name: 'colorBlue' },
  { id: 'purple', bg: 'bg-purple-400', ring: 'focus:ring-purple-400', name: 'colorPurple' },
  { id: 'rose', bg: 'bg-rose-400', ring: 'focus:ring-rose-400', name: 'colorRose' },
];

export default function TextSelectionMenu({ 
  x, 
  y, 
  selectedText, 
  onHighlight, 
  onClose 
}) {
  const { t } = useI18n();
  const menuRef = useRef(null);
  const [copied, setCopied] = useState(false);
  const [showCommentInput, setShowCommentInput] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [selectedColor, setSelectedColor] = useState('yellow');

  // Close on outside click, scroll, or escape
  useEffect(() => {
    const handleOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose();
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  // Adjust coordinates for boundary
  const menuWidth = 240;
  const menuHeight = showCommentInput ? 220 : 130;
  const posX = Math.min(Math.max(10, x), window.innerWidth - menuWidth - 10);
  const posY = Math.min(Math.max(10, y), window.innerHeight - menuHeight - 10);

  const handleCopy = () => {
    if (selectedText) {
      navigator.clipboard.writeText(selectedText).then(() => {
        setCopied(true);
        setTimeout(() => {
          onClose();
        }, 500);
      });
    }
  };

  const handleColorClick = (colorId) => {
    onHighlight(colorId, '');
    onClose();
  };

  const handleSaveComment = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    onHighlight(selectedColor, commentText.trim());
    onClose();
  };

  return (
    <div
      ref={menuRef}
      style={{ left: `${posX}px`, top: `${posY}px` }}
      className="fixed z-50 w-60 bg-neutral-900/95 backdrop-blur-xl border border-neutral-750 rounded-xl shadow-2xl p-2 text-xs text-neutral-200 select-none animate-in fade-in zoom-in-95 duration-100"
      onClick={(e) => e.stopPropagation()}
    >
      {!showCommentInput ? (
        <div className="space-y-2">
          {/* Quick Color Swatches */}
          <div className="px-1 pt-1 flex items-center justify-between">
            <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
              {t('highlight')}
            </span>
            <div className="flex items-center gap-1.5">
              {COLORS.map((c) => (
                <button
                  key={c.id}
                  onClick={() => handleColorClick(c.id)}
                  className={`w-5 h-5 rounded-full ${c.bg} hover:scale-115 transition-transform shadow-xs cursor-pointer border border-white/20`}
                  title={c.id}
                />
              ))}
            </div>
          </div>

          <div className="border-t border-neutral-800/80 my-1" />

          {/* Add Comment Button */}
          <button
            onClick={() => setShowCommentInput(true)}
            className="w-full px-2.5 py-1.5 rounded-lg flex items-center gap-2 hover:bg-neutral-800 text-neutral-200 hover:text-white transition text-left cursor-pointer"
          >
            <MessageSquare className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{t('addComment')}</span>
          </button>

          {/* Copy Text Button */}
          <button
            onClick={handleCopy}
            className="w-full px-2.5 py-1.5 rounded-lg flex items-center gap-2 hover:bg-neutral-800 text-neutral-200 hover:text-white transition text-left cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-emerald-300 font-medium">{t('pathCopied')}</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-neutral-400 shrink-0" />
                <span>{t('copyFilePath')}</span>
              </>
            )}
          </button>
        </div>
      ) : (
        /* Comment Input Form */
        <form onSubmit={handleSaveComment} className="space-y-2 p-1">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
              <span>{t('addComment')}</span>
            </span>
            <div className="flex items-center gap-1">
              {COLORS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedColor(c.id)}
                  className={`w-4 h-4 rounded-full ${c.bg} transition-all cursor-pointer ${
                    selectedColor === c.id ? 'ring-2 ring-white scale-110' : 'opacity-60 hover:opacity-100'
                  }`}
                />
              ))}
            </div>
          </div>

          <textarea
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            onKeyDown={(e) => {
              if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                handleSaveComment(e);
              }
            }}
            placeholder={t('addCommentPlaceholder')}
            rows={3}
            className="w-full p-2 text-xs bg-neutral-950 border border-neutral-750 rounded-lg text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-amber-500"
            autoFocus
          />

          <div className="flex items-center justify-end gap-1.5 pt-1">
            <button
              type="button"
              onClick={() => setShowCommentInput(false)}
              className="px-2.5 py-1 text-xs rounded bg-neutral-800 hover:bg-neutral-750 text-neutral-400 hover:text-neutral-200 cursor-pointer"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              className="px-3 py-1 text-xs font-semibold rounded bg-amber-500 hover:bg-amber-400 text-neutral-950 flex items-center gap-1 cursor-pointer"
              title={`${t('saveComment')} (Ctrl+Enter)`}
            >
              <Check className="w-3 h-3" />
              <span>{t('saveComment')}</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
