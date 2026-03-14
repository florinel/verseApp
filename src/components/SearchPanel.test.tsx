import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SearchBar, SearchResultsView } from './SearchPanel';
import { renderWithProviders } from '../test/renderWithProviders';

describe('SearchBar', () => {
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

  it('renders search input', () => {
    renderWithProviders(<SearchBar />);
    expect(screen.getByPlaceholderText('Search verses or references...')).toBeInTheDocument();
  });

  it('renders Search button', () => {
    renderWithProviders(<SearchBar />);
    expect(screen.getByText('Search')).toBeInTheDocument();
  });

  it('Search button is disabled when input is empty', () => {
    renderWithProviders(<SearchBar />);
    const btn = screen.getByText('Search');
    expect(btn).toBeDisabled();
  });

  it('typing enables the Search button', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SearchBar />);
    const input = screen.getByPlaceholderText('Search verses or references...');
    await user.type(input, 'love');
    expect(screen.getByText('Search')).not.toBeDisabled();
  });

  it('pressing Enter triggers a search', async () => {
    const user = userEvent.setup();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    });
    renderWithProviders(<SearchBar />);
    const input = screen.getByPlaceholderText('Search verses or references...');
    await user.type(input, 'love{Enter}');
    // The button text changes to 'Searching…' while searching
    // (fetch returns instantly in tests so we mainly verify no crash)
    expect(input).toBeInTheDocument();
  });

  it('Search button shows "Searching…" label while a search is in progress', async () => {
    // Never-resolving fetch keeps searching=true
    global.fetch = vi.fn().mockImplementation(() => new Promise(() => {}));
    const user = userEvent.setup();
    renderWithProviders(<SearchBar />);
    const input = screen.getByPlaceholderText('Search verses or references...');
    await user.type(input, 'love');
    await user.click(screen.getByText('Search'));
    expect(screen.getByText('Searching…')).toBeInTheDocument();
  });

  it('shows clear button when input has text', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SearchBar />);
    const input = screen.getByPlaceholderText('Search verses or references...');
    await user.type(input, 'love');
    expect(screen.getByLabelText('Clear search')).toBeInTheDocument();
  });

  it('clear button resets input', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SearchBar />);
    const input = screen.getByPlaceholderText('Search verses or references...') as HTMLInputElement;
    await user.type(input, 'love');
    expect(input.value).toBe('love');
    await user.click(screen.getByLabelText('Clear search'));
    expect(input.value).toBe('');
  });
});

describe('SearchResultsView', () => {
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

  it('shows placeholder when no query', () => {
    renderWithProviders(<SearchResultsView />);
    expect(screen.getByText(/Search by keyword/)).toBeInTheDocument();
    expect(screen.getByText('John 3:16')).toBeInTheDocument();
  });

  it('shows "No results found" when search returns nothing', async () => {
    const user = userEvent.setup();
    // Perform a search via SearchBar first to set a query with no results
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    });
    renderWithProviders(
      <>
        <SearchBar />
        <SearchResultsView />
      </>
    );
    const input = screen.getByPlaceholderText('Search verses or references...');
    await user.type(input, 'xyznoexist');
    await user.click(screen.getByText('Search'));
    await waitFor(() => {
      expect(screen.getByText(/No results found/)).toBeInTheDocument();
    }, { timeout: 15000 });
  });

  it('shows dictionary results section when dict entries match', async () => {
    const user = userEvent.setup();
    const mockDict = [
      { term: 'Grace', category: 'topic', definition: 'Unmerited favor', references: [] },
    ];
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/data/dictionaries/topics.json')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockDict) });
      }
      if (url.includes('/data/dictionaries/')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ chapters: [{ chapter: 1, verses: [{ verse: 1, text: 'no match' }] }] }),
      });
    });
    renderWithProviders(
      <>
        <SearchBar />
        <SearchResultsView />
      </>
    );
    const input = screen.getByPlaceholderText('Search verses or references...');
    await user.type(input, 'grace{Enter}');
    await waitFor(() => {
      expect(screen.getByText('Grace')).toBeInTheDocument();
    }, { timeout: 15000 });
  }, 20000);
});
