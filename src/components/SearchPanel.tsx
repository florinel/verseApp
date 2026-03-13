import { useState, useRef, useEffect } from 'react';
import { useSearch } from '../context/SearchContext';
import { useBible } from '../context/BibleContext';

export function SearchBar() {
  const [input, setInput] = useState('');
  const { search, clear, searching } = useSearch();
  const { currentTranslation, setViewMode } = useBible();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const doSearch = (value: string) => {
    if (value.trim()) {
      setViewMode('search');
      search(value, currentTranslation);
    }
  };

  const handleChange = (value: string) => {
    setInput(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!value.trim()) {
      clear();
      return;
    }
    debounceRef.current = setTimeout(() => doSearch(value), 400);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      doSearch(input);
    }
  };

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          value={input}
          onChange={e => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search verses or references..."
          className="w-full pl-9 pr-9 py-1.5 rounded-lg border border-parchment-300 dark:border-gray-700
            bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100
            placeholder-gray-400 dark:placeholder-gray-500
            focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent
            text-sm transition-colors"
        />
        {searching && (
          <div className="absolute right-8 top-1/2 -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        {input && (
          <button
              onClick={() => { setInput(''); clear(); setViewMode('read'); }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            aria-label="Clear search"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
      <button
        onClick={() => doSearch(input)}
        disabled={!input.trim() || searching}
        className="w-full py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 disabled:bg-gray-300 dark:disabled:bg-gray-700
          text-white text-sm font-medium transition-colors disabled:cursor-not-allowed"
      >
        {searching ? 'Searching…' : 'Search'}
      </button>
    </div>
  );
}

/** Main panel search results view */
export function SearchResultsView() {
  const { results, dictResults, searching, query, refMatch } = useSearch();
  const { navigateTo, setViewMode } = useBible();

  const handleVerseClick = (bookName: string, chapter: number) => {
    navigateTo(bookName, chapter);
    setViewMode('read');
  };

  if (!query) {
    return (
      <div className="max-w-4xl mx-auto text-center py-16">
        <svg className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <p className="text-gray-400 dark:text-gray-500">
          Search by keyword, or enter a reference like <span className="font-mono text-amber-600 dark:text-amber-400">John 3:16</span>
        </p>
      </div>
    );
  }

  if (searching) {
    return (
      <div className="max-w-4xl mx-auto text-center py-16">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-gray-400 dark:text-gray-500">Searching for "{query}"...</p>
      </div>
    );
  }

  const hasVerses = results.length > 0;
  const hasDict = dictResults.length > 0;
  const noResults = !hasVerses && !hasDict;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Reference match banner */}
      {refMatch && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
          <button
            onClick={() => handleVerseClick(refMatch.bookName, refMatch.chapter)}
            className="text-amber-800 dark:text-amber-300 font-semibold hover:underline"
          >
            {refMatch.bookName} {refMatch.chapter}{refMatch.verse ? `:${refMatch.verse}` : ''} →  Go to chapter
          </button>
        </div>
      )}

      {noResults && (
        <div className="text-center py-16 text-gray-400 dark:text-gray-500">
          No results found for "{query}"
        </div>
      )}

      {/* Dictionary results */}
      {hasDict && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            Dictionary ({dictResults.length})
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {dictResults.slice(0, 20).map(entry => (
              <div
                key={entry.term}
                className="p-3 rounded-lg border border-parchment-200 dark:border-gray-800 bg-white dark:bg-gray-900"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-gray-800 dark:text-gray-100">{entry.term}</span>
                  <span className="text-[10px] uppercase px-1.5 py-0.5 rounded-full bg-parchment-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                    {entry.category}
                  </span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">{entry.definition}</p>
                {entry.references.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {entry.references.slice(0, 3).map(ref => (
                      <span key={ref} className="text-[11px] text-amber-700 dark:text-amber-400">{ref}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Verse results */}
      {hasVerses && (
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Verses ({results.length}{results.length >= 500 ? '+' : ''})
          </h3>
          <div className="space-y-1">
            {results.slice(0, 200).map((r, i) => {
              const lowerQuery = query.toLowerCase();
              const lowerText = r.text.toLowerCase();
              const idx = lowerText.indexOf(lowerQuery);

              return (
                <button
                  key={`${r.bookName}-${r.chapter}-${r.verse}-${i}`}
                  onClick={() => handleVerseClick(r.bookName, r.chapter)}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-parchment-100 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <span className="text-xs font-semibold text-amber-700 dark:text-amber-400 mr-2">
                    {r.bookName} {r.chapter}:{r.verse}
                  </span>
                  <span className="text-sm text-gray-700 dark:text-gray-300">
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
                  </span>
                </button>
              );
            })}
            {results.length > 200 && (
              <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-3">
                Showing first 200 of {results.length} results
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
