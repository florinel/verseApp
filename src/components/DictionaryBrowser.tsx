import { useState } from 'react';
import { useDictionary } from '../hooks/useDictionary';
import { DictionaryEntry } from '../types/bible';

const CATEGORY_LABELS: Record<DictionaryEntry['category'], string> = {
  person: 'People',
  place: 'Places',
  event: 'Events',
  topic: 'Topics',
};

const CATEGORY_ICONS: Record<DictionaryEntry['category'], string> = {
  person: '👤',
  place: '📍',
  event: '📅',
  topic: '📖',
};

export function DictionaryBrowser() {
  const { entries, loading, searchEntries, getByCategory } = useDictionary();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<DictionaryEntry['category'] | 'all'>('all');
  const [selectedEntry, setSelectedEntry] = useState<DictionaryEntry | null>(null);

  if (loading) {
    return (
      <div className="text-center py-8 text-gray-400 dark:text-gray-500">
        Loading dictionary...
      </div>
    );
  }

  const filtered = search
    ? searchEntries(search)
    : selectedCategory === 'all'
      ? entries
      : getByCategory(selectedCategory);

  return (
    <div className="h-full flex flex-col">
      {/* Search */}
      <div className="p-3 border-b border-parchment-200 dark:border-gray-800">
        <input
          type="text"
          value={search}
          onChange={e => { setSearch(e.target.value); setSelectedEntry(null); }}
          placeholder="Search dictionary..."
          className="w-full px-3 py-2 rounded-lg border border-parchment-300 dark:border-gray-700
            bg-white dark:bg-gray-900 text-sm
            focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
        />
      </div>

      {/* Category tabs */}
      {!search && (
        <div className="flex gap-1 p-2 border-b border-parchment-200 dark:border-gray-800 overflow-x-auto">
          <button
            onClick={() => { setSelectedCategory('all'); setSelectedEntry(null); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors
              ${selectedCategory === 'all'
                ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-400'
                : 'text-gray-500 hover:bg-parchment-100 dark:hover:bg-gray-800'}`}
          >
            All ({entries.length})
          </button>
          {(Object.keys(CATEGORY_LABELS) as DictionaryEntry['category'][]).map(cat => (
            <button
              key={cat}
              onClick={() => { setSelectedCategory(cat); setSelectedEntry(null); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors
                ${selectedCategory === cat
                  ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-400'
                  : 'text-gray-500 hover:bg-parchment-100 dark:hover:bg-gray-800'}`}
            >
              {CATEGORY_ICONS[cat]} {CATEGORY_LABELS[cat]} ({getByCategory(cat).length})
            </button>
          ))}
        </div>
      )}

      {/* Entry list / detail */}
      <div className="flex-1 overflow-y-auto">
        {selectedEntry ? (
          <div className="p-4">
            <button
              onClick={() => setSelectedEntry(null)}
              className="flex items-center gap-1 text-sm text-amber-700 dark:text-amber-400 mb-4 hover:underline"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to list
            </button>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">{CATEGORY_ICONS[selectedEntry.category]}</span>
              <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">{selectedEntry.term}</h3>
            </div>
            <span className="inline-block px-2 py-0.5 bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-400 text-xs rounded-full mb-3">
              {CATEGORY_LABELS[selectedEntry.category]}
            </span>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
              {selectedEntry.definition}
            </p>
            {selectedEntry.references.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2">References</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedEntry.references.map(ref => (
                    <span key={ref} className="px-2 py-1 bg-parchment-100 dark:bg-gray-800 rounded text-xs text-gray-600 dark:text-gray-400">
                      {ref}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="divide-y divide-parchment-100 dark:divide-gray-800">
            {filtered.length === 0 ? (
              <div className="text-center py-8 text-gray-400 dark:text-gray-500 text-sm">
                No entries found
              </div>
            ) : (
              filtered
                .sort((a, b) => a.term.localeCompare(b.term))
                .map(entry => (
                  <button
                    key={`${entry.category}-${entry.term}`}
                    onClick={() => setSelectedEntry(entry)}
                    className="w-full text-left px-4 py-3 hover:bg-parchment-50 dark:hover:bg-gray-800/50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{CATEGORY_ICONS[entry.category]}</span>
                      <span className="font-medium text-gray-800 dark:text-gray-200 text-sm">{entry.term}</span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1 pl-6">
                      {entry.definition}
                    </p>
                  </button>
                ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
