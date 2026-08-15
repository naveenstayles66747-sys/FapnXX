import React, { useEffect, useRef } from 'react';
import { GroupedSuggestions, SearchSuggestion } from '../utils/searchEngine';

interface SearchSuggestionsProps {
  groupedSuggestions: GroupedSuggestions;
  query: string;
  onSelect: (text: string) => void;
  onClose: () => void;
  visible: boolean;
}

/**
 * Highlights matched part with clean theme color (matching exact reference style)
 */
function HighlightMatch({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <span>{text}</span>;
  const q = query.toLowerCase();
  const idx = text.toLowerCase().indexOf(q);
  if (idx === -1) {
    // If not direct substring, check first matching word
    const words = text.split(' ');
    return (
      <span>
        {words.map((w, i) => {
          const wLower = w.toLowerCase();
          const matchIdx = wLower.indexOf(q);
          if (matchIdx !== -1) {
            return (
              <span key={i}>
                {w.slice(0, matchIdx)}
                <span className="text-[#e0358d] dark:text-[#ec4899] font-black">{w.slice(matchIdx, matchIdx + q.length)}</span>
                {w.slice(matchIdx + q.length)}{' '}
              </span>
            );
          }
          return <span key={i}>{w} </span>;
        })}
      </span>
    );
  }

  return (
    <span>
      {text.slice(0, idx)}
      <span className="text-[#e0358d] dark:text-[#ec4899] font-black">{text.slice(idx, idx + query.length)}</span>
      {text.slice(idx + query.length)}
    </span>
  );
}

export const SearchSuggestionsDropdown: React.FC<SearchSuggestionsProps> = ({
  groupedSuggestions,
  query,
  onSelect,
  onClose,
  visible,
}) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    if (visible) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [visible, onClose]);

  if (!visible || groupedSuggestions.totalCount === 0) return null;

  const renderSection = (
    title: string,
    items: SearchSuggestion[],
    headerBg: string
  ) => {
    if (!items || items.length === 0) return null;

    return (
      <div className="w-full">
        {/* Section Header (Grey Pill Header matching reference image) */}
        <div className={`px-4 py-1.5 text-[11px] font-bold tracking-wide uppercase flex items-center justify-between border-y border-zinc-200 dark:border-white/5 ${headerBg}`}>
          <span className="text-zinc-600 dark:text-zinc-400 font-semibold">{title}:</span>
          <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono">({items.length})</span>
        </div>

        {/* Section Items */}
        <ul className="py-0.5 divide-y divide-zinc-100 dark:divide-white/5">
          {items.map((item, idx) => (
            <li key={`${item.type}-${item.text}-${idx}`}>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  onSelect(item.text);
                }}
                className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-zinc-100 dark:hover:bg-white/5 transition-colors cursor-pointer group/item"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200 group-hover/item:text-[#e0358d] dark:group-hover/item:text-rose-400 transition-colors truncate">
                    <HighlightMatch text={item.text} query={query} />
                  </span>
                </div>
                <span className="material-symbols-outlined text-xs text-zinc-400 dark:text-zinc-500 opacity-0 group-hover/item:opacity-100 transition-opacity shrink-0">
                  north_west
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    );
  };

  return (
    <div
      ref={ref}
      className="search-suggestions-dropdown absolute left-0 right-0 top-full mt-2 z-[200] rounded-xl overflow-hidden shadow-2xl border border-zinc-300 dark:border-white/15 bg-white dark:bg-[#18181b] backdrop-blur-2xl animate-in fade-in slide-in-from-top-2 duration-150 max-h-[80vh] overflow-y-auto custom-scrollbar"
    >
      {/* 1. Pornstars Section (Top Priority) */}
      {renderSection(
        'Pornstars',
        groupedSuggestions.performers,
        'bg-zinc-100 dark:bg-zinc-800/90'
      )}

      {/* 2. Tags Section */}
      {renderSection(
        'Tags',
        groupedSuggestions.tags,
        'bg-zinc-100 dark:bg-zinc-800/90'
      )}

      {/* 3. Categories Section */}
      {renderSection(
        'Categories',
        groupedSuggestions.categories,
        'bg-zinc-100 dark:bg-zinc-800/90'
      )}

      {/* 4. Video Titles Section */}
      {renderSection(
        'Videos',
        groupedSuggestions.titles,
        'bg-zinc-100 dark:bg-zinc-800/90'
      )}
    </div>
  );
};

export default SearchSuggestionsDropdown;
