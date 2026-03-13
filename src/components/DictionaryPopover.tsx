import { useState, useRef, useEffect, ReactNode } from 'react';
import { DictionaryEntry } from '../types/bible';

/** Split definition text so that "-See TERM" becomes a clickable link */
function renderDefinition(
  text: string,
  onNavigate?: (term: string) => void,
): ReactNode {
  // Match patterns like "-See GIFT" or "See TEMPERANCE"
  const parts = text.split(/(-?See\s+[A-Z][A-Z, ]*[A-Z])/g);
  if (parts.length === 1) return text;
  return parts.map((part, i) => {
    const m = part.match(/^-?See\s+(.+)$/);
    if (m && onNavigate) {
      const term = m[1].trim();
      return (
        <button
          key={i}
          onClick={(e) => { e.stopPropagation(); onNavigate(term); }}
          className="text-amber-700 dark:text-amber-400 hover:underline font-medium"
        >
          See {term}
        </button>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

export function DictionaryPopover({ entry, children, onSearch }: {
  entry: DictionaryEntry;
  children: React.ReactNode;
  onSearch?: (term: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const hoverTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleMouseEnter = () => {
    hoverTimeout.current = setTimeout(() => setOpen(true), 300);
  };

  const handleMouseLeave = () => {
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
  };

  return (
    <span className="relative inline" ref={ref}>
      <span
        className="dict-highlight"
        onClick={() => setOpen(!open)}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {children}
      </span>
      {open && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 sm:w-80
          bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-parchment-300 dark:border-gray-700
          p-4 text-sm font-sans animate-in">
          <div className="flex items-start justify-between mb-2">
            <div>
              <h4 className="font-bold text-amber-800 dark:text-amber-400">{entry.term}</h4>
              <span className="text-xs text-gray-500 dark:text-gray-400 capitalize">{entry.category}</span>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              aria-label="Close"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-2">
            {renderDefinition(entry.definition, (term) => {
              setOpen(false);
              if (onSearch) onSearch(term);
            })}
          </p>
          {entry.references.length > 0 && (
            <div className="text-xs text-gray-500 dark:text-gray-400">
              <span className="font-semibold">References:</span>{' '}
              {entry.references.join(', ')}
            </div>
          )}
          {/* Arrow */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px">
            <div className="w-3 h-3 bg-white dark:bg-gray-800 border-r border-b border-parchment-300 dark:border-gray-700 rotate-45 -translate-y-1.5" />
          </div>
        </div>
      )}
    </span>
  );
}
