import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SearchProvider, useSearch } from './SearchContext';

function SearchConsumer() {
  const { results, dictResults, searching, query, refMatch, search, clear } = useSearch();
  return (
    <div>
      <span data-testid="query">{query}</span>
      <span data-testid="searching">{String(searching)}</span>
      <span data-testid="results-count">{results.length}</span>
      <span data-testid="dict-count">{dictResults.length}</span>
      <span data-testid="ref-match">{refMatch ? `${refMatch.bookName} ${refMatch.chapter}${refMatch.verse ? ':' + refMatch.verse : ''}` : 'none'}</span>
      <button onClick={() => search('love', 'nasb')}>search-love</button>
      <button onClick={() => search('John 3:16', 'nasb')}>search-ref</button>
      <button onClick={() => search('x')}>search-short</button>
      <button onClick={() => search('')}>search-empty</button>
      <button onClick={clear}>clear</button>
      <ul data-testid="results">
        {results.map((r, i) => (
          <li key={i}>{r.bookName} {r.chapter}:{r.verse}</li>
        ))}
      </ul>
    </div>
  );
}

/** Helper for testing a chapter-only reference "Genesis 1" */
function ChapterRefConsumer() {
  const { refMatch, results, search } = useSearch();
  return (
    <div>
      <span data-testid="cr-ref-match">
        {refMatch ? `${refMatch.bookName} ${refMatch.chapter}${refMatch.verse ? ':' + refMatch.verse : ''}` : 'none'}
      </span>
      <span data-testid="cr-results">{results.length}</span>
      <button onClick={() => search('Genesis 1', 'nasb')}>search-gen-1</button>
    </div>
  );
}

/** Helper for testing a reference via book abbreviation "Gen 1:1" */
function AbbrevRefConsumer() {
  const { refMatch, results, search } = useSearch();
  return (
    <div>
      <span data-testid="ab-ref-match">
        {refMatch ? `${refMatch.bookName} ${refMatch.chapter}${refMatch.verse ? ':' + refMatch.verse : ''}` : 'none'}
      </span>
      <span data-testid="ab-results">{results.length}</span>
      <button onClick={() => search('Gen 1:1', 'nasb')}>search-gen-abbrev</button>
    </div>
  );
}

describe('SearchContext', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('provides default values', () => {
    render(
      <SearchProvider><SearchConsumer /></SearchProvider>
    );
    expect(screen.getByTestId('query')).toHaveTextContent('');
    expect(screen.getByTestId('searching')).toHaveTextContent('false');
    expect(screen.getByTestId('results-count')).toHaveTextContent('0');
    expect(screen.getByTestId('dict-count')).toHaveTextContent('0');
    expect(screen.getByTestId('ref-match')).toHaveTextContent('none');
  });

  it('clear resets all state', async () => {
    const user = userEvent.setup();
    // Mock fetch to return valid data for reference search
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        chapters: [{ chapter: 3, verses: [{ verse: 16, text: 'For God so loved the world' }] }],
      }),
    });

    render(
      <SearchProvider><SearchConsumer /></SearchProvider>
    );
    await user.click(screen.getByText('search-ref'));
    await waitFor(() => {
      expect(screen.getByTestId('query')).toHaveTextContent('John 3:16');
    });
    await user.click(screen.getByText('clear'));
    expect(screen.getByTestId('query')).toHaveTextContent('');
    expect(screen.getByTestId('results-count')).toHaveTextContent('0');
    expect(screen.getByTestId('ref-match')).toHaveTextContent('none');
  });

  it('ignores queries shorter than 2 characters', async () => {
    const user = userEvent.setup();
    render(
      <SearchProvider><SearchConsumer /></SearchProvider>
    );
    await user.click(screen.getByText('search-short'));
    expect(screen.getByTestId('results-count')).toHaveTextContent('0');
    expect(screen.getByTestId('query')).toHaveTextContent('x');
  });

  it('ignores empty queries', async () => {
    const user = userEvent.setup();
    render(
      <SearchProvider><SearchConsumer /></SearchProvider>
    );
    await user.click(screen.getByText('search-empty'));
    expect(screen.getByTestId('results-count')).toHaveTextContent('0');
  });

  it('handles Bible reference search (John 3:16)', async () => {
    const user = userEvent.setup();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        chapters: [{ chapter: 3, verses: [{ verse: 16, text: 'For God so loved the world' }] }],
      }),
    });

    render(
      <SearchProvider><SearchConsumer /></SearchProvider>
    );
    await user.click(screen.getByText('search-ref'));

    await waitFor(() => {
      expect(screen.getByTestId('searching')).toHaveTextContent('false');
    });
    expect(screen.getByTestId('ref-match')).toHaveTextContent('John 3:16');
    expect(screen.getByTestId('results-count')).toHaveTextContent('1');
  });

  it('handles keyword search across books', async () => {
    const user = userEvent.setup();
    // Mock: dictionary returns empty, all books return verse matches for first 2 books, then nothing
    let callCount = 0;
    global.fetch = vi.fn().mockImplementation(() => {
      callCount++;
      // First 4 calls are dictionary category fetches
      if (callCount <= 4) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        });
      }
      // Book fetches — first one has a match
      if (callCount === 5) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            chapters: [{
              chapter: 1,
              verses: [
                { verse: 1, text: 'In the beginning God created the heavens and the earth.' },
                { verse: 2, text: 'The earth was love and void.' },
              ],
            }],
          }),
        });
      }
      // All other books: no matches
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          chapters: [{ chapter: 1, verses: [{ verse: 1, text: 'no match here' }] }],
        }),
      });
    });

    render(
      <SearchProvider><SearchConsumer /></SearchProvider>
    );
    await user.click(screen.getByText('search-love'));

    await waitFor(() => {
      expect(screen.getByTestId('searching')).toHaveTextContent('false');
    }, { timeout: 10000 });

    expect(screen.getByTestId('ref-match')).toHaveTextContent('none');
    expect(Number(screen.getByTestId('results-count').textContent)).toBeGreaterThanOrEqual(1);
  });

  it('throws when useSearch is used outside SearchProvider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<SearchConsumer />)).toThrow('useSearch must be used within SearchProvider');
    spy.mockRestore();
  });

  it('handles a chapter-only Bible reference (no verse)', async () => {
    const user = userEvent.setup();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        chapters: [{ chapter: 1, verses: [
          { verse: 1, text: 'In the beginning' },
          { verse: 2, text: 'The earth was formless' },
        ]}],
      }),
    });
    const { unmount } = render(
      <SearchProvider>
        <ChapterRefConsumer />
      </SearchProvider>
    );
    await user.click(screen.getByText('search-gen-1'));
    await waitFor(() =>
      expect(screen.getByTestId('cr-ref-match')).not.toHaveTextContent('none')
    );
    expect(screen.getByTestId('cr-ref-match')).toHaveTextContent('Genesis 1');
    expect(Number(screen.getByTestId('cr-results').textContent)).toBeGreaterThanOrEqual(2);
    unmount();
  });

  it('handles a Bible reference via book abbreviation', async () => {
    const user = userEvent.setup();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        chapters: [{ chapter: 1, verses: [{ verse: 1, text: 'In the beginning' }] }],
      }),
    });
    const { unmount } = render(
      <SearchProvider>
        <AbbrevRefConsumer />
      </SearchProvider>
    );
    await user.click(screen.getByText('search-gen-abbrev'));
    await waitFor(() =>
      expect(screen.getByTestId('ab-ref-match')).not.toHaveTextContent('none')
    );
    expect(screen.getByTestId('ab-ref-match')).toHaveTextContent('Genesis');
    unmount();
  });

  it('detail is cleared when a new search begins', async () => {
    const user = userEvent.setup();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        chapters: [{ chapter: 3, verses: [{ verse: 16, text: 'For God so loved' }] }],
      }),
    });
    render(<SearchProvider><SearchConsumer /></SearchProvider>);
    await user.click(screen.getByText('search-ref'));
    await waitFor(() => expect(screen.getByTestId('results-count')).not.toHaveTextContent('0'));
    await user.click(screen.getByText('clear'));
    expect(screen.getByTestId('results-count')).toHaveTextContent('0');
    expect(screen.getByTestId('ref-match')).toHaveTextContent('none');
    expect(screen.getByTestId('query')).toHaveTextContent('');
  });
});
