# 📖 VerseApp

A modern Bible study application built with React 19 and TypeScript. Read scripture, search with precision, explore a built-in dictionary of people, places, events, and topics, and bookmark your favorite verses — all in a clean, responsive interface with dark mode support.

## Features

- **Bible Reading** — Two-column verse layout with chapter navigation across all 66 books (NASB translation)
- **Smart Search** — Whole-word matching (searching "grace" won't match "disgraceful"), with results split into a two-panel view: search results on the left, details on the right
- **Dictionary** — Browse 4 categories (people, places, events, topics) with inline term highlighting in the reading view and popover definitions on hover/click
- **Cross-Reference Linking** — Dictionary entries with "See X" references are clickable, navigating directly to the search view for the referenced term
- **Bookmarks** — Save and manage favorite verses with one-click bookmarking
- **Copy Verses** — Copy any verse with its reference to clipboard
- **Settings** — Configurable font family (serif/sans-serif), font size (5 levels), and dark/light theme
- **Dark Mode** — Automatic detection of system preference with manual toggle
- **Keyboard Friendly** — Press Enter to search, debounced input for responsive filtering
- **Well-Tested Core** — Component, context, and hook coverage across reading, search, dictionary, bookmarks, and settings flows

## Tech Stack

| Layer | Technology |
|-------|-----------|
| UI | React 19, TypeScript 5.7 |
| Bundler | Vite 6 |
| Styling | TailwindCSS 3 |
| Testing | Vitest 4, React Testing Library, jsdom |
| Data | Static JSON (Bible text, dictionaries) |

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test

# Build for production
npm run build

# Preview production build
npm run preview
```

## Project Structure

```
src/
├── components/         UI components
│   ├── AppLayout       Main shell: sidebar, header, content area
│   ├── VerseDisplay    Two-column Bible reading view with dictionary highlighting
│   ├── SearchPanel     Search bar + two-panel results/detail view
│   ├── BookSelector    Book picker in sidebar
│   ├── ChapterSelector Chapter navigation strip
│   ├── DictionaryBrowser  Sidebar dictionary with category tabs
│   ├── DictionaryPopover  Hover/click popover with cross-reference links
│   ├── BookmarksPanel  Saved bookmarks list
│   ├── BookmarkButton  Per-verse bookmark toggle
│   ├── CopyButton      Copy verse to clipboard
│   └── SettingsPanel   Theme, font, and size settings modal
├── context/            React Context providers
│   ├── BibleContext    Book/chapter navigation, view mode, translation
│   ├── SearchContext   Search state, keyword + reference parsing
│   ├── BookmarkContext Bookmark CRUD with localStorage persistence
│   └── ThemeContext    Dark mode, font family, font size
├── hooks/              Custom hooks
│   ├── useBibleData   Fetch and cache book JSON data
│   ├── useDictionary  Load, search, and lookup dictionary entries
│   └── useSearch      Search logic (standalone hook version)
├── types/              TypeScript interfaces (Verse, Chapter, BookData, etc.)
└── test/               Test setup and utilities

public/data/
├── bible/nasb/         66 JSON files, one per book
└── dictionaries/       4 JSON files: people, places, events, topics

scripts/
├── generate-bible-data.mjs       Generate Bible JSON from source data
└── generate-dictionary-data.mjs  Generate dictionary JSON from CSV sources
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server with HMR |
| `npm run build` | Type-check and build for production |
| `npm run preview` | Serve production build locally |
| `npm test` | Run tests in watch mode |
| `npm run test:run` | Run tests once |
| `npm run changelog:watch` | Watch repository changes and append changelog entries |
| `npm run changelog:scan` | Run a one-time changelog scan |
| `npm run changelog:status` | Show changelog watcher status |
| `npm run changelog:stop` | Stop the changelog watcher |

## Testing Notes

```bash
# Run one test file
npm run test:run -- src/context/ThemeContext.test.tsx

# Run one test by name
npm run test:run -- src/context/ThemeContext.test.tsx -t "throws when useTheme is used outside ThemeProvider"
```

Use `npm test` during active development for watch mode and faster feedback.

## Data

Bible text is stored as static JSON files under `public/data/bible/nasb/`, one file per book. Dictionary entries (people, places, events, topics) are in `public/data/dictionaries/`. Both can be regenerated using the scripts in `scripts/`.

## License

MIT
