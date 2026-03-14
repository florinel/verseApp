import { useMemo, useCallback, useState, Fragment, ReactNode } from 'react';
import { useBible } from '../context/BibleContext';
import { useTheme } from '../context/ThemeContext';
import { useBibleData } from '../hooks/useBibleData';
import { useDictionary } from '../hooks/useDictionary';
import { useSearch } from '../context/SearchContext';
import { BookmarkButton } from './BookmarkButton';
import { CopyButton } from './CopyButton';
import { DictionaryPopover } from './DictionaryPopover';
import { DISAMBIGUATION_MIN_CONFIDENCE } from '../config/disambiguation';

const FONT_SIZE_CLASS = {
  xs: 'text-xs',
  sm: 'text-sm',
  base: 'text-base',
  lg: 'text-lg',
  xl: 'text-xl',
} as const;

export function VerseDisplay() {
  const { currentBook, currentChapter, currentTranslation, nextChapter, prevChapter, totalChapters, setViewMode } = useBible();
  const { fontSerif, fontSize } = useTheme();
  const { data, loading, error } = useBibleData(currentBook, currentTranslation);
  const { entries, lookup, getCandidates } = useDictionary();
  const { search } = useSearch();
  const [selectedVerse, setSelectedVerse] = useState<number | null>(null);

  const handleDictSearch = useCallback((term: string) => {
    setViewMode('search');
    search(term, currentTranslation);
  }, [setViewMode, search, currentTranslation]);

  const chapter = data?.chapters.find(c => c.chapter === currentChapter);

  // Build a regex from all dictionary terms for highlighting
  const termRegex = useMemo(() => {
    if (!entries.length) return null;
    const escaped = entries.map(e => e.term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    return new RegExp(`\\b(${escaped.join('|')})\\b`, 'gi');
  }, [entries]);

  const renderVerseText = useCallback((text: string, verseNumber: number, storyContextText: string): ReactNode => {
    if (!termRegex) return text;

    const parts: Array<{ text: string; isTerm: boolean }> = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    // Reset regex state
    termRegex.lastIndex = 0;
    while ((match = termRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push({ text: text.slice(lastIndex, match.index), isTerm: false });
      }
      parts.push({ text: match[0], isTerm: true });
      lastIndex = termRegex.lastIndex;
    }
    if (lastIndex < text.length) {
      parts.push({ text: text.slice(lastIndex), isTerm: false });
    }

    if (parts.length === 0) return text;

    return parts.map((part, i) => {
      if (!part.isTerm) return <Fragment key={i}>{part.text}</Fragment>;
      const candidates = getCandidates(part.text, text, currentBook, currentChapter, verseNumber, storyContextText);
      const topCandidate = candidates[0];
      const fallbackEntry = lookup(part.text);
      const useRankedEntry = topCandidate && (candidates.length === 1 || topCandidate.confidence >= DISAMBIGUATION_MIN_CONFIDENCE);
      const entry = useRankedEntry ? topCandidate.entry : (fallbackEntry ?? topCandidate?.entry);
      if (!entry) return <Fragment key={i}>{part.text}</Fragment>;
      return (
        <DictionaryPopover
          key={i}
          entry={entry}
          candidates={candidates}
          confidence={topCandidate?.confidence}
          onSearch={handleDictSearch}
        >
          {part.text}
        </DictionaryPopover>
      );
    });
  }, [termRegex, getCandidates, currentBook, currentChapter, lookup, handleDictSearch]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-gray-400 dark:text-gray-500">Loading {currentBook}...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500">Error: {error}</div>
      </div>
    );
  }

  if (!chapter || chapter.verses.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400 dark:text-gray-500">No verses found</div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Chapter header */}
      <div className="mb-4 text-center">
        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">
          {currentBook}
        </h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mt-0.5">
          Chapter {currentChapter} · {currentTranslation.toUpperCase()}
        </p>
      </div>

      {/* Verses — 2 column Bible layout with top padding for popover room */}
      <div className={`columns-2 gap-8 pt-16 ${fontSerif ? 'font-serif' : 'font-sans'} ${FONT_SIZE_CLASS[fontSize]} leading-relaxed`}>
        {chapter.verses.map(v => {
          const isSelected = selectedVerse === v.verse;
          const storyContextText = chapter.verses
            .filter(cv => Math.abs(cv.verse - v.verse) <= 2)
            .map(cv => cv.text)
            .join(' ');
          return (
            <span
              key={v.verse}
              onClick={() => setSelectedVerse(isSelected ? null : v.verse)}
              className={`relative inline cursor-pointer rounded-sm transition-colors
                ${isSelected
                  ? 'bg-amber-200/70 dark:bg-amber-700/30 ring-1 ring-amber-400 dark:ring-amber-600'
                  : 'hover:bg-parchment-100 dark:hover:bg-gray-900/50'
                }`}
            >
              <sup className="text-[10px] font-sans font-bold text-amber-700 dark:text-amber-400 align-super mr-0.5 select-none">{v.verse}</sup>
              <span className="text-gray-800 dark:text-gray-200">{renderVerseText(v.text, v.verse, storyContextText)}</span>
              {/* Action bar appears when verse is selected */}
              {isSelected && (
                <span
                  className="absolute left-0 -top-7 flex items-center gap-1 bg-white dark:bg-gray-800 shadow-lg border border-parchment-200 dark:border-gray-700 rounded-lg px-1.5 py-0.5 z-20"
                  onClick={e => e.stopPropagation()}
                >
                  <BookmarkButton
                    bookName={currentBook}
                    chapter={currentChapter}
                    verse={v.verse}
                    text={v.text}
                  />
                  <CopyButton
                    text={`${currentBook} ${currentChapter}:${v.verse} — ${v.text}`}
                    label="Copy verse"
                  />
                  <span className="text-[10px] text-gray-400 dark:text-gray-500 pl-1 select-none">
                    {currentBook} {currentChapter}:{v.verse}
                  </span>
                </span>
              )}{' '}
            </span>
          );
        })}
      </div>

      {/* Chapter navigation */}
      <div className="flex items-center justify-between mt-6 pt-4 border-t border-parchment-200 dark:border-gray-800">
        <button
          onClick={prevChapter}
          disabled={currentBook === 'Genesis' && currentChapter === 1}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
            bg-parchment-100 dark:bg-gray-800 hover:bg-parchment-200 dark:hover:bg-gray-700
            disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Previous
        </button>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {currentChapter} / {totalChapters}
        </span>
        <button
          onClick={nextChapter}
          disabled={currentBook === 'Revelation' && currentChapter === totalChapters}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
            bg-parchment-100 dark:bg-gray-800 hover:bg-parchment-200 dark:hover:bg-gray-700
            disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          Next
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}
