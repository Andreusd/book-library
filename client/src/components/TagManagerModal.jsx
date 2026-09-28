import React, { useState, useEffect } from 'react';
import { 
  X, Tag, Plus, Check, Trash2, Edit2, Bookmark, Folder
} from 'lucide-react';
import { useI18n } from '../i18n';
import { COLOR_OPTIONS, getTagColorConfig } from '../utils/tagColors';

export default function TagManagerModal({ 
  isOpen, 
  onClose, 
  book = null, 
  tags = [], 
  onTagsUpdated, 
  onBookTagsUpdated 
}) {
  const { t } = useI18n();
  const [newTagName, setNewTagName] = useState('');
  const [selectedColor, setSelectedColor] = useState('amber');
  const [editingTagId, setEditingTagId] = useState(null);
  const [editTagName, setEditTagName] = useState('');
  const [editTagColor, setEditTagColor] = useState('amber');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Set of tag IDs assigned to current book
  const [assignedTagIds, setAssignedTagIds] = useState(() => {
    if (!book || !book.tags) return new Set();
    return new Set(book.tags.map(t => t.id));
  });

  useEffect(() => {
    if (book && book.tags) {
      setAssignedTagIds(new Set(book.tags.map(t => t.id)));
    } else {
      setAssignedTagIds(new Set());
    }
    setNewTagName('');
    setError('');
    setEditingTagId(null);
  }, [book, isOpen]);

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Toggle tag for book
  const handleToggleTag = async (tagId) => {
    if (!book) return;
    const nextAssigned = new Set(assignedTagIds);
    const willAssign = !nextAssigned.has(tagId);
    if (willAssign) {
      nextAssigned.add(tagId);
    } else {
      nextAssigned.delete(tagId);
    }
    setAssignedTagIds(nextAssigned);

    try {
      const res = await fetch(`/api/books/${encodeURIComponent(book.id)}/tags/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tag_id: tagId })
      });
      const data = await res.json();
      if (data.status === 'ok') {
        if (onBookTagsUpdated) {
          onBookTagsUpdated(book.id, data.tags);
        }
        if (onTagsUpdated) {
          onTagsUpdated();
        }
      }
    } catch (err) {
      console.error('Failed to toggle tag:', err);
      // Revert on error
      setAssignedTagIds(new Set(assignedTagIds));
    }
  };

  // Create new tag
  const handleCreateTag = async (e) => {
    e.preventDefault();
    const clean = newTagName.trim();
    if (!clean) return;

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: clean, color: selectedColor })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Failed to create tag');
      }

      setNewTagName('');
      if (onTagsUpdated) {
        onTagsUpdated();
      }

      // If in book mode, also assign this newly created tag to book
      if (book && data.tag) {
        await handleToggleTag(data.tag.id);
      }
    } catch (err) {
      setError(err.message || 'Error creating tag');
    } finally {
      setLoading(false);
    }
  };

  // Delete tag
  const handleDeleteTag = async (tagId, tagName) => {
    if (!window.confirm(t('deleteTagConfirm', { name: tagName }))) return;

    try {
      const res = await fetch(`/api/tags/${encodeURIComponent(tagId)}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        if (onTagsUpdated) onTagsUpdated();
        setAssignedTagIds(prev => {
          const next = new Set(prev);
          next.delete(tagId);
          return next;
        });
      }
    } catch (err) {
      console.error('Failed to delete tag:', err);
    }
  };

  // Start editing tag
  const startEditTag = (tag) => {
    setEditingTagId(tag.id);
    setEditTagName(tag.name);
    setEditTagColor(tag.color || 'amber');
  };

  // Save edit tag
  const handleSaveEditTag = async (tagId) => {
    const clean = editTagName.trim();
    if (!clean) return;

    try {
      const res = await fetch(`/api/tags/${encodeURIComponent(tagId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: clean, color: editTagColor })
      });
      if (res.ok) {
        setEditingTagId(null);
        if (onTagsUpdated) onTagsUpdated();
      }
    } catch (err) {
      console.error('Failed to update tag:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div 
        className="w-full max-w-lg bg-neutral-900 border border-neutral-750 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-800 flex items-center justify-between bg-neutral-900/60">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <Tag className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-neutral-100 truncate">
                {book ? t('manageBookTags') : t('manageTags')}
              </h2>
              <p className="text-xs text-neutral-400 truncate">
                {book ? book.title : t('manageTagsSubtitle')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800 transition cursor-pointer"
            title={t('cancel')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Create New Tag Form */}
          <form onSubmit={handleCreateTag} className="bg-neutral-950/60 border border-neutral-800/80 rounded-xl p-3.5 space-y-3">
            <div className="text-xs font-semibold text-neutral-300 flex items-center justify-between">
              <span>{t('createNewTag')}</span>
              {error && <span className="text-rose-400 text-[11px]">{error}</span>}
            </div>
            
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                placeholder={t('tagNamePlaceholder')}
                className="flex-1 px-3 py-2 text-xs bg-neutral-900 border border-neutral-750 rounded-lg text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/40"
              />
              <button
                type="submit"
                disabled={loading || !newTagName.trim()}
                className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-neutral-950 text-xs font-bold rounded-lg transition inline-flex items-center gap-1.5 shrink-0 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{t('addTag')}</span>
              </button>
            </div>

            {/* Color Palette Selector */}
            <div className="flex items-center gap-2 pt-1">
              <span className="text-[11px] text-neutral-400 mr-1">{t('tagColor')}:</span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {COLOR_OPTIONS.map((c) => {
                  const cfg = getTagColorConfig(c);
                  const isSelected = selectedColor === c;
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setSelectedColor(c)}
                      className={`w-5 h-5 rounded-full ${cfg.bg} transition-all cursor-pointer flex items-center justify-center ${
                        isSelected ? 'ring-2 ring-white ring-offset-2 ring-offset-neutral-900 scale-110' : 'opacity-70 hover:opacity-100'
                      }`}
                      title={cfg.label}
                    >
                      {isSelected && <Check className="w-2.5 h-2.5 text-neutral-950 stroke-[3]" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </form>

          {/* Tags List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-neutral-400 px-1">
              <span>{t('availableTags')} ({tags.length})</span>
              {book && <span className="text-[11px] text-neutral-500">{t('clickToAssign')}</span>}
            </div>

            {tags.length === 0 ? (
              <div className="py-8 text-center text-xs text-neutral-500 bg-neutral-950/40 border border-neutral-850 rounded-xl">
                {t('noTagsCreated')}
              </div>
            ) : (
              <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                {tags.map((tag) => {
                  const isAssigned = assignedTagIds.has(tag.id);
                  const isEditing = editingTagId === tag.id;
                  const cfg = getTagColorConfig(tag.color);

                  if (isEditing) {
                    return (
                      <div 
                        key={tag.id}
                        className="p-2.5 rounded-xl bg-neutral-950 border border-amber-500/40 space-y-2"
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={editTagName}
                            onChange={(e) => setEditTagName(e.target.value)}
                            className="flex-1 px-2.5 py-1 text-xs bg-neutral-900 border border-neutral-700 rounded text-neutral-100 focus:outline-none focus:border-amber-500"
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveEditTag(tag.id)}
                            className="px-2.5 py-1 text-xs bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold rounded transition cursor-pointer"
                          >
                            {t('saveComment')}
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingTagId(null)}
                            className="px-2 py-1 text-xs text-neutral-400 hover:text-neutral-200 transition cursor-pointer"
                          >
                            {t('cancel')}
                          </button>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {COLOR_OPTIONS.map((c) => {
                            const cCfg = getTagColorConfig(c);
                            const isSel = editTagColor === c;
                            return (
                              <button
                                key={c}
                                type="button"
                                onClick={() => setEditTagColor(c)}
                                className={`w-4 h-4 rounded-full ${cCfg.bg} transition-all cursor-pointer flex items-center justify-center ${
                                  isSel ? 'ring-2 ring-white ring-offset-1 ring-offset-neutral-900 scale-110' : 'opacity-70 hover:opacity-100'
                                }`}
                              />
                            );
                          })}
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={tag.id}
                      onClick={() => {
                        if (book) handleToggleTag(tag.id);
                      }}
                      className={`
                        w-full flex items-center justify-between px-3 py-2.5 rounded-xl border text-xs transition cursor-pointer group
                        ${book
                          ? isAssigned
                            ? 'bg-amber-500/10 border-amber-500/40 text-neutral-100'
                            : 'bg-neutral-950/40 border-neutral-800/80 text-neutral-300 hover:bg-neutral-800/60 hover:text-neutral-100'
                          : 'bg-neutral-950/40 border-neutral-800/80 text-neutral-300 hover:bg-neutral-800/60'
                        }
                      `}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {book && (
                          <div className={`
                            w-4 h-4 rounded flex items-center justify-center border transition-colors shrink-0
                            ${isAssigned ? 'bg-amber-500 border-amber-400 text-neutral-950' : 'border-neutral-700 bg-neutral-900 group-hover:border-neutral-500'}
                          `}>
                            {isAssigned && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                        )}
                        <span className={`w-2.5 h-2.5 rounded-full ${cfg.dot} shrink-0`} />
                        <span className="font-medium truncate">{tag.name}</span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 ml-2" onClick={(e) => e.stopPropagation()}>
                        <span className={`
                          text-[10px] px-2 py-0.5 rounded-full font-mono
                          ${cfg.badge}
                        `}>
                          {tag.book_count || 0} {tag.book_count === 1 ? t('bookCountOne') : t('bookCountMany')}
                        </span>

                        {/* Edit & Delete Action Buttons */}
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => startEditTag(tag)}
                            className="p-1 rounded text-neutral-400 hover:text-amber-400 hover:bg-neutral-800 transition"
                            title={t('editComment')}
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteTag(tag.id, tag.name)}
                            className="p-1 rounded text-neutral-400 hover:text-rose-400 hover:bg-neutral-800 transition"
                            title={t('deleteComment')}
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-neutral-800 flex justify-end bg-neutral-900/60">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold rounded-xl transition cursor-pointer"
          >
            {t('closeButton')}
          </button>
        </div>
      </div>
    </div>
  );
}
