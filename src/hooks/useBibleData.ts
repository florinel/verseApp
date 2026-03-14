import { useState, useEffect } from 'react';
import { BookData, Translation } from '../types/bible';
import { bookFileName } from '../bibleBooks';

/** In-memory cache keyed by `"translation/bookName"` to avoid redundant fetches across renders. */
const cache = new Map<string, BookData>();

/**
 * Fetches and caches the JSON data for a single Bible book.
 * Returns the cached result immediately on repeat calls for the same book/translation pair.
 *
 * @param bookName - Full book name as it appears in `BIBLE_BOOKS`, e.g. `"Genesis"`
 * @param translation - Translation identifier, e.g. `"nasb"`
 * @returns `{ data, loading, error }` — `data` is `null` until the fetch resolves
 */
export function useBibleData(bookName: string, translation: Translation) {
  const [data, setData] = useState<BookData | null>(cache.get(`${translation}/${bookName}`) ?? null);
  const [loading, setLoading] = useState(!cache.has(`${translation}/${bookName}`));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const key = `${translation}/${bookName}`;
    if (cache.has(key)) {
      setData(cache.get(key)!);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    const fileName = bookFileName(bookName);
    fetch(`/data/bible/${translation}/${fileName}.json`)
      .then(res => {
        if (!res.ok) throw new Error(`Failed to load ${bookName} (${translation})`);
        return res.json();
      })
      .then((json: BookData) => {
        if (cancelled) return;
        cache.set(key, json);
        setData(json);
        setLoading(false);
      })
      .catch(err => {
        if (cancelled) return;
        setError(err.message);
        setLoading(false);
      });

    return () => { cancelled = true; };
  }, [bookName, translation]);

  return { data, loading, error };
}
