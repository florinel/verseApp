import { useState } from 'react';
import { useBible } from '../context/BibleContext';
import { useTheme } from '../context/ThemeContext';
import { BookSelector } from './BookSelector';
import { ChapterSelector } from './ChapterSelector';
import { VerseDisplay } from './VerseDisplay';
import { SearchBar, SearchResults } from './SearchPanel';
import { BookmarksPanel } from './BookmarksPanel';
import { DictionaryBrowser } from './DictionaryBrowser';
import { ViewMode } from '../types/bible';

const NAV_ITEMS: { mode: ViewMode; label: string; icon: React.ReactNode }[] = [
  {
    mode: 'read',
    label: 'Read',
    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>,
  },
  {
    mode: 'search',
    label: 'Search',
    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>,
  },
  {
    mode: 'bookmarks',
    label: 'Bookmarks',
    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg>,
  },
  {
    mode: 'dictionary',
    label: 'Dictionary',
    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>,
  },
];

export function AppLayout() {
  const { viewMode, setViewMode } = useBible();
  const { dark, toggle, fontSerif, toggleFont } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside
        className={`flex-shrink-0 border-r border-parchment-200 dark:border-gray-800
          bg-parchment-50 dark:bg-gray-950 transition-all duration-300 overflow-hidden
          ${sidebarOpen ? 'w-64' : 'w-0'}`}
      >
        <div className="w-64 h-full flex flex-col">
          {/* Logo */}
          <div className="px-4 py-3 border-b border-parchment-200 dark:border-gray-800 flex items-center gap-2">
            <span className="text-xl">📖</span>
            <h1 className="text-lg font-bold text-gray-800 dark:text-gray-100">VerseApp</h1>
          </div>

          {/* Nav tabs */}
          <div className="flex border-b border-parchment-200 dark:border-gray-800">
            {NAV_ITEMS.map(item => (
              <button
                key={item.mode}
                onClick={() => setViewMode(item.mode)}
                className={`flex-1 flex flex-col items-center gap-0.5 py-2 text-xs transition-colors
                  ${viewMode === item.mode
                    ? 'text-amber-700 dark:text-amber-400 border-b-2 border-amber-500'
                    : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400'}`}
                title={item.label}
              >
                {item.icon}
              </button>
            ))}
          </div>

          {/* Sidebar content based on mode */}
          <div className="flex-1 overflow-y-auto">
            {(viewMode === 'read' || viewMode === 'bookmarks') && <BookSelector />}
            {viewMode === 'search' && (
              <div className="p-3 space-y-3">
                <SearchBar />
                <SearchResults />
              </div>
            )}
            {viewMode === 'bookmarks' && <BookmarksPanel />}
            {viewMode === 'dictionary' && <DictionaryBrowser />}
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex items-center justify-between px-4 py-2 border-b border-parchment-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-lg hover:bg-parchment-100 dark:hover:bg-gray-800 transition-colors"
              aria-label="Toggle sidebar"
            >
              <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
              {NAV_ITEMS.find(n => n.mode === viewMode)?.label}
            </span>
          </div>
          <div className="flex items-center gap-1">
            {/* Font toggle */}
            <button
              onClick={toggleFont}
              className="p-2 rounded-lg hover:bg-parchment-100 dark:hover:bg-gray-800 transition-colors text-sm"
              title={fontSerif ? 'Switch to sans-serif' : 'Switch to serif'}
              aria-label="Toggle font"
            >
              <span className={`text-gray-600 dark:text-gray-400 ${fontSerif ? 'font-serif' : 'font-sans'}`}>Aa</span>
            </button>
            {/* Dark mode toggle */}
            <button
              onClick={toggle}
              className="p-2 rounded-lg hover:bg-parchment-100 dark:hover:bg-gray-800 transition-colors"
              title={dark ? 'Light mode' : 'Dark mode'}
              aria-label="Toggle dark mode"
            >
              {dark ? (
                <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                </svg>
              )}
            </button>
          </div>
        </header>

        {/* Chapter selector strip — always visible in read/bookmarks mode */}
        {(viewMode === 'read' || viewMode === 'bookmarks') && <ChapterSelector />}

        {/* Content area */}
        <div className="flex-1 overflow-y-auto p-4">
          {(viewMode === 'read' || viewMode === 'search' || viewMode === 'bookmarks') && <VerseDisplay />}
          {viewMode === 'dictionary' && (
            <div className="max-w-3xl mx-auto text-center py-12">
              <p className="text-gray-400 dark:text-gray-500">
                Browse the dictionary in the sidebar, or click on highlighted terms in the reading view.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
