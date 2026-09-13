import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Palette, X, Check, Search, RotateCcw } from 'lucide-react';
import ShelfIcon, { AVAILABLE_SHELF_ICONS } from './ShelfIcon';
import { useI18n } from '../i18n';

export default function ShelfIconModal({ shelf, isOpen, onClose, onSave }) {
  const [selectedIcon, setSelectedIcon] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const searchInputRef = useRef(null);
  const { t, language } = useI18n();

  useEffect(() => {
    if (shelf && isOpen) {
      setSelectedIcon(shelf.icon || '');
      setSearchTerm('');
      setActiveCategory('all');
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [shelf, isOpen]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const categories = [
    { id: 'all', labelPt: 'Todos', labelEn: 'All' },
    { id: 'Dev', labelPt: 'Dev & Código', labelEn: 'Dev & Code' },
    { id: 'Architecture', labelPt: 'Arquitetura', labelEn: 'Architecture' },
    { id: 'System', labelPt: 'Sistemas', labelEn: 'Systems' },
    { id: 'Science', labelPt: 'Ciência & IA', labelEn: 'Science & AI' },
    { id: 'Math', labelPt: 'Matemática', labelEn: 'Math' },
    { id: 'Data', labelPt: 'Dados', labelEn: 'Data' },
    { id: 'General', labelPt: 'Geral', labelEn: 'General' },
  ];

  const filteredIcons = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    return AVAILABLE_SHELF_ICONS.filter((item) => {
      const matchCategory = activeCategory === 'all' || item.category === activeCategory;
      if (!matchCategory) return false;
      if (!q) return true;

      const matchName = item.name.toLowerCase().includes(q);
      const matchLabel = item.label.toLowerCase().includes(q) || item.labelEn.toLowerCase().includes(q);
      const matchTags = (item.tags || []).some((tag) => tag.toLowerCase().includes(q));
      return matchName || matchLabel || matchTags;
    });
  }, [searchTerm, activeCategory]);

  if (!isOpen || !shelf) return null;

  const handleSave = () => {
    onSave(shelf.id, selectedIcon);
    onClose();
  };

  const handleResetToFolder = () => {
    setSelectedIcon('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div 
        className="w-full max-w-2xl bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-left animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-925/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-neutral-100">
                {t('iconModalTitle')}
              </h3>
              <p className="text-xs text-neutral-400">
                {shelf.name} <span className="text-neutral-500 font-mono text-[11px]">({shelf.folder})</span>
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition"
            title={t('close')}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search & Categories Bar */}
        <div className="p-4 border-b border-neutral-800/80 bg-neutral-900/50 space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t('searchIconsPlaceholder')}
              className="w-full pl-10 pr-9 py-2 bg-neutral-950 border border-neutral-750 rounded-xl text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50 transition"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-[11px]">
            {categories.map((cat) => {
              const active = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-colors cursor-pointer ${
                    active
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'bg-neutral-850 text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200'
                  }`}
                >
                  {language === 'pt' ? cat.labelPt : cat.labelEn}
                </button>
              );
            })}
          </div>
        </div>

        {/* Icons Grid */}
        <div className="flex-1 overflow-y-auto p-5">
          {filteredIcons.length === 0 ? (
            <div className="py-12 text-center text-neutral-500 text-xs">
              {t('noBooksFound')}
            </div>
          ) : (
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3">
              {filteredIcons.map((item) => {
                const isSelected = selectedIcon === item.name || (!selectedIcon && item.name === 'Folder');
                return (
                  <button
                    key={item.name}
                    type="button"
                    onClick={() => setSelectedIcon(item.name === 'Folder' ? '' : item.name)}
                    className={`
                      group relative flex flex-col items-center justify-center p-3 rounded-xl border transition-all duration-150 cursor-pointer
                      ${isSelected
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-md ring-1 ring-amber-500/50'
                        : 'bg-neutral-925/70 border-neutral-800/80 text-neutral-400 hover:bg-neutral-800 hover:border-neutral-700 hover:text-neutral-100'}
                    `}
                    title={`${item.name} - ${language === 'pt' ? item.label : item.labelEn}`}
                  >
                    <ShelfIcon 
                      icon={item.name} 
                      className={`w-6 h-6 transition-transform group-hover:scale-110 ${
                        isSelected ? 'text-amber-400' : 'text-neutral-300'
                      }`} 
                    />
                    <span className="mt-1.5 text-[10px] truncate max-w-full text-center opacity-80 font-mono">
                      {item.name}
                    </span>
                    {isSelected && (
                      <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-400" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Live Preview & Footer */}
        <div className="px-6 py-3.5 border-t border-neutral-800 bg-neutral-925/90 flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Live Preview of the Shelf Button */}
          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <span className="text-[11px] text-neutral-400 font-medium shrink-0">
              {t('previewLabel')}:
            </span>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/15 text-amber-300 border border-amber-500/30 text-xs font-medium max-w-[220px] truncate">
              <ShelfIcon icon={selectedIcon} className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="truncate">{shelf.name}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            {selectedIcon && (
              <button
                type="button"
                onClick={handleResetToFolder}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-neutral-400 hover:text-neutral-200 transition cursor-pointer"
                title={t('restoreDefaultIcon')}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{t('restoreDefaultIcon')}</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs rounded-xl text-neutral-300 hover:bg-neutral-800 transition cursor-pointer"
            >
              {t('cancel')}
            </button>

            <button
              type="button"
              onClick={handleSave}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 shadow-md transition cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{t('saveIcon')}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
