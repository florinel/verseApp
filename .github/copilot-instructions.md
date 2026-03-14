# Copilot Instructions for VerseApp

## Commands

- Install dependencies: `npm install`
- Start the Vite dev server: `npm run dev`
- Build for production: `npm run build`
- Preview the production build: `npm run preview`
- Run the full test suite once: `npm run test:run`
- Run tests in watch mode: `npm test`
- Run a single test file: `npm run test:run -- src/context/ThemeContext.test.tsx`
- Run a single test by name: `npm run test:run -- src/context/ThemeContext.test.tsx -t "throws when useTheme is used outside ThemeProvider"`
- Start the automatic changelog watcher: `npm run changelog:watch`
- Run a one-time changelog sync: `npm run changelog:scan`
- Check watcher status: `npm run changelog:status`
- Stop the watcher: `npm run changelog:stop`

`npm run build` currently fails in the baseline repository because `tsc -b` also type-checks `*.test.ts(x)` files, and several existing tests have TypeScript errors. Treat that as existing repo state unless you are explicitly fixing test typing.

## Architecture

VerseApp is a client-only React 19 + Vite app with no router and no backend. `src/main.tsx` renders `src/App.tsx`, which composes the app through a fixed provider stack:

`ThemeProvider` → `BibleProvider` → `BookmarkProvider` → `SearchProvider` → `AppLayout`

`AppLayout` is the UI shell. It reads `viewMode` from `BibleContext` and switches the app between four modes: `read`, `search`, `bookmarks`, and `dictionary`. The sidebar changes with the mode, while the main panel renders `VerseDisplay`, `SearchResultsView`, bookmark content, or dictionary guidance from the same shared state.

The app’s content comes from static JSON under `public/data/`, not from runtime APIs. Bible text is loaded from `/data/bible/{translation}/{book-file}.json`; dictionary data is loaded from `/data/dictionaries/{people|places|events|topics}.json`. The source metadata for books lives in `src/bibleBooks.ts`, and `bookFileName()` is the canonical way to convert a book name like `1 Samuel` into the kebab-case filename used in fetch paths.

The main cross-cutting responsibilities are split by context/hook:

- `src/context/BibleContext.tsx` owns current book/chapter/translation and the app-wide `viewMode`. `navigateTo()` always switches back to `read`.
- `src/context/SearchContext.tsx` handles both reference parsing (`John 3:16`) and keyword search. Reference searches fetch a single chapter; keyword searches scan all books and also search dictionary entries.
- `src/hooks/useBibleData.ts` caches fetched book JSON in a module-level `Map`, keyed by `translation/bookName`.
- `src/hooks/useDictionary.ts` loads all four dictionary files once per page load and keeps a module-level cache/shared lookup helpers.
- `src/context/ThemeContext.tsx` persists dark mode, font family, and font size in `localStorage` and toggles the `dark` class on `document.documentElement`.
- `src/context/BookmarkContext.tsx` persists bookmarks in `localStorage`.

`VerseDisplay` is where the reading experience is assembled: it combines `BibleContext`, `ThemeContext`, `useBibleData()`, `useDictionary()`, and `SearchContext` so verse text can be rendered in two columns, dictionary terms can be highlighted inline, and verse actions can open bookmark/copy controls.

## Conventions

- Keep provider order consistent with `App.tsx` and `src/test/renderWithProviders.tsx`. Components that call multiple context hooks usually assume the full stack is present.
- Reuse the existing context hooks (`useBible`, `useSearch`, `useTheme`, `useBookmarks`) instead of prop-drilling shared app state.
- Context hooks are expected to throw immediately when used outside their provider. Preserve those guard errors when refactoring.
- Use `bookFileName()` from `src/bibleBooks.ts` for any Bible data path construction rather than re-implementing slug logic.
- Search behavior is intentionally split: exact Bible references produce a `refMatch`, while keyword search uses whole-word regex matching across verse text and separate substring matching across dictionary entries.
- Dictionary term highlighting in `VerseDisplay` depends on the shared dictionary cache from `useDictionary()`. If you change dictionary term matching, check both inline popovers and search results.
- Bookmark IDs are deterministic (`${bookName}-${chapter}-${verse}`), and bookmark/theme preferences use the existing `localStorage` keys already defined in their contexts.
- Most component tests should use `renderWithProviders()` from `src/test/renderWithProviders.tsx` so the full provider stack is available. Provider-specific tests usually render the provider directly with a tiny consumer component.
- Vitest runs in `jsdom` with globals enabled and `@testing-library/jest-dom/vitest` loaded from `src/test/setup.ts`, so tests usually omit explicit `vitest` imports for `describe`/`it`/`expect`.
- Static content is part of the application contract. If you change the structure of `public/data/bible` or `public/data/dictionaries`, update the fetching hooks/contexts together with any generator scripts in `scripts/`.
- `changelog.md` is maintained by `scripts/changelog-agent.mjs`, which appends file-level Added/Changed/Removed entries with generated summaries and, when available, the last commit message touching that path. If you change changelog automation, preserve the local runtime state files under `.git/` and avoid creating watcher feedback loops by keeping `changelog.md` itself excluded from scans.
