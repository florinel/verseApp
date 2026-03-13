import { useState } from 'react';
import { useBible } from '../context/BibleContext';
import { BIBLE_BOOKS } from '../bibleBooks';

export function BookSelector() {
  const { currentBook, setBook } = useBible();
  const [otOpen, setOtOpen] = useState(true);
  const [ntOpen, setNtOpen] = useState(true);

  const otBooks = BIBLE_BOOKS.filter(b => b.testament === 'OT');
  const ntBooks = BIBLE_BOOKS.filter(b => b.testament === 'NT');

  const currentTestament = BIBLE_BOOKS.find(b => b.name === currentBook)?.testament;

  // Auto-expand the testament containing the current book
  const effectiveOtOpen = otOpen || currentTestament === 'OT';
  const effectiveNtOpen = ntOpen || currentTestament === 'NT';

  return (
    <div className="space-y-1">
      {/* Old Testament */}
      <div>
        <button
          onClick={() => setOtOpen(!otOpen)}
          className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold uppercase tracking-wider
            text-gray-500 dark:text-gray-400 hover:bg-parchment-100 dark:hover:bg-gray-900/50 transition-colors"
        >
          <span>Old Testament</span>
          <svg
            className={`w-3.5 h-3.5 transition-transform ${effectiveOtOpen ? 'rotate-90' : ''}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
        {effectiveOtOpen && (
          <div className="space-y-0.5 pb-1">
            {otBooks.map(book => (
              <button
                key={book.name}
                onClick={() => setBook(book.name)}
                className={`sidebar-btn ${currentBook === book.name ? 'sidebar-btn-active' : ''}`}
              >
                <span className="truncate">{book.name}</span>
                <span className="ml-auto text-xs text-gray-400 dark:text-gray-500">{book.chapters}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* New Testament */}
      <div>
        <button
          onClick={() => setNtOpen(!ntOpen)}
          className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold uppercase tracking-wider
            text-gray-500 dark:text-gray-400 hover:bg-parchment-100 dark:hover:bg-gray-900/50 transition-colors"
        >
          <span>New Testament</span>
          <svg
            className={`w-3.5 h-3.5 transition-transform ${effectiveNtOpen ? 'rotate-90' : ''}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
        {effectiveNtOpen && (
          <div className="space-y-0.5 pb-1">
            {ntBooks.map(book => (
              <button
                key={book.name}
                onClick={() => setBook(book.name)}
                className={`sidebar-btn ${currentBook === book.name ? 'sidebar-btn-active' : ''}`}
              >
                <span className="truncate">{book.name}</span>
                <span className="ml-auto text-xs text-gray-400 dark:text-gray-500">{book.chapters}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
