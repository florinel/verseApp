import { useState, useCallback, useRef } from 'react';
import { SearchResult, Translation } from '../types/bible';
import { BIBLE_BOOKS, bookFileName } from '../bibleBooks';

export function useSearch() {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState('');
  const abortRef = useRef(false);

  const search = useCallback(async (searchQuery: string, translation: Translation = 'nasb') => {
    const trimmed = searchQuery.trim();
    setQuery(trimmed);
    if (!trimmed || trimmed.length < 2) {
      setResults([]);
      return;
    }

    abortRef.current = true; // cancel any previous search
    abortRef.current = false;
    setSearching(true);

    const found: SearchResult[] = [];
    const lowerQuery = trimmed.toLowerCase();

    for (const book of BIBLE_BOOKS) {
      if (abortRef.current) break;
      try {
        const fileName = bookFileName(book.name);
        const res = await fetch(`/data/bible/${translation}/${fileName}.json`);
        if (!res.ok) continue;
        const data = await res.json();
        for (const chapter of data.chapters) {
          for (const verse of chapter.verses) {
            if (verse.text.toLowerCase().includes(lowerQuery)) {
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
    setQuery('');
    setSearching(false);
  }, []);

  return { results, searching, query, search, clear };
}
