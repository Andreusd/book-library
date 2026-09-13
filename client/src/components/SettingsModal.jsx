import React, { useState, useEffect, useRef } from 'react';
import { 
  Settings, Folder, CheckCircle, AlertCircle, AlertTriangle, 
  X, RefreshCw, Save, ShieldCheck 
} from 'lucide-react';
import { useI18n } from '../i18n';

export default function SettingsModal({ isOpen, onClose, onSaved }) {
  const { t } = useI18n();
  const [pathInput, setPathInput] = useState('');
  const [initialPath, setInitialPath] = useState('');
  const [validation, setValidation] = useState(null);
  const [validating, setValidating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const debounceRef = useRef(null);

  // Fetch current settings on open
  useEffect(() => {
    if (isOpen) {
      setSavedSuccess(false);
      fetch('/api/settings')
        .then(res => res.json())
        .then(data => {
          const current = data.library_path || '';
          setPathInput(current);
          setInitialPath(current);
          setValidation(data.validation || null);
        })
        .catch(err => console.error('Failed to load settings:', err));
    }
  }, [isOpen]);

  // Live validation debounced as user types
  const handlePathChange = (value) => {
    setPathInput(value);
    setSavedSuccess(false);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (!value.trim()) {
      setValidation(null);
      setValidating(false);
      return;
    }

    setValidating(true);
    debounceRef.current = setTimeout(() => {
      fetch('/api/settings/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: value.trim() })
      })
      .then(res => res.json())
      .then(data => {
        setValidation(data);
        setValidating(false);
      })
      .catch(err => {
        console.error('Validation failed:', err);
        setValidating(false);
      });
    }, 400);
  };

  const handleSave = (e) => {
    e.preventDefault();
    setSaving(true);

    fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ library_path: pathInput.trim() })
    })
    .then(res => res.json())
    .then(data => {
      setSaving(false);
      if (data.status === 'ok') {
        setSavedSuccess(true);
        if (onSaved) onSaved();
        setTimeout(() => {
          onClose();
        }, 800);
      }
    })
    .catch(err => {
      console.error('Failed to save settings:', err);
      setSaving(false);
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div 
        className="w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-800 flex items-center justify-between bg-neutral-925">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-neutral-100">{t('settingsTitle')}</h3>
              <p className="text-[11px] text-neutral-400">{t('libraryPathHelp')}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSave} className="p-6 space-y-5">
          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1.5 flex items-center gap-1.5">
              <Folder className="w-3.5 h-3.5 text-amber-400" />
              <span>{t('libraryPathLabel')}</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={pathInput}
                onChange={(e) => handlePathChange(e.target.value)}
                placeholder={t('libraryPathPlaceholder')}
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-neutral-950 border border-neutral-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50 rounded-xl text-neutral-100 placeholder-neutral-500 font-mono transition"
                autoFocus
              />
              {validating && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <RefreshCw className="w-4 h-4 text-neutral-500 animate-spin" />
                </div>
              )}
            </div>
          </div>

          {/* Validation Feedback Card */}
          {validation && (
            <div className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 transition-all ${
              validation.valid && validation.book_count > 0
                ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-300'
                : validation.exists && validation.book_count === 0
                ? 'bg-amber-950/20 border-amber-500/40 text-amber-300'
                : 'bg-rose-950/20 border-rose-500/40 text-rose-300'
            }`}>
              {validation.valid && validation.book_count > 0 ? (
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : validation.exists && validation.book_count === 0 ? (
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              )}
              <div className="min-w-0">
                <p className="font-medium leading-relaxed">
                  {validation.valid && validation.book_count > 0
                    ? t('validFolder', { books: validation.book_count, shelves: validation.shelf_count })
                    : validation.error === 'no_pdfs_found'
                    ? t('noPdfsFound')
                    : validation.error === 'not_a_directory'
                    ? t('notADirectory')
                    : t('pathNotFound')}
                </p>
                {validation.normalized_path && (
                  <p className="text-[10px] opacity-75 font-mono truncate mt-1">
                    {validation.normalized_path}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Safety Notice */}
          <div className="p-3 bg-neutral-950/60 border border-neutral-850 rounded-xl flex items-center gap-2.5 text-[11px] text-neutral-400">
            <ShieldCheck className="w-4 h-4 text-sky-400 shrink-0" />
            <span>{t('librarySafe')}</span>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-neutral-800/80">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 rounded-lg transition"
            >
              {t('cancel')}
            </button>

            <button
              type="submit"
              disabled={saving || (validation && !validation.valid && pathInput.trim().length > 0)}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-neutral-950 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition shadow-lg shadow-amber-500/10"
            >
              {saving ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              <span>{savedSuccess ? t('settingsSaved') : t('saveSettings')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
