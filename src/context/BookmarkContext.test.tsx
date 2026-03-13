import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BookmarkProvider, useBookmarks } from './BookmarkContext';

function BookmarkConsumer() {
  const { bookmarks, isBookmarked, toggleBookmark, removeBookmark, clearAll } = useBookmarks();
  return (
    <div>
      <span data-testid="count">{bookmarks.length}</span>
      <span data-testid="is-gen-1-1">{String(isBookmarked('Genesis', 1, 1))}</span>
      <button onClick={() => toggleBookmark('Genesis', 1, 1, 'In the beginning')}>toggle-gen-1-1</button>
      <button onClick={() => toggleBookmark('John', 3, 16, 'For God so loved')}>toggle-john-3-16</button>
      <button onClick={() => removeBookmark('Genesis-1-1')}>remove-gen-1-1</button>
      <button onClick={clearAll}>clear-all</button>
      <ul>
        {bookmarks.map(b => (
          <li key={b.id} data-testid={`bm-${b.id}`}>{b.bookName} {b.chapter}:{b.verse}</li>
        ))}
      </ul>
    </div>
  );
}

describe('BookmarkContext', () => {
  let store: Record<string, string>;

  beforeEach(() => {
    store = {};
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation((key) => store[key] ?? null);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation((key, val) => { store[key] = val; });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('starts with no bookmarks', () => {
    render(
      <BookmarkProvider><BookmarkConsumer /></BookmarkProvider>
    );
    expect(screen.getByTestId('count')).toHaveTextContent('0');
    expect(screen.getByTestId('is-gen-1-1')).toHaveTextContent('false');
  });

  it('loads bookmarks from localStorage', () => {
    store['verseapp-bookmarks'] = JSON.stringify([
      { id: 'Genesis-1-1', bookName: 'Genesis', chapter: 1, verse: 1, text: 'In the beginning', createdAt: 1000 },
    ]);
    render(
      <BookmarkProvider><BookmarkConsumer /></BookmarkProvider>
    );
    expect(screen.getByTestId('count')).toHaveTextContent('1');
    expect(screen.getByTestId('is-gen-1-1')).toHaveTextContent('true');
  });

  it('toggleBookmark adds a new bookmark', async () => {
    const user = userEvent.setup();
    render(
      <BookmarkProvider><BookmarkConsumer /></BookmarkProvider>
    );
    await user.click(screen.getByText('toggle-gen-1-1'));
    expect(screen.getByTestId('count')).toHaveTextContent('1');
    expect(screen.getByTestId('is-gen-1-1')).toHaveTextContent('true');
    expect(screen.getByTestId('bm-Genesis-1-1')).toHaveTextContent('Genesis 1:1');
  });

  it('toggleBookmark removes an existing bookmark', async () => {
    const user = userEvent.setup();
    render(
      <BookmarkProvider><BookmarkConsumer /></BookmarkProvider>
    );
    await user.click(screen.getByText('toggle-gen-1-1'));
    expect(screen.getByTestId('count')).toHaveTextContent('1');
    await user.click(screen.getByText('toggle-gen-1-1'));
    expect(screen.getByTestId('count')).toHaveTextContent('0');
    expect(screen.getByTestId('is-gen-1-1')).toHaveTextContent('false');
  });

  it('removeBookmark removes by id', async () => {
    const user = userEvent.setup();
    render(
      <BookmarkProvider><BookmarkConsumer /></BookmarkProvider>
    );
    await user.click(screen.getByText('toggle-gen-1-1'));
    await user.click(screen.getByText('toggle-john-3-16'));
    expect(screen.getByTestId('count')).toHaveTextContent('2');
    await user.click(screen.getByText('remove-gen-1-1'));
    expect(screen.getByTestId('count')).toHaveTextContent('1');
    expect(screen.getByTestId('is-gen-1-1')).toHaveTextContent('false');
  });

  it('clearAll removes all bookmarks', async () => {
    const user = userEvent.setup();
    render(
      <BookmarkProvider><BookmarkConsumer /></BookmarkProvider>
    );
    await user.click(screen.getByText('toggle-gen-1-1'));
    await user.click(screen.getByText('toggle-john-3-16'));
    expect(screen.getByTestId('count')).toHaveTextContent('2');
    await user.click(screen.getByText('clear-all'));
    expect(screen.getByTestId('count')).toHaveTextContent('0');
  });

  it('persists bookmarks to localStorage', async () => {
    const user = userEvent.setup();
    render(
      <BookmarkProvider><BookmarkConsumer /></BookmarkProvider>
    );
    await user.click(screen.getByText('toggle-gen-1-1'));
    const saved = JSON.parse(store['verseapp-bookmarks']);
    expect(saved).toHaveLength(1);
    expect(saved[0].bookName).toBe('Genesis');
  });

  it('throws when useBookmarks is used outside BookmarkProvider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<BookmarkConsumer />)).toThrow('useBookmarks must be inside BookmarkProvider');
    spy.mockRestore();
  });
});
