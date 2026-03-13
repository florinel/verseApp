import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BookmarksPanel } from './BookmarksPanel';
import { BookmarkProvider } from '../context/BookmarkContext';
import { BibleProvider } from '../context/BibleContext';
import { ThemeProvider } from '../context/ThemeContext';
import { SearchProvider } from '../context/SearchContext';

function renderBookmarksPanel() {
  return render(
    <ThemeProvider>
      <BibleProvider>
        <BookmarkProvider>
          <SearchProvider>
            <BookmarksPanel />
          </SearchProvider>
        </BookmarkProvider>
      </BibleProvider>
    </ThemeProvider>
  );
}

describe('BookmarksPanel', () => {
  let store: Record<string, string>;

  beforeEach(() => {
    store = {};
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation((key) => store[key] ?? null);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation((key, val) => { store[key] = val; });
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false, media: query, onchange: null,
        addListener: vi.fn(), removeListener: vi.fn(),
        addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn(),
      })),
    });
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows empty state when no bookmarks', () => {
    renderBookmarksPanel();
    expect(screen.getByText('No bookmarks yet')).toBeInTheDocument();
    expect(screen.getByText(/Hover over a verse/)).toBeInTheDocument();
  });

  it('displays bookmarks when present', () => {
    store['verseapp-bookmarks'] = JSON.stringify([
      { id: 'Genesis-1-1', bookName: 'Genesis', chapter: 1, verse: 1, text: 'In the beginning', createdAt: 1000 },
      { id: 'John-3-16', bookName: 'John', chapter: 3, verse: 16, text: 'For God so loved', createdAt: 2000 },
    ]);
    renderBookmarksPanel();
    expect(screen.getByText('2 bookmarks')).toBeInTheDocument();
    expect(screen.getByText('Genesis 1:1')).toBeInTheDocument();
    expect(screen.getByText('John 3:16')).toBeInTheDocument();
  });

  it('displays singular "bookmark" for one item', () => {
    store['verseapp-bookmarks'] = JSON.stringify([
      { id: 'Genesis-1-1', bookName: 'Genesis', chapter: 1, verse: 1, text: 'In the beginning', createdAt: 1000 },
    ]);
    renderBookmarksPanel();
    expect(screen.getByText('1 bookmark')).toBeInTheDocument();
  });

  it('shows Clear all button', () => {
    store['verseapp-bookmarks'] = JSON.stringify([
      { id: 'Genesis-1-1', bookName: 'Genesis', chapter: 1, verse: 1, text: 'In the beginning', createdAt: 1000 },
    ]);
    renderBookmarksPanel();
    expect(screen.getByText('Clear all')).toBeInTheDocument();
  });

  it('Clear all removes all bookmarks', async () => {
    const user = userEvent.setup();
    store['verseapp-bookmarks'] = JSON.stringify([
      { id: 'Genesis-1-1', bookName: 'Genesis', chapter: 1, verse: 1, text: 'In the beginning', createdAt: 1000 },
    ]);
    renderBookmarksPanel();
    await user.click(screen.getByText('Clear all'));
    expect(screen.getByText('No bookmarks yet')).toBeInTheDocument();
  });

  it('remove button removes individual bookmark', async () => {
    const user = userEvent.setup();
    store['verseapp-bookmarks'] = JSON.stringify([
      { id: 'Genesis-1-1', bookName: 'Genesis', chapter: 1, verse: 1, text: 'In the beginning', createdAt: 1000 },
      { id: 'John-3-16', bookName: 'John', chapter: 3, verse: 16, text: 'For God so loved', createdAt: 2000 },
    ]);
    renderBookmarksPanel();
    const removeButtons = screen.getAllByLabelText('Remove bookmark');
    await user.click(removeButtons[0]);
    expect(screen.getByText('1 bookmark')).toBeInTheDocument();
  });

  it('displays verse text preview', () => {
    store['verseapp-bookmarks'] = JSON.stringify([
      { id: 'Genesis-1-1', bookName: 'Genesis', chapter: 1, verse: 1, text: 'In the beginning God created', createdAt: 1000 },
    ]);
    renderBookmarksPanel();
    expect(screen.getByText('In the beginning God created')).toBeInTheDocument();
  });
});
