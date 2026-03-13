import { useBible } from '../context/BibleContext';

export function ChapterSelector() {
  const { currentBook, currentChapter, setChapter, totalChapters } = useBible();
  const chapters = Array.from({ length: totalChapters }, (_, i) => i + 1);

  return (
    <div className="border-b border-parchment-200 dark:border-gray-800 bg-white/60 dark:bg-gray-900/60">
      <div className="px-4 py-2 flex items-center gap-3">
        <span className="text-sm font-semibold text-gray-700 dark:text-gray-200 whitespace-nowrap">
          {currentBook}
        </span>
        <div className="flex-1 flex gap-1 overflow-x-auto py-1 scrollbar-thin">
          {chapters.map(ch => (
            <button
              key={ch}
              onClick={() => setChapter(ch)}
              className={`flex-shrink-0 w-8 h-7 rounded text-xs font-medium transition-colors
                ${currentChapter === ch
                  ? 'bg-amber-600 text-white dark:bg-amber-700'
                  : 'bg-parchment-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-parchment-200 dark:hover:bg-gray-700'
                }`}
            >
              {ch}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
