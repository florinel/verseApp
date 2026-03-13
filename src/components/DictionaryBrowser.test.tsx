import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DictionaryBrowser } from './DictionaryBrowser';
import { renderWithProviders } from '../test/renderWithProviders';

const mockPeople = [
  { term: 'Abraham', category: 'person', definition: 'Father of many nations', references: ['Genesis 12:1'] },
  { term: 'Moses', category: 'person', definition: 'Led Israel out of Egypt', references: ['Exodus 3:10'] },
];
const mockPlaces = [
  { term: 'Jerusalem', category: 'place', definition: 'Holy city of Israel', references: ['Psalm 122:3'] },
];
const mockEvents = [
  { term: 'Exodus', category: 'event', definition: 'Israel leaves Egypt', references: ['Exodus 12:31'] },
];
const mockTopics = [
  { term: 'Grace', category: 'topic', definition: 'Unmerited favor of God', references: ['Ephesians 2:8'] },
];

describe('DictionaryBrowser', () => {
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
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('people')) return Promise.resolve({ ok: true, json: () => Promise.resolve(mockPeople) });
      if (url.includes('places')) return Promise.resolve({ ok: true, json: () => Promise.resolve(mockPlaces) });
      if (url.includes('events')) return Promise.resolve({ ok: true, json: () => Promise.resolve(mockEvents) });
      if (url.includes('topics')) return Promise.resolve({ ok: true, json: () => Promise.resolve(mockTopics) });
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ chapters: [] }) });
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows loading state initially', () => {
    // Override fetch to never resolve
    global.fetch = vi.fn().mockImplementation(() => new Promise(() => {}));
    renderWithProviders(<DictionaryBrowser />);
    expect(screen.getByText('Loading dictionary...')).toBeInTheDocument();
  });

  it('renders search input', async () => {
    renderWithProviders(<DictionaryBrowser />);
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search dictionary...')).toBeInTheDocument();
    });
  });

  it('renders category tabs after loading', async () => {
    renderWithProviders(<DictionaryBrowser />);
    await waitFor(() => {
      expect(screen.getByText(/All/)).toBeInTheDocument();
    });
    expect(screen.getByText(/People/)).toBeInTheDocument();
    expect(screen.getByText(/Places/)).toBeInTheDocument();
    expect(screen.getByText(/Events/)).toBeInTheDocument();
    expect(screen.getByText(/Topics/)).toBeInTheDocument();
  });

  it('displays entries sorted alphabetically', async () => {
    renderWithProviders(<DictionaryBrowser />);
    await waitFor(() => {
      expect(screen.getByText('Abraham')).toBeInTheDocument();
    });
    expect(screen.getByText('Moses')).toBeInTheDocument();
    expect(screen.getByText('Jerusalem')).toBeInTheDocument();
  });

  it('clicking an entry shows detail view', async () => {
    const user = userEvent.setup();
    renderWithProviders(<DictionaryBrowser />);
    await waitFor(() => {
      expect(screen.getByText('Abraham')).toBeInTheDocument();
    });
    await user.click(screen.getByText('Abraham'));
    expect(screen.getByText('Father of many nations')).toBeInTheDocument();
    expect(screen.getByText('Genesis 12:1')).toBeInTheDocument();
  });

  it('back button returns to list view', async () => {
    const user = userEvent.setup();
    renderWithProviders(<DictionaryBrowser />);
    await waitFor(() => {
      expect(screen.getByText('Abraham')).toBeInTheDocument();
    });
    await user.click(screen.getByText('Abraham'));
    expect(screen.getByText('Back to list')).toBeInTheDocument();
    await user.click(screen.getByText('Back to list'));
    // Should be back in list view showing multiple entries
    expect(screen.getByText('Moses')).toBeInTheDocument();
  });

  it('search filters entries', async () => {
    const user = userEvent.setup();
    renderWithProviders(<DictionaryBrowser />);
    await waitFor(() => {
      expect(screen.getByText('Abraham')).toBeInTheDocument();
    });
    const searchInput = screen.getByPlaceholderText('Search dictionary...');
    await user.type(searchInput, 'moses');
    expect(screen.getByText('Moses')).toBeInTheDocument();
    expect(screen.queryByText('Abraham')).not.toBeInTheDocument();
  });

  it('shows "No entries found" when search has no results', async () => {
    const user = userEvent.setup();
    renderWithProviders(<DictionaryBrowser />);
    await waitFor(() => {
      expect(screen.getByText('Abraham')).toBeInTheDocument();
    });
    const searchInput = screen.getByPlaceholderText('Search dictionary...');
    await user.type(searchInput, 'xyznonexistent');
    expect(screen.getByText('No entries found')).toBeInTheDocument();
  });
});
