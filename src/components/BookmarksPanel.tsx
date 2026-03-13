import { useBookmarks } from '../context/BookmarkContext';
import { useBible } from '../context/BibleContext';

export function BookmarksPanel() {
  const { bookmarks, removeBookmark, clearAll } = useBookmarks();
  const { navigateTo, setViewMode } = useBible();

  const handleClick = (bookName: string, chapter: number) => {
    navigateTo(bookName, chapter);
    setViewMode('read');
  };

  if (bookmarks.length === 0) {
    return (
      <div className="text-center py-8">
        <svg className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
        </svg>
        <p className="text-gray-400 dark:text-gray-500 text-sm">No bookmarks yet</p>
        <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">Hover over a verse and click the bookmark icon</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between px-3 py-2">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {bookmarks.length} bookmark{bookmarks.length !== 1 ? 's' : ''}
        </p>
        <button
          onClick={clearAll}
          className="text-xs text-red-500 hover:text-red-600 dark:hover:text-red-400"
        >
          Clear all
        </button>
      </div>
      <div className="space-y-1 max-h-[calc(100vh-200px)] overflow-y-auto">
        {bookmarks.sort((a, b) => b.createdAt - a.createdAt).map(bm => (
          <div
            key={bm.id}
            className="group flex items-start gap-2 px-3 py-2.5 rounded-lg hover:bg-parchment-100 dark:hover:bg-gray-800 transition-colors"
          >
            <button
              onClick={() => handleClick(bm.bookName, bm.chapter)}
              className="flex-1 text-left min-w-0"
            >
              <div className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-0.5">
                {bm.bookName} {bm.chapter}:{bm.verse}
              </div>
              <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed line-clamp-2">
                {bm.text}
              </div>
            </button>
            <button
              onClick={() => removeBookmark(bm.id)}
              className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-all"
              title="Remove bookmark"
              aria-label="Remove bookmark"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
