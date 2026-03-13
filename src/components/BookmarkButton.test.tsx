import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BookmarkButton } from './BookmarkButton';
import { BookmarkProvider } from '../context/BookmarkContext';

function renderBookmarkButton(props = {
  bookName: 'Genesis',
  chapter: 1,
  verse: 1,
  text: 'In the beginning God created the heavens and the earth.',
}) {
  return render(
    <BookmarkProvider>
      <BookmarkButton {...props} />
    </BookmarkProvider>
  );
}

describe('BookmarkButton', () => {
  let store: Record<string, string>;

  beforeEach(() => {
    store = {};
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation((key) => store[key] ?? null);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation((key, val) => { store[key] = val; });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders with "Bookmark this verse" label when not bookmarked', () => {
    renderBookmarkButton();
    expect(screen.getByLabelText('Bookmark this verse')).toBeInTheDocument();
  });

  it('renders with "Remove bookmark" label when already bookmarked', () => {
    store['verseapp-bookmarks'] = JSON.stringify([
      { id: 'Genesis-1-1', bookName: 'Genesis', chapter: 1, verse: 1, text: 'In the beginning', createdAt: 1000 },
    ]);
    renderBookmarkButton();
    expect(screen.getByLabelText('Remove bookmark')).toBeInTheDocument();
  });

  it('toggles bookmark on click', async () => {
    const user = userEvent.setup();
    renderBookmarkButton();
    const btn = screen.getByLabelText('Bookmark this verse');
    await user.click(btn);
    expect(screen.getByLabelText('Remove bookmark')).toBeInTheDocument();
  });

  it('removes bookmark on second click', async () => {
    const user = userEvent.setup();
    renderBookmarkButton();
    const btn = screen.getByLabelText('Bookmark this verse');
    await user.click(btn);
    expect(screen.getByLabelText('Remove bookmark')).toBeInTheDocument();
    await user.click(screen.getByLabelText('Remove bookmark'));
    expect(screen.getByLabelText('Bookmark this verse')).toBeInTheDocument();
  });
});
