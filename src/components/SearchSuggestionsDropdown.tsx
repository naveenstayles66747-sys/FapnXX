import React, { useEffect, useRef } from 'react';
import { SearchSuggestion } from '../utils/searchEngine';

interface SearchSuggestionsProps {
  suggestions: SearchSuggestion[];
  query: string;
  onSelect: (text: string) => void;
  onClose: () => void;
  visible: boolean;
}

/**
 * Highlights the matched portion of the suggestion text (bold the query part)
 */
function HighlightMatch({ text, query }: { text: string; query: string }) {
  if (!query) return <span>{text}</span>;
  const q = query.toLowerCase();
  const idx = text.toLowerCase().indexOf(q);
  if (idx === -1) return <span>{text}</span>;
  return (
    <span>
      {text.slice(0, idx)}
      <span className="text-white font-black">{text.slice(idx, idx + query.length)}</span>
      {text.slice(idx + query.length)}
    </span>
  );
}

const typeLabel: Record<SearchSuggestion['type'], string> = {
  performer: 'Performer',
  tag: 'Tag',
  category: 'Category',
  title: 'Video',
};

export const SearchSuggestionsDropdown: React.FC<SearchSuggestionsProps> = ({
  suggestions,
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

  if (!visible || suggestions.length === 0) return null;

  return (
    <div
      ref={ref}
      className="search-suggestions-dropdown absolute left-0 right-0 top-full mt-2 z-[200] rounded-2xl overflow-hidden shadow-2xl border border-white/10 animate-in fade-in slide-in-from-top-2 duration-150"
      style={{
        background: 'rgba(18, 17, 19, 0.97)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      }}
    >
      {/* Header */}
      <div className="px-4 py-2.5 border-b border-white/8 flex items-center gap-2">
        <span className="material-symbols-outlined text-sm text-[#e0358d]">search</span>
        <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#a19fa6]">
          Suggestions
        </span>
      </div>

      {/* Suggestion List */}
      <ul className="py-1.5 max-h-64 overflow-y-auto">
        {suggestions.map((s, i) => (
          <li key={`${s.type}-${s.text}-${i}`}>
            <button
              onMouseDown={(e) => {
                e.preventDefault(); // Prevent blur before click
                onSelect(s.text);
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-white/6 transition-colors cursor-pointer group/sug"
            >
              {/* Icon */}
              <span className="material-symbols-outlined text-base text-[#e0358d] shrink-0 group-hover/sug:text-[#f751a1] transition-colors">
                {s.icon}
              </span>

              {/* Text with highlight */}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-[#debec8] group-hover/sug:text-white transition-colors truncate">
                  <HighlightMatch text={s.text} query={query} />
                </p>
              </div>

              {/* Type badge */}
              <span className="text-[9px] font-black uppercase tracking-wider text-[#a19fa6] bg-white/5 px-2 py-0.5 rounded-full shrink-0 group-hover/sug:text-[#debec8] transition-colors">
                {typeLabel[s.type]}
              </span>

              {/* Arrow hint */}
              <span className="material-symbols-outlined text-sm text-[#a19fa6] opacity-0 group-hover/sug:opacity-100 transition-opacity shrink-0">
                north_west
              </span>
            </button>
          </li>
        ))}
      </ul>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-white/8 flex items-center gap-1.5">
        <span className="material-symbols-outlined text-xs text-[#a19fa6]">keyboard_return</span>
        <span className="text-[9px] text-[#a19fa6] font-semibold">Press Enter to search all results</span>
      </div>
    </div>
  );
};

export default SearchSuggestionsDropdown;
