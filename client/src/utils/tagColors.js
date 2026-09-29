export const TAG_COLORS = {
  amber: {
    label: 'Amber',
    badge: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    dot: 'bg-amber-400',
    dotRing: 'ring-amber-400/30',
    bg: 'bg-amber-500',
    text: 'text-amber-400',
    hoverBg: 'hover:bg-amber-500/25',
    activeBg: 'bg-amber-500/20 border-amber-500/50 text-amber-200'
  },
  emerald: {
    label: 'Emerald',
    badge: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    dot: 'bg-emerald-400',
    dotRing: 'ring-emerald-400/30',
    bg: 'bg-emerald-500',
    text: 'text-emerald-400',
    hoverBg: 'hover:bg-emerald-500/25',
    activeBg: 'bg-emerald-500/20 border-emerald-500/50 text-emerald-200'
  },
  sky: {
    label: 'Sky',
    badge: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
    dot: 'bg-sky-400',
    dotRing: 'ring-sky-400/30',
    bg: 'bg-sky-500',
    text: 'text-sky-400',
    hoverBg: 'hover:bg-sky-500/25',
    activeBg: 'bg-sky-500/20 border-sky-500/50 text-sky-200'
  },
  purple: {
    label: 'Purple',
    badge: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
    dot: 'bg-purple-400',
    dotRing: 'ring-purple-400/30',
    bg: 'bg-purple-500',
    text: 'text-purple-400',
    hoverBg: 'hover:bg-purple-500/25',
    activeBg: 'bg-purple-500/20 border-purple-500/50 text-purple-200'
  },
  rose: {
    label: 'Rose',
    badge: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
    dot: 'bg-rose-400',
    dotRing: 'ring-rose-400/30',
    bg: 'bg-rose-500',
    text: 'text-rose-400',
    hoverBg: 'hover:bg-rose-500/25',
    activeBg: 'bg-rose-500/20 border-rose-500/50 text-rose-200'
  },
  indigo: {
    label: 'Indigo',
    badge: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
    dot: 'bg-indigo-400',
    dotRing: 'ring-indigo-400/30',
    bg: 'bg-indigo-500',
    text: 'text-indigo-400',
    hoverBg: 'hover:bg-indigo-500/25',
    activeBg: 'bg-indigo-500/20 border-indigo-500/50 text-indigo-200'
  },
  orange: {
    label: 'Orange',
    badge: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
    dot: 'bg-orange-400',
    dotRing: 'ring-orange-400/30',
    bg: 'bg-orange-500',
    text: 'text-orange-400',
    hoverBg: 'hover:bg-orange-500/25',
    activeBg: 'bg-orange-500/20 border-orange-500/50 text-orange-200'
  },
  slate: {
    label: 'Slate',
    badge: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
    dot: 'bg-slate-400',
    dotRing: 'ring-slate-400/30',
    bg: 'bg-slate-500',
    text: 'text-slate-400',
    hoverBg: 'hover:bg-slate-500/25',
    activeBg: 'bg-slate-500/20 border-slate-500/50 text-slate-200'
  }
};

export const COLOR_OPTIONS = Object.keys(TAG_COLORS);

export function getTagColorConfig(colorName) {
  return TAG_COLORS[colorName] || TAG_COLORS.amber;
}

export function getTagCovers(tag, books = []) {
  if (books && books.length > 0) {
    const matching = books.filter(b => b.tags && b.tags.some(t => t.id === tag.id));
    return matching.slice(0, 4).map(b => b.cover_url);
  }
  return [];
}
