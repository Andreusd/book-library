import React from 'react';
import { BookOpen, Tag } from 'lucide-react';
import { useI18n } from '../i18n';
import { getTagColorConfig, getTagCovers } from '../utils/tagColors';

export default function TagCard({
  tag,
  covers,
  books = [],
  onSelectTag,
  className = ''
}) {
  const { t } = useI18n();
  const cfg = getTagColorConfig(tag.color);
  const tagCovers = covers !== undefined ? covers : getTagCovers(tag, books);

  return (
    <div
      onClick={() => onSelectTag && onSelectTag(tag)}
      className={`group relative cursor-pointer bg-neutral-900/60 hover:bg-neutral-800/90 border border-neutral-800 hover:border-indigo-500/40 rounded-xl sm:rounded-2xl p-2.5 sm:p-3 flex flex-col items-center justify-between transition-all duration-300 shadow-sm hover:shadow-xl hover:-translate-y-1 select-none isolate ${className}`}
    >
      {/* Thumbnail Stack Container */}
      <div className="relative w-full h-32 sm:h-36 flex items-center justify-center my-0.5 isolate">
        {tagCovers.length === 0 ? (
          /* Empty state placeholder */
          <div className="w-15 sm:w-16 aspect-[1/1.45] rounded-md bg-neutral-800/40 border border-neutral-700/40 flex flex-col items-center justify-center text-neutral-500 gap-1 shadow-inner">
            <Tag className={`w-5 h-5 ${cfg.text}`} />
            <span className="text-[10px] text-neutral-600 font-medium">Empty</span>
          </div>
        ) : tagCovers.length === 1 ? (
          /* Single book cover */
          <div className="relative w-16 sm:w-18 aspect-[1/1.45] rounded-md overflow-hidden shadow-lg border border-neutral-700/70 group-hover:border-indigo-500/50 group-hover:scale-105 transition-all duration-300 bg-neutral-950">
            <div className="absolute inset-0 flex items-center justify-center bg-neutral-900 text-neutral-600">
              <BookOpen className="w-5 h-5 opacity-30" />
            </div>
            <img
              src={tagCovers[0]}
              alt=""
              loading="lazy"
              className="relative z-10 w-full h-full object-cover"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
          </div>
        ) : tagCovers.length === 2 ? (
          /* 2 Books Stack */
          <>
            {/* Back Cover */}
            <div className="absolute w-15 sm:w-17 aspect-[1/1.45] rounded-md overflow-hidden shadow-md border border-neutral-700/60 -rotate-8 -translate-x-3 -translate-y-1 opacity-70 group-hover:-rotate-12 group-hover:-translate-x-4 transition-all duration-300 bg-neutral-950 z-10">
              <div className="absolute inset-0 flex items-center justify-center bg-neutral-900 text-neutral-600">
                <BookOpen className="w-4 h-4 opacity-30" />
              </div>
              <img
                src={tagCovers[1]}
                alt=""
                loading="lazy"
                className="relative z-10 w-full h-full object-cover"
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
            </div>
            {/* Front Cover */}
            <div className="relative w-15 sm:w-17 aspect-[1/1.45] rounded-md overflow-hidden shadow-xl border border-neutral-600/80 rotate-2 translate-x-1 translate-y-1 group-hover:rotate-0 group-hover:scale-105 transition-all duration-300 bg-neutral-950 z-20">
              <div className="absolute inset-0 flex items-center justify-center bg-neutral-900 text-neutral-600">
                <BookOpen className="w-4 h-4 opacity-30" />
              </div>
              <img
                src={tagCovers[0]}
                alt=""
                loading="lazy"
                className="relative z-10 w-full h-full object-cover"
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
            </div>
          </>
        ) : (
          /* 3+ Books Stack (Fanned Deck) */
          <>
            {/* Back Left Cover */}
            <div className="absolute w-14 sm:w-16 aspect-[1/1.45] rounded-md overflow-hidden shadow-md border border-neutral-700/50 -rotate-12 -translate-x-4 -translate-y-1 opacity-60 group-hover:-rotate-16 group-hover:-translate-x-5 transition-all duration-300 bg-neutral-950 z-10">
              <div className="absolute inset-0 flex items-center justify-center bg-neutral-900 text-neutral-600">
                <BookOpen className="w-4 h-4 opacity-25" />
              </div>
              <img
                src={tagCovers[2]}
                alt=""
                loading="lazy"
                className="relative z-10 w-full h-full object-cover"
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
            </div>
            {/* Middle Right Cover */}
            <div className="absolute w-14 sm:w-16 aspect-[1/1.45] rounded-md overflow-hidden shadow-lg border border-neutral-700/70 rotate-8 translate-x-3.5 -translate-y-0.5 opacity-80 group-hover:rotate-12 group-hover:translate-x-5 transition-all duration-300 bg-neutral-950 z-20">
              <div className="absolute inset-0 flex items-center justify-center bg-neutral-900 text-neutral-600">
                <BookOpen className="w-4 h-4 opacity-25" />
              </div>
              <img
                src={tagCovers[1]}
                alt=""
                loading="lazy"
                className="relative z-10 w-full h-full object-cover"
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
            </div>
            {/* Front Center Cover */}
            <div className="relative w-14 sm:w-16 aspect-[1/1.45] rounded-md overflow-hidden shadow-2xl border border-neutral-600/90 rotate-0 translate-x-0 translate-y-1 group-hover:scale-105 group-hover:translate-y-0 transition-all duration-300 bg-neutral-950 z-30">
              <div className="absolute inset-0 flex items-center justify-center bg-neutral-900 text-neutral-600">
                <BookOpen className="w-4 h-4 opacity-30" />
              </div>
              <img
                src={tagCovers[0]}
                alt=""
                loading="lazy"
                className="relative z-10 w-full h-full object-cover"
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
            </div>
          </>
        )}
      </div>

      {/* Tag Details */}
      <div className="w-full text-center mt-1.5 pt-1.5 border-t border-neutral-800/60">
        <div className="flex items-center justify-center min-h-[2.25rem] mb-0.5 px-1">
          <h3 
            className="text-xs font-semibold text-neutral-200 group-hover:text-indigo-400 transition-colors line-clamp-2 leading-snug break-words text-center flex items-center justify-center gap-1.5"
            title={tag.name}
          >
            <span className={`w-2.5 h-2.5 rounded-full ${cfg.dot} shrink-0`} />
            <span className="truncate">{tag.name}</span>
          </h3>
        </div>
        <span className="inline-block text-[11px] text-neutral-400 font-medium">
          {tag.book_count === 1
            ? (t('booksTaggedCount_one') || '1 book')
            : t('booksTaggedCount', { count: tag.book_count || 0 })}
        </span>
      </div>
    </div>
  );
}
