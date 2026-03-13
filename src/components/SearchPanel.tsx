import { useState, useRef, useEffect } from 'react';
import { useSearch } from '../hooks/useSearch';
import { useBible } from '../context/BibleContext';

export function SearchBar() {
  const [input, setInput] = useState('');
  const { search, clear, searching } = useSearch();
  const { currentTranslation } = useBible();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const handleChange = (value: string) => {
    setInput(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!value.trim()) {
      clear();
      return;
    }
    debounceRef.current = setTimeout(() => {
      search(value, currentTranslation);
    }, 400);
  };

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <div className="relative">
      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          value={input}
          onChange={e => handleChange(e.target.value)}
          placeholder="Search verses..."
          className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-parchment-300 dark:border-gray-700
            bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100
            placeholder-gray-400 dark:placeholder-gray-500
            focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent
            text-sm transition-colors"
        />
        {input && (
          <button
            onClick={() => { setInput(''); clear(); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            aria-label="Clear search"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
      {searching && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <div className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}

export function SearchResults() {
  const { results, searching, query } = useSearch();
  const { navigateTo, setViewMode } = useBible();

  const handleClick = (bookName: string, chapter: number) => {
    navigateTo(bookName, chapter);
    setViewMode('read');
  };

  if (!query) return null;

  if (searching) {
    return (
      <div className="text-center py-8 text-gray-400 dark:text-gray-500">
        <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        Searching for "{query}"...
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400 dark:text-gray-500">
        No results found for "{query}"
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <p className="text-sm text-gray-500 dark:text-gray-400 px-2 py-2">
        {results.length} result{results.length !== 1 ? 's' : ''} for "{query}"
      </p>
      <div className="max-h-[calc(100vh-200px)] overflow-y-auto space-y-1">
        {results.slice(0, 200).map((r, i) => {
          const lowerQuery = query.toLowerCase();
          const lowerText = r.text.toLowerCase();
          const idx = lowerText.indexOf(lowerQuery);

          return (
            <button
              key={`${r.bookName}-${r.chapter}-${r.verse}-${i}`}
              onClick={() => handleClick(r.bookName, r.chapter)}
              className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-parchment-100 dark:hover:bg-gray-800 transition-colors"
            >
              <div className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-0.5">
                {r.bookName} {r.chapter}:{r.verse}
              </div>
              <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                {idx >= 0 ? (
                  <>
                    {r.text.slice(0, idx)}
                    <mark className="bg-amber-200 dark:bg-amber-800/50 text-inherit rounded px-0.5">
                      {r.text.slice(idx, idx + query.length)}
                    </mark>
                    {r.text.slice(idx + query.length)}
                  </>
                ) : (
                  r.text
                )}
              </div>
            </button>
          );
        })}
        {results.length > 200 && (
          <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-2">
            Showing first 200 of {results.length} results
          </p>
        )}
      </div>
    </div>
  );
}
