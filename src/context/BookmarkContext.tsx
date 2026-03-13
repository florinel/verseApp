import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Bookmark } from '../types/bible';

interface BookmarkContextType {
  bookmarks: Bookmark[];
  isBookmarked: (bookName: string, chapter: number, verse: number) => boolean;
  toggleBookmark: (bookName: string, chapter: number, verse: number, text: string) => void;
  removeBookmark: (id: string) => void;
  clearAll: () => void;
}

const STORAGE_KEY = 'verseapp-bookmarks';

const BookmarkContext = createContext<BookmarkContextType | null>(null);

export function BookmarkProvider({ children }: { children: ReactNode }) {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bookmarks));
  }, [bookmarks]);

  const isBookmarked = useCallback((bookName: string, chapter: number, verse: number) => {
    return bookmarks.some(b => b.bookName === bookName && b.chapter === chapter && b.verse === verse);
  }, [bookmarks]);

  const toggleBookmark = useCallback((bookName: string, chapter: number, verse: number, text: string) => {
    setBookmarks(prev => {
      const existing = prev.find(b => b.bookName === bookName && b.chapter === chapter && b.verse === verse);
      if (existing) {
        return prev.filter(b => b.id !== existing.id);
      }
      const id = `${bookName}-${chapter}-${verse}`;
      return [...prev, { id, bookName, chapter, verse, text, createdAt: Date.now() }];
    });
  }, []);

  const removeBookmark = useCallback((id: string) => {
    setBookmarks(prev => prev.filter(b => b.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setBookmarks([]);
  }, []);

  return (
    <BookmarkContext.Provider value={{ bookmarks, isBookmarked, toggleBookmark, removeBookmark, clearAll }}>
      {children}
    </BookmarkContext.Provider>
  );
}

export function useBookmarks() {
  const ctx = useContext(BookmarkContext);
  if (!ctx) throw new Error('useBookmarks must be inside BookmarkProvider');
  return ctx;
}
