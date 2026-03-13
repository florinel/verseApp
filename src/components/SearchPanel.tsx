import { useState, useRef, useEffect, useCallback } from 'react';
import { useSearch } from '../context/SearchContext';
import { useBible } from '../context/BibleContext';
import { DictionaryEntry, SearchResult } from '../types/bible';
import { BIBLE_BOOKS, bookFileName } from '../bibleBooks';

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

/* ── Detail panel types ── */
type RefGroup = {
  ref: string;
  verses: { bookName: string; chapter: number; verse: number; text: string }[];
  loading: boolean;
};

type DetailSelection =
  | { type: 'dictionary'; entry: DictionaryEntry; refGroups: RefGroup[] }
  | { type: 'verse'; bookName: string; chapter: number; verse: number; text: string }
  | { type: 'verses'; label: string; verses: { bookName: string; chapter: number; verse: number; text: string }[]; loading?: boolean };

const CATEGORY_ICONS: Record<DictionaryEntry['category'], string> = {
  person: '👤',
  place: '📍',
  event: '📅',
  topic: '📖',
};

/** Parse a reference string like "Genesis 1:1" or "John 3:16" */
function parseRefString(ref: string): { bookName: string; chapter: number; verse?: number } | null {
  const match = ref.trim().match(/^(\d?\s*[A-Za-z][A-Za-z\s]*?)\s+(\d+)(?::(\d+))?$/);
  if (!match) return null;
  const bookInput = match[1].trim().toLowerCase();
  const chapter = parseInt(match[2], 10);
  const verse = match[3] ? parseInt(match[3], 10) : undefined;
  const book = BIBLE_BOOKS.find(b =>
    b.name.toLowerCase() === bookInput ||
    b.abbr.toLowerCase() === bookInput ||
    b.name.toLowerCase().startsWith(bookInput)
  );
  if (!book || chapter < 1 || chapter > book.chapters) return null;
  return { bookName: book.name, chapter, verse };
}

/** Fetch verses for a given reference string */
async function fetchVersesForRef(ref: string, translation: string = 'nasb'): Promise<{ bookName: string; chapter: number; verse: number; text: string }[]> {
  const parsed = parseRefString(ref);
  if (!parsed) return [];
  const fileName = bookFileName(parsed.bookName);
  try {
    const res = await fetch(`/data/bible/${encodeURIComponent(translation)}/${encodeURIComponent(fileName)}.json`);
    if (!res.ok) return [];
    const data = await res.json();
    const chapter = data.chapters?.find((c: { chapter: number }) => c.chapter === parsed.chapter);
    if (!chapter) return [];
    const verses = parsed.verse
      ? chapter.verses.filter((v: { verse: number }) => v.verse === parsed.verse)
      : chapter.verses;
    return verses.map((v: { verse: number; text: string }) => ({
      bookName: parsed.bookName,
      chapter: parsed.chapter,
      verse: v.verse,
      text: v.text,
    }));
  } catch {
    return [];
  }
}

/* ── Detail Panel ── */
function SearchDetailPanel({ detail, onGoToChapter }: {
  detail: DetailSelection;
  onGoToChapter: (bookName: string, chapter: number) => void;
}) {
  if (detail.type === 'dictionary') {
    const { entry, refGroups } = detail;
    return (
      <div className="p-5">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xl">{CATEGORY_ICONS[entry.category]}</span>
          <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">{entry.term}</h3>
        </div>
        <span className="inline-block px-2 py-0.5 bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-400 text-xs rounded-full mb-3 capitalize">
          {entry.category}
        </span>
        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed mb-4">{entry.definition}</p>
        {refGroups.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">References</h4>
            <div className="space-y-4">
              {refGroups.map(group => (
                <div key={group.ref}>
                  <button
                    onClick={() => {
                      if (group.verses.length > 0) onGoToChapter(group.verses[0].bookName, group.verses[0].chapter);
                    }}
                    className="text-xs font-semibold text-amber-700 dark:text-amber-400 hover:underline mb-1 inline-block"
                  >
                    {group.ref}
                  </button>
                  {group.loading ? (
                    <div className="flex items-center gap-1.5 text-gray-400 dark:text-gray-500 text-xs">
                      <div className="w-3 h-3 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                      Loading…
                    </div>
                  ) : group.verses.length === 0 ? (
                    <p className="text-xs text-gray-400 dark:text-gray-500 italic">Could not load verse</p>
                  ) : (
                    <div className="space-y-1">
                      {group.verses.map(v => (
                        <p key={`${v.bookName}-${v.chapter}-${v.verse}`} className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed pl-3 border-l-2 border-amber-300 dark:border-amber-700">
                          <sup className="text-[10px] font-bold text-amber-600 dark:text-amber-500 mr-0.5">{v.verse}</sup>
                          {v.text}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (detail.type === 'verse') {
    const { bookName, chapter, verse, text } = detail;
    return (
      <div className="p-5">
        <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-1">
          {bookName} {chapter}:{verse}
        </h3>
        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed mb-4">{text}</p>
        <button
          onClick={() => onGoToChapter(bookName, chapter)}
          className="text-sm text-amber-700 dark:text-amber-400 hover:underline font-medium flex items-center gap-1"
        >
          Open {bookName} {chapter}
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    );
  }

  if (detail.type === 'verses') {
    return (
      <div className="p-5">
        <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-3">{detail.label}</h3>
        {detail.loading ? (
          <div className="flex items-center gap-2 text-gray-400 dark:text-gray-500">
            <div className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
            Loading verses…
          </div>
        ) : detail.verses.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-gray-500">No verses found for this reference.</p>
        ) : (
          <div className="space-y-2">
            {detail.verses.map(v => (
              <div key={`${v.bookName}-${v.chapter}-${v.verse}`} className="flex gap-2">
                <button
                  onClick={() => onGoToChapter(v.bookName, v.chapter)}
                  className="text-xs font-semibold text-amber-700 dark:text-amber-400 whitespace-nowrap hover:underline flex-shrink-0 pt-0.5"
                >
                  {v.bookName} {v.chapter}:{v.verse}
                </button>
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{v.text}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return null;
}

/** Main panel search results view — two-panel layout */
export function SearchResultsView() {
  const { results, dictResults, searching, query, refMatch } = useSearch();
  const { navigateTo, setViewMode, currentTranslation } = useBible();
  const [detail, setDetail] = useState<DetailSelection | null>(null);

  // Clear detail when query changes
  useEffect(() => { setDetail(null); }, [query]);

  const handleGoToChapter = useCallback((bookName: string, chapter: number) => {
    navigateTo(bookName, chapter);
    setViewMode('read');
  }, [navigateTo, setViewMode]);

  const handleSelectDictEntry = useCallback(async (entry: DictionaryEntry) => {
    // Show entry immediately with loading state for references
    const initialGroups: RefGroup[] = entry.references.map(ref => ({ ref, verses: [], loading: true }));
    setDetail({ type: 'dictionary', entry, refGroups: initialGroups });

    // Fetch all reference verses in parallel
    const resolved = await Promise.all(
      entry.references.map(async (ref) => {
        const verses = await fetchVersesForRef(ref, currentTranslation);
        return { ref, verses, loading: false } as RefGroup;
      })
    );
    setDetail(prev => {
      if (prev?.type === 'dictionary' && prev.entry.term === entry.term) {
        return { ...prev, refGroups: resolved };
      }
      return prev;
    });
  }, [currentTranslation]);

  const handleSelectVerse = useCallback((r: SearchResult) => {
    setDetail({ type: 'verse', bookName: r.bookName, chapter: r.chapter, verse: r.verse, text: r.text });
  }, []);

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
    <div className="flex h-full gap-0">
      {/* Left panel — search results */}
      <div className={`overflow-y-auto p-4 ${detail ? 'w-1/2 border-r border-parchment-200 dark:border-gray-800' : 'w-full max-w-4xl mx-auto'}`}>
        {/* Reference match banner */}
        {refMatch && (
          <div className="mb-4 px-4 py-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
            <button
              onClick={() => handleGoToChapter(refMatch.bookName, refMatch.chapter)}
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
              {dictResults.slice(0, 20).map(entry => {
                const isActive = detail?.type === 'dictionary' && detail.entry.term === entry.term;
                return (
                  <button
                    key={entry.term}
                    onClick={() => handleSelectDictEntry(entry)}
                    className={`p-3 rounded-lg border text-left transition-colors
                      ${isActive
                        ? 'border-amber-400 dark:border-amber-600 bg-amber-50 dark:bg-amber-900/20 ring-1 ring-amber-400 dark:ring-amber-600'
                        : 'border-parchment-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-amber-300 dark:hover:border-amber-700'}`}
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
                  </button>
                );
              })}
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
                const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const hlRegex = new RegExp(`(\\b${escaped}\\b)`, 'gi');
                const parts = r.text.split(hlRegex);
                const isActive = detail?.type === 'verse' && detail.bookName === r.bookName && detail.chapter === r.chapter && detail.verse === r.verse;

                return (
                  <button
                    key={`${r.bookName}-${r.chapter}-${r.verse}-${i}`}
                    onClick={() => handleSelectVerse(r)}
                    className={`w-full text-left px-3 py-2 rounded-lg transition-colors
                      ${isActive
                        ? 'bg-amber-100 dark:bg-amber-900/30 ring-1 ring-amber-400 dark:ring-amber-600'
                        : 'hover:bg-parchment-100 dark:hover:bg-gray-800/50'}`}
                  >
                    <span className="text-xs font-semibold text-amber-700 dark:text-amber-400 mr-2">
                      {r.bookName} {r.chapter}:{r.verse}
                    </span>
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {parts.map((part, j) =>
                        hlRegex.test(part) ? (
                          <mark key={j} className="bg-amber-200 dark:bg-amber-800/50 text-inherit rounded px-0.5">{part}</mark>
                        ) : (
                          <span key={j}>{part}</span>
                        )
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

      {/* Right panel — detail view */}
      {detail && (
        <div className="w-1/2 overflow-y-auto bg-white dark:bg-gray-900/50">
          <div className="flex items-center justify-between px-5 py-3 border-b border-parchment-200 dark:border-gray-800">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Detail
            </h3>
            <button
              onClick={() => setDetail(null)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              aria-label="Close detail"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <SearchDetailPanel detail={detail} onGoToChapter={handleGoToChapter} />
        </div>
      )}
    </div>
  );
}
