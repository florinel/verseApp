import { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { Translation, ViewMode } from '../types/bible';
import { BIBLE_BOOKS } from '../bibleBooks';

interface BibleContextType {
  currentBook: string;
  currentChapter: number;
  currentTranslation: Translation;
  viewMode: ViewMode;
  setBook: (book: string) => void;
  setChapter: (chapter: number) => void;
  setTranslation: (t: Translation) => void;
  setViewMode: (mode: ViewMode) => void;
  navigateTo: (book: string, chapter: number) => void;
  totalChapters: number;
  nextChapter: () => void;
  prevChapter: () => void;
}

const BibleContext = createContext<BibleContextType | null>(null);

export function BibleProvider({ children }: { children: ReactNode }) {
  const [currentBook, setCurrentBook] = useState('Genesis');
  const [currentChapter, setCurrentChapter] = useState(1);
  const [currentTranslation, setCurrentTranslation] = useState<Translation>('nasb');
  const [viewMode, setViewMode] = useState<ViewMode>('read');

  const bookMeta = BIBLE_BOOKS.find(b => b.name === currentBook);
  const totalChapters = bookMeta?.chapters ?? 1;

  const navigateTo = useCallback((book: string, chapter: number) => {
    setCurrentBook(book);
    setCurrentChapter(chapter);
    setViewMode('read');
  }, []);

  const setBook = useCallback((book: string) => {
    setCurrentBook(book);
    setCurrentChapter(1);
  }, []);

  // Advance to the next chapter; wraps to the first chapter of the next book at the end.
  const nextChapter = useCallback(() => {
    if (currentChapter < totalChapters) {
      setCurrentChapter(c => c + 1);
    } else {
      const idx = BIBLE_BOOKS.findIndex(b => b.name === currentBook);
      if (idx < BIBLE_BOOKS.length - 1) {
        setCurrentBook(BIBLE_BOOKS[idx + 1].name);
        setCurrentChapter(1);
      }
    }
  }, [currentBook, currentChapter, totalChapters]);

  // Go back one chapter; wraps to the last chapter of the previous book at the start.
  const prevChapter = useCallback(() => {
    if (currentChapter > 1) {
      setCurrentChapter(c => c - 1);
    } else {
      const idx = BIBLE_BOOKS.findIndex(b => b.name === currentBook);
      if (idx > 0) {
        const prevBook = BIBLE_BOOKS[idx - 1];
        setCurrentBook(prevBook.name);
        setCurrentChapter(prevBook.chapters);
      }
    }
  }, [currentBook, currentChapter]);

  return (
    <BibleContext.Provider value={{
      currentBook,
      currentChapter,
      currentTranslation,
      viewMode,
      setBook,
      setChapter: setCurrentChapter,
      setTranslation: setCurrentTranslation,
      setViewMode,
      navigateTo,
      totalChapters,
      nextChapter,
      prevChapter,
    }}>
      {children}
    </BibleContext.Provider>
  );
}

export function useBible() {
  const ctx = useContext(BibleContext);
  if (!ctx) throw new Error('useBible must be inside BibleProvider');
  return ctx;
}
