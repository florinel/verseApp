import { useState, useEffect, useCallback } from 'react';
import { DictionaryEntry } from '../types/bible';

const CATEGORIES = ['people', 'places', 'events', 'topics'] as const;

/** Module-level cache — all four category files are fetched once and shared across hook instances. */
let allEntries: DictionaryEntry[] | null = null;
/** Lowercased term set for O(1) `isKnownTerm` lookups. */
let termsSet: Set<string> | null = null;

/**
 * Loads all dictionary entries (people, places, events, topics) and exposes
 * helpers for lookup, full-text search, and category filtering.
 *
 * Data is fetched once per page load; subsequent hook calls reuse the module-level cache.
 */
export function useDictionary() {
  const [entries, setEntries] = useState<DictionaryEntry[]>(allEntries ?? []);
  const [loading, setLoading] = useState(!allEntries);

  useEffect(() => {
    if (allEntries) {
      setEntries(allEntries);
      setLoading(false);
      return;
    }

    let cancelled = false;

    Promise.all(
      CATEGORIES.map(cat =>
        fetch(`/data/dictionaries/${cat}.json`)
          .then(r => r.ok ? r.json() : [])
          .catch(() => [])
      )
    ).then(results => {
      if (cancelled) return;
      const all: DictionaryEntry[] = results.flat();
      allEntries = all;
      termsSet = new Set(all.map(e => e.term.toLowerCase()));
      setEntries(all);
      setLoading(false);
    });

    return () => { cancelled = true; };
  }, []);

  const lookup = useCallback((term: string): DictionaryEntry | undefined => {
    return entries.find(e => e.term.toLowerCase() === term.toLowerCase());
  }, [entries]);

  const searchEntries = useCallback((query: string): DictionaryEntry[] => {
    if (!query.trim()) return entries;
    const q = query.toLowerCase();
    return entries.filter(e =>
      e.term.toLowerCase().includes(q) ||
      e.definition.toLowerCase().includes(q)
    );
  }, [entries]);

  const isKnownTerm = useCallback((word: string): boolean => {
    return termsSet?.has(word.toLowerCase()) ?? false;
  }, []);

  const getByCategory = useCallback((category: DictionaryEntry['category']): DictionaryEntry[] => {
    return entries.filter(e => e.category === category);
  }, [entries]);

  return { entries, loading, lookup, searchEntries, isKnownTerm, getByCategory };
}
