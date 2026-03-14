import { useState, useEffect, useCallback } from 'react';
import { DictionaryCandidate, DictionaryEntry, DisambiguationModel } from '../types/bible';
import { rankDictionaryCandidates, setDisambiguationModel } from '../utils/disambiguate';

const CATEGORIES = ['people', 'places', 'events', 'topics'] as const;
const OVERRIDE_FILES = ['people-overrides'] as const;

/** Module-level cache — all four category files are fetched once and shared across hook instances. */
let allEntries: DictionaryEntry[] | null = null;
/** Lowercased term set for O(1) `isKnownTerm` lookups. */
let termsSet: Set<string> | null = null;
let modelInitialized = false;

export function __resetDictionaryCacheForTests() {
  allEntries = null;
  termsSet = null;
  modelInitialized = false;
  setDisambiguationModel(null);
}

function isValidModel(model: unknown): model is DisambiguationModel {
  if (!model || typeof model !== 'object') return false;
  const maybe = model as Partial<DisambiguationModel>;
  return typeof maybe.version === 'string' && typeof maybe.featureWeights === 'object' && !!maybe.featureWeights;
}

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
    if (!modelInitialized) {
      fetch('/data/disambiguation/model.json')
        .then(r => (r.ok ? r.json() : null))
        .then(json => {
          if (isValidModel(json)) {
            setDisambiguationModel(json);
          }
        })
        .catch(() => {
          // Fallback to built-in weights when model is unavailable.
        })
        .finally(() => {
          modelInitialized = true;
        });
    }

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
    ).then(async (results) => {
      if (cancelled) return;

      const overrideResults = await Promise.all(
        OVERRIDE_FILES.map(file =>
          fetch(`/data/dictionaries/${file}.json`)
            .then(r => r.ok ? r.json() : [])
            .catch(() => [])
        )
      );

      const all: DictionaryEntry[] = [...results.flat(), ...overrideResults.flat()];
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

  const getCandidates = useCallback((
    term: string,
    contextText: string,
    currentBook?: string,
    currentChapter?: number,
    currentVerse?: number,
  ): DictionaryCandidate[] => {
    return rankDictionaryCandidates({
      term,
      entries,
      contextText,
      currentBook,
      currentChapter,
      currentVerse,
      limit: 5,
    });
  }, [entries]);

  const resolveBestCandidate = useCallback((
    term: string,
    contextText: string,
    currentBook?: string,
    currentChapter?: number,
    currentVerse?: number,
  ): DictionaryEntry | undefined => {
    const candidates = getCandidates(term, contextText, currentBook, currentChapter, currentVerse);
    return candidates[0]?.entry;
  }, [getCandidates]);

  return { entries, loading, lookup, searchEntries, isKnownTerm, getByCategory, getCandidates, resolveBestCandidate };
}
