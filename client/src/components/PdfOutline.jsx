import React, { useState, useMemo } from 'react';
import { 
  ListTree, ChevronRight, ChevronDown, ChevronsDownUp, ChevronsUpDown,
  Search, X, ExternalLink, Bookmark 
} from 'lucide-react';
import { useI18n } from '../i18n';

function OutlineNode({ 
  item, 
  depth = 0, 
  onItemClick, 
  expandedMap, 
  toggleExpand, 
  activeChapter 
}) {
  const hasChildren = item.items && item.items.length > 0;
  const isExpanded = expandedMap[item._id] ?? (depth === 0);
  const isActive = activeChapter && (
    (item.title && item.title.trim().toLowerCase() === activeChapter.trim().toLowerCase()) ||
    (item.label && item.label.trim().toLowerCase() === activeChapter.trim().toLowerCase())
  );

  const handleClick = (e) => {
    e.stopPropagation();
    if (onItemClick) {
      onItemClick(item);
    }
  };

  const handleToggle = (e) => {
    e.stopPropagation();
    toggleExpand(item._id, isExpanded);
  };

  return (
    <div className="select-none text-xs">
      <div 
        onClick={handleClick}
        className={`
          group flex items-center gap-1.5 py-1.5 px-2 rounded-lg cursor-pointer transition-colors
          ${isActive 
            ? 'bg-amber-500/15 text-amber-300 font-medium' 
            : 'hover:bg-neutral-800 text-neutral-300 hover:text-white'
          }
        `}
        style={{ paddingLeft: `${Math.max(8, depth * 14 + 8)}px` }}
        title={item.title}
      >
        {/* Expand/Collapse Chevron */}
        {hasChildren ? (
          <button
            type="button"
            onClick={handleToggle}
            className="p-0.5 rounded hover:bg-neutral-700 text-neutral-400 hover:text-neutral-200 transition shrink-0 cursor-pointer"
            title={isExpanded ? 'Collapse' : 'Expand'}
            aria-label={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? (
              <ChevronDown className="w-3.5 h-3.5 text-neutral-400 group-hover:text-amber-400 transition-colors" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-neutral-400 group-hover:text-amber-400 transition-colors" />
            )}
          </button>
        ) : (
          <span className="w-4 shrink-0 flex items-center justify-center">
            <span className={`w-1 h-1 rounded-full transition-colors ${
              isActive ? 'bg-amber-400' : 'bg-neutral-600 group-hover:bg-amber-400'
            }`} />
          </span>
        )}

        {/* Title */}
        <span className={`truncate flex-1 font-normal transition-colors ${
          isActive ? 'text-amber-300 font-medium' : 'group-hover:text-amber-300'
        }`}>
          {item.title || 'Untitled Chapter'}
        </span>

        {/* External Link icon if item links out */}
        {item.url && (
          <ExternalLink className="w-3 h-3 text-neutral-500 group-hover:text-neutral-300 shrink-0 ml-1" />
        )}
      </div>

      {/* Children Tree */}
      {hasChildren && isExpanded && (
        <div className="border-l border-neutral-800/80 ml-3">
          {item.items.map((child) => (
            <OutlineNode
              key={child._id}
              item={child}
              depth={depth + 1}
              onItemClick={onItemClick}
              expandedMap={expandedMap}
              toggleExpand={toggleExpand}
              activeChapter={activeChapter}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function PdfOutline({ 
  outline,
  items,
  toc,
  isOpen, 
  onClose, 
  onItemClick,
  activeChapter,
  totalChapters,
  percentage,
  footer
}) {
  const { t } = useI18n();
  const [filterQuery, setFilterQuery] = useState('');
  const [expandedMap, setExpandedMap] = useState({});

  // Assign deterministic unique keys and normalize tree items
  const indexedOutline = useMemo(() => {
    let counter = 0;
    const rawNodes = outline || items || toc || [];
    const assignIds = (nodes, prefix = 'n') => {
      if (!Array.isArray(nodes)) return [];
      return nodes.map((node, i) => {
        const id = `${prefix}_${i}_${counter++}`;
        const rawChildren = node.items || node.subitems || [];
        const rawTitle = node.title || node.label || 'Untitled Chapter';
        return {
          ...node,
          _id: id,
          title: typeof rawTitle === 'string' ? rawTitle.trim() : (rawTitle ? String(rawTitle).trim() : 'Untitled Chapter'),
          items: assignIds(rawChildren, id)
        };
      });
    };
    return assignIds(rawNodes);
  }, [outline, items, toc]);

  // Check if there are any expandable nodes in the entire tree
  const hasExpandableItems = useMemo(() => {
    const checkNodes = (nodes) => {
      for (const node of nodes) {
        if (node.items && node.items.length > 0) return true;
        if (node.items && checkNodes(node.items)) return true;
      }
      return false;
    };
    return checkNodes(indexedOutline);
  }, [indexedOutline]);

  // Collapse all expandable nodes
  const collapseAll = () => {
    const newExpanded = {};
    const markAllCollapsed = (nodes) => {
      for (const node of nodes) {
        if (node.items && node.items.length > 0) {
          newExpanded[node._id] = false;
          markAllCollapsed(node.items);
        }
      }
    };
    markAllCollapsed(indexedOutline);
    setExpandedMap(newExpanded);
  };

  // Expand all expandable nodes
  const expandAll = () => {
    const newExpanded = {};
    const markAllExpanded = (nodes) => {
      for (const node of nodes) {
        if (node.items && node.items.length > 0) {
          newExpanded[node._id] = true;
          markAllExpanded(node.items);
        }
      }
    };
    markAllExpanded(indexedOutline);
    setExpandedMap(newExpanded);
  };

  // Filter tree items if user enters a search query
  const filteredOutline = useMemo(() => {
    const q = filterQuery.trim().toLowerCase();
    if (!q) return indexedOutline;

    const filterNode = (node) => {
      const matchesSelf = (node.title || '').toLowerCase().includes(q);
      const filteredChildren = (node.items || []).map(filterNode).filter(Boolean);

      if (matchesSelf || filteredChildren.length > 0) {
        return {
          ...node,
          items: filteredChildren
        };
      }
      return null;
    };

    return indexedOutline.map(filterNode).filter(Boolean);
  }, [indexedOutline, filterQuery]);

  // When search query is active, auto-expand matching nodes
  const effectiveExpandedMap = useMemo(() => {
    if (!filterQuery.trim()) return expandedMap;

    const autoExpanded = {};
    const markAncestorsExpanded = (nodes) => {
      for (const node of nodes) {
        if (node.items && node.items.length > 0) {
          autoExpanded[node._id] = true;
          markAncestorsExpanded(node.items);
        }
      }
    };
    markAncestorsExpanded(filteredOutline);
    return autoExpanded;
  }, [filterQuery, filteredOutline, expandedMap]);

  const toggleExpand = (id, currentlyExpanded) => {
    setExpandedMap(prev => ({
      ...prev,
      [id]: !currentlyExpanded
    }));
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop - NO blur, completely transparent click-catcher so background stays unblurred and bright */}
      <div 
        onClick={onClose}
        className="fixed inset-0 z-30 bg-transparent"
      />

      {/* Slide-out Sidebar Drawer - floating overlay on top of the book */}
      <aside className={`
        fixed top-14 bottom-0 left-0 z-40 w-72 sm:w-80 bg-neutral-900 border-r border-neutral-800 flex flex-col shadow-2xl shadow-black/80 transition-all duration-300 ease-in-out animate-slide-in-left
      `}>
        {/* Drawer Header */}
        <div className="h-12 px-3 sm:px-4 border-b border-neutral-800 flex items-center justify-between shrink-0 bg-neutral-900/50">
          <div className="flex items-center gap-2 min-w-0">
            <ListTree className="w-4 h-4 text-amber-400 shrink-0" />
            <h2 className="text-xs font-bold text-neutral-100 uppercase tracking-wider truncate">
              {t('tableOfContents')}
            </h2>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {hasExpandableItems && (
              <>
                <button
                  type="button"
                  onClick={collapseAll}
                  className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition cursor-pointer"
                  title={t('collapseAll')}
                  aria-label={t('collapseAll')}
                >
                  <ChevronsDownUp className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={expandAll}
                  className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition cursor-pointer"
                  title={t('expandAll')}
                  aria-label={t('expandAll')}
                >
                  <ChevronsUpDown className="w-4 h-4" />
                </button>
              </>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition cursor-pointer"
              title={t('hideIndex')}
              aria-label={t('hideIndex')}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Chapter Search Filter */}
        <div className="p-2.5 border-b border-neutral-800 shrink-0">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
            <input
              type="text"
              placeholder={t('filterIndexPlaceholder')}
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              className="w-full pl-8 pr-8 py-1.5 text-xs bg-neutral-900 border border-neutral-800 rounded-lg text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-amber-500/50"
            />
            {filterQuery && (
              <button
                type="button"
                onClick={() => setFilterQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Outline Hierarchy List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5 custom-scrollbar">
          {filteredOutline.length > 0 ? (
            filteredOutline.map((item) => (
              <OutlineNode
                key={item._id}
                item={item}
                depth={0}
                onItemClick={onItemClick}
                expandedMap={effectiveExpandedMap}
                toggleExpand={toggleExpand}
                activeChapter={activeChapter}
              />
            ))
          ) : (
            <div className="text-center py-10 px-4 text-neutral-500 text-xs">
              <Bookmark className="w-6 h-6 mx-auto mb-2 opacity-30" />
              <p>{filterQuery ? t('noIndexItemsFound') : t('noIndexAvailable')}</p>
            </div>
          )}
        </div>

        {/* Optional Footer Summary (e.g. chapters count & reading percentage) */}
        {footer ? (
          <div className="p-3 border-t border-neutral-800/80 shrink-0 bg-neutral-900/30">
            {footer}
          </div>
        ) : (totalChapters !== undefined || percentage !== undefined) ? (
          <div className="h-9 px-4 border-t border-neutral-800/80 flex items-center justify-between text-[11px] text-neutral-400 font-mono shrink-0 bg-neutral-900/30">
            {totalChapters !== undefined && (
              <span>{totalChapters} {t('chaptersCount')}</span>
            )}
            {percentage !== undefined && (
              <span className="text-amber-400 font-semibold">{percentage}% {t('completed')}</span>
            )}
          </div>
        ) : null}
      </aside>
    </>
  );
}

export const TableOfContentsDrawer = PdfOutline;
