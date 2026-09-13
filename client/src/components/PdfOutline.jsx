import React, { useState, useMemo } from 'react';
import { 
  ListTree, ChevronRight, ChevronDown, Search, 
  X, ExternalLink, Bookmark 
} from 'lucide-react';
import { useI18n } from '../i18n';

function OutlineNode({ 
  item, 
  depth = 0, 
  onItemClick, 
  expandedMap, 
  toggleExpand, 
  filterQuery 
}) {
  const hasChildren = item.items && item.items.length > 0;
  const isExpanded = expandedMap[item._id] ?? (depth === 0);

  const handleClick = (e) => {
    e.stopPropagation();
    onItemClick(item);
  };

  const handleToggle = (e) => {
    e.stopPropagation();
    toggleExpand(item._id);
  };

  return (
    <div className="select-none text-xs">
      <div 
        onClick={handleClick}
        className={`
          group flex items-center gap-1.5 py-1.5 px-2 rounded-lg cursor-pointer transition-colors
          hover:bg-neutral-800 text-neutral-300 hover:text-white
        `}
        style={{ paddingLeft: `${Math.max(8, depth * 14 + 8)}px` }}
        title={item.title}
      >
        {/* Expand/Collapse Chevron */}
        {hasChildren ? (
          <button
            type="button"
            onClick={handleToggle}
            className="p-0.5 rounded hover:bg-neutral-700 text-neutral-400 hover:text-neutral-200 transition shrink-0"
          >
            {isExpanded ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5" />
            )}
          </button>
        ) : (
          <span className="w-4 shrink-0 flex items-center justify-center">
            <span className="w-1 h-1 rounded-full bg-neutral-600 group-hover:bg-amber-400 transition-colors" />
          </span>
        )}

        {/* Title */}
        <span className="truncate flex-1 font-normal group-hover:text-amber-300 transition-colors">
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
              filterQuery={filterQuery}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function PdfOutline({ 
  outline, 
  isOpen, 
  onClose, 
  onItemClick 
}) {
  const { t } = useI18n();
  const [filterQuery, setFilterQuery] = useState('');
  const [expandedMap, setExpandedMap] = useState({});

  // Assign deterministic unique keys to tree items
  const indexedOutline = useMemo(() => {
    let counter = 0;
    const assignIds = (nodes, prefix = 'n') => {
      if (!Array.isArray(nodes)) return [];
      return nodes.map((node, i) => {
        const id = `${prefix}_${i}_${counter++}`;
        return {
          ...node,
          _id: id,
          items: node.items ? assignIds(node.items, id) : []
        };
      });
    };
    return assignIds(outline || []);
  }, [outline]);

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
    const expandAll = (nodes) => {
      for (const node of nodes) {
        autoExpanded[node._id] = true;
        if (node.items) expandAll(node.items);
      }
    };
    expandAll(filteredOutline);
    return autoExpanded;
  }, [filterQuery, filteredOutline, expandedMap]);

  const toggleExpand = (id) => {
    setExpandedMap(prev => ({
      ...prev,
      [id]: !(prev[id] ?? true)
    }));
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Mobile Backdrop */}
      <div 
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 md:hidden"
      />

      {/* Slide-out Sidebar Drawer */}
      <aside className={`
        fixed top-14 bottom-1 left-0 z-40 w-72 sm:w-80 bg-neutral-900 border-r border-neutral-800 flex flex-col shadow-2xl transition-all duration-300 ease-in-out
        md:static md:h-full md:z-10
      `}>
        {/* Drawer Header */}
        <div className="h-12 px-4 border-b border-neutral-800 flex items-center justify-between shrink-0 bg-neutral-900/50">
          <div className="flex items-center gap-2 min-w-0">
            <ListTree className="w-4 h-4 text-amber-400 shrink-0" />
            <h2 className="text-xs font-bold text-neutral-100 uppercase tracking-wider truncate">
              {t('tableOfContents')}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition"
            title={t('hideIndex')}
          >
            <X className="w-4 h-4" />
          </button>
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
                onClick={() => setFilterQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Outline Hierarchy List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {filteredOutline.length > 0 ? (
            filteredOutline.map((item) => (
              <OutlineNode
                key={item._id}
                item={item}
                depth={0}
                onItemClick={onItemClick}
                expandedMap={effectiveExpandedMap}
                toggleExpand={toggleExpand}
                filterQuery={filterQuery}
              />
            ))
          ) : (
            <div className="text-center py-10 px-4 text-neutral-500 text-xs">
              <Bookmark className="w-6 h-6 mx-auto mb-2 opacity-30" />
              <p>{filterQuery ? t('noIndexItemsFound') : t('noIndexAvailable')}</p>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
