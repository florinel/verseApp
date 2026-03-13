import { useState, useEffect } from 'react';
import { BookData, Translation } from '../types/bible';
import { bookFileName } from '../bibleBooks';

const cache = new Map<string, BookData>();

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
