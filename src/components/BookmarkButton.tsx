import { useBookmarks } from '../context/BookmarkContext';

export function BookmarkButton({ bookName, chapter, verse, text }: {
  bookName: string;
  chapter: number;
  verse: number;
  text: string;
}) {
  const { isBookmarked, toggleBookmark } = useBookmarks();
  const marked = isBookmarked(bookName, chapter, verse);

  return (
    <button
      onClick={() => toggleBookmark(bookName, chapter, verse, text)}
      className="p-1 rounded hover:bg-parchment-200 dark:hover:bg-gray-700 transition-colors"
      title={marked ? 'Remove bookmark' : 'Bookmark this verse'}
      aria-label={marked ? 'Remove bookmark' : 'Bookmark this verse'}
    >
      {marked ? (
        <svg className="w-4 h-4 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
          <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
        </svg>
      ) : (
        <svg className="w-4 h-4 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 20 20">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
        </svg>
      )}
    </button>
  );
}
