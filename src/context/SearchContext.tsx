import { createContext, useContext, useState, useCallback, useRef, type ReactNode } from 'react';
import { SearchResult, Translation, DictionaryEntry } from '../types/bible';
import { BIBLE_BOOKS, bookFileName } from '../bibleBooks';
import { scoreDictionaryEntryForQuery } from '../utils/disambiguate';

function parseReference(input: string): { bookName: string; chapter: number; verse?: number } | null {
  const trimmed = input.trim();
  const match = trimmed.match(/^(\d?\s*[A-Za-z][A-Za-z\s]*?)\s+(\d+)(?::(\d+))?$/);
  if (!match) return null;

  const bookInput = match[1].trim().toLowerCase();
  const chapter = parseInt(match[2], 10);
  const verse = match[3] ? parseInt(match[3], 10) : undefined;

  const book = BIBLE_BOOKS.find(b =>
    b.name.toLowerCase() === bookInput ||
    b.abbr.toLowerCase() === bookInput ||
    b.name.toLowerCase().startsWith(bookInput)
  );
  if (!book) return null;
  if (chapter < 1 || chapter > book.chapters) return null;

  return { bookName: book.name, chapter, verse };
}

interface SearchState {
  results: SearchResult[];
  dictResults: DictionaryEntry[];
  searching: boolean;
  query: string;
  refMatch: { bookName: string; chapter: number; verse?: number } | null;
  search: (query: string, translation?: Translation) => Promise<void>;
  clear: () => void;
}

const SearchContext = createContext<SearchState | null>(null);

export function SearchProvider({ children }: { children: ReactNode }) {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [dictResults, setDictResults] = useState<DictionaryEntry[]>([]);
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState('');
  const [refMatch, setRefMatch] = useState<{ bookName: string; chapter: number; verse?: number } | null>(null);
  const abortRef = useRef(false);

  const search = useCallback(async (searchQuery: string, translation: Translation = 'nasb') => {
    const trimmed = searchQuery.trim();
    setQuery(trimmed);
    if (!trimmed || trimmed.length < 2) {
      setResults([]);
      setDictResults([]);
      setRefMatch(null);
      return;
    }

    abortRef.current = true;
    abortRef.current = false;
    setSearching(true);
    setRefMatch(null);
    setDictResults([]);

    // 1. Check if it's a Bible reference
    const ref = parseReference(trimmed);
    if (ref) {
      setRefMatch(ref);
      try {
        const fileName = bookFileName(ref.bookName);
        const res = await fetch(`/data/bible/${translation}/${fileName}.json`);
        if (res.ok) {
          const data = await res.json();
          const chapter = data.chapters?.find((c: { chapter: number }) => c.chapter === ref.chapter);
          if (chapter) {
            const verses = ref.verse
              ? chapter.verses.filter((v: { verse: number }) => v.verse === ref.verse)
              : chapter.verses;
            setResults(verses.map((v: { verse: number; text: string }) => ({
              bookName: ref.bookName,
              chapter: ref.chapter,
              verse: v.verse,
              text: v.text,
            })));
          }
        }
      } catch { /* ignore */ }
      setSearching(false);
      return;
    }

    // 2. Search dictionary entries
    try {
      const categories = ['people', 'places', 'events', 'topics'];
      const dictPromises = categories.map(cat =>
        fetch(`/data/dictionaries/${cat}.json`)
          .then(r => r.ok ? r.json() : [])
          .catch(() => [])
      );
      const dictAll: DictionaryEntry[] = (await Promise.all(dictPromises)).flat();
      const lq = trimmed.toLowerCase();
      const matchedDict = dictAll.filter(e =>
        e.term.toLowerCase().includes(lq) ||
        e.definition.toLowerCase().includes(lq)
      );
      const rankedDict = [...matchedDict].sort((a, b) => {
        const scoreDiff = scoreDictionaryEntryForQuery(b, lq) - scoreDictionaryEntryForQuery(a, lq);
        if (scoreDiff !== 0) return scoreDiff;
        return a.term.localeCompare(b.term);
      });
      if (!abortRef.current) setDictResults(rankedDict);
    } catch { /* ignore */ }

    // 3. Keyword search across all books (whole-word matching)
    const found: SearchResult[] = [];
    const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const wordRegex = new RegExp(`\\b${escaped}\\b`, 'i');

    for (const book of BIBLE_BOOKS) {
      if (abortRef.current) break;
      try {
        const fileName = bookFileName(book.name);
        const res = await fetch(`/data/bible/${translation}/${fileName}.json`);
        if (!res.ok) continue;
        const data = await res.json();
        for (const chapter of data.chapters) {
          for (const verse of chapter.verses) {
            if (wordRegex.test(verse.text)) {
              found.push({
                bookName: book.name,
                chapter: chapter.chapter,
                verse: verse.verse,
                text: verse.text,
              });
            }
          }
        }
      } catch {
        // skip books that fail to load
      }
    }

    if (!abortRef.current) {
      setResults(found);
      setSearching(false);
    }
  }, []);

  const clear = useCallback(() => {
    abortRef.current = true;
    setResults([]);
    setDictResults([]);
    setQuery('');
    setRefMatch(null);
    setSearching(false);
  }, []);

  return (
    <SearchContext.Provider value={{ results, dictResults, searching, query, refMatch, search, clear }}>
      {children}
    </SearchContext.Provider>
  );
}

export function useSearch() {
  const ctx = useContext(SearchContext);
  if (!ctx) throw new Error('useSearch must be used within SearchProvider');
  return ctx;
}
