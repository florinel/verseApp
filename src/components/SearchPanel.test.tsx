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
});
