import { useState, useRef, useEffect } from 'react';
import { DictionaryEntry } from '../types/bible';

export function DictionaryPopover({ entry, children }: {
  entry: DictionaryEntry;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

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

  return (
    <span className="relative inline" ref={ref}>
      <span
        className="dict-highlight"
        onClick={() => setOpen(!open)}
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
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-2">{entry.definition}</p>
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
