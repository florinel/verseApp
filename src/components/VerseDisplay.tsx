import { useMemo, useCallback, Fragment, ReactNode } from 'react';
import { useBible } from '../context/BibleContext';
import { useTheme } from '../context/ThemeContext';
import { useBibleData } from '../hooks/useBibleData';
import { useDictionary } from '../hooks/useDictionary';
import { BookmarkButton } from './BookmarkButton';
import { CopyButton } from './CopyButton';
import { DictionaryPopover } from './DictionaryPopover';

export function VerseDisplay() {
  const { currentBook, currentChapter, currentTranslation, nextChapter, prevChapter, totalChapters } = useBible();
  const { fontSerif } = useTheme();
  const { data, loading, error } = useBibleData(currentBook, currentTranslation);
  const { entries, isKnownTerm, lookup } = useDictionary();

  const chapter = data?.chapters.find(c => c.chapter === currentChapter);

  // Build a regex from all dictionary terms for highlighting
  const termRegex = useMemo(() => {
    if (!entries.length) return null;
    const escaped = entries.map(e => e.term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    return new RegExp(`\\b(${escaped.join('|')})\\b`, 'gi');
  }, [entries]);

  const renderVerseText = useCallback((text: string): ReactNode => {
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
      const entry = lookup(part.text);
      if (!entry) return <Fragment key={i}>{part.text}</Fragment>;
      return (
        <DictionaryPopover key={i} entry={entry}>
          {part.text}
        </DictionaryPopover>
      );
    });
  }, [termRegex, lookup, isKnownTerm]);

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

      {/* Verses — 2 column Bible layout */}
      <div className={`columns-2 gap-8 ${fontSerif ? 'font-serif' : 'font-sans'} text-sm leading-relaxed`}>
        {chapter.verses.map(v => (
          <div
            key={v.verse}
            className="group relative inline py-0 break-inside-avoid-column"
          >
            <span className="hover:bg-parchment-100 dark:hover:bg-gray-900/50 rounded transition-colors">
              <sup className="text-[10px] font-sans font-bold text-amber-700 dark:text-amber-400 align-super mr-0.5 select-none">{v.verse}</sup>
              <span className="text-gray-800 dark:text-gray-200">{renderVerseText(v.text)}</span>
            </span>
            {/* Actions (visible on hover) */}
            <span className="absolute right-0 -top-1 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 z-10">
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
            </span>{' '}
          </div>
        ))}
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
