import React, { useState, useEffect, useRef } from 'react';
import { FolderEdit, X, Check, RotateCcw, AlertCircle } from 'lucide-react';
import { useI18n } from '../i18n';

export default function ShelfRenameModal({ shelf, isOpen, onClose, onSave }) {
  const [name, setName] = useState('');
  const inputRef = useRef(null);
  const { t } = useI18n();

  useEffect(() => {
    if (shelf && isOpen) {
      setName(shelf.name || '');
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
    }
  }, [shelf, isOpen]);

  if (!isOpen || !shelf) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (name.trim()) {
      onSave(shelf.id, name.trim());
    }
  };

  const handleReset = () => {
    setName(shelf.original_name);
    onSave(shelf.id, '');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div 
        className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl p-5 shadow-2xl animate-in zoom-in-95 duration-150 text-left"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/15 text-amber-400">
              <FolderEdit className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-neutral-100">{t('renameModalTitle')}</h3>
              <p className="text-[11px] text-neutral-400">
                {t('realFolderPrefix')}<span className="font-mono text-neutral-300">{shelf.folder}</span>
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Informative Note */}
        <div className="my-3.5 p-2.5 rounded-xl bg-neutral-850/70 border border-neutral-800 flex items-start gap-2 text-xs text-neutral-400">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <span>{t('renameDisclaimer')}</span>
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-1.5">
              {t('shelfNameLabel')}
            </label>
            <input
              ref={inputRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('renamePlaceholder')}
              className="w-full px-3.5 py-2 text-sm bg-neutral-950 border border-neutral-750 rounded-xl text-neutral-100 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50 transition"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-2">
            {shelf.custom_name ? (
              <button
                type="button"
                onClick={handleReset}
                className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-amber-400 transition"
                title={t('restoreOriginal')}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{t('restoreOriginal')}</span>
              </button>
            ) : <div />}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 text-xs font-medium text-neutral-300 hover:bg-neutral-800 rounded-xl transition"
              >
                {t('cancel')}
              </button>
              <button
                type="submit"
                disabled={!name.trim()}
                className="px-4 py-1.5 text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-neutral-950 rounded-xl transition flex items-center gap-1.5 shadow-lg shadow-amber-500/10 disabled:opacity-50"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{t('saveName')}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
