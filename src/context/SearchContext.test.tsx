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
});
