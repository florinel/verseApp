import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VerseDisplay } from './VerseDisplay';
import { renderWithProviders } from '../test/renderWithProviders';

const mockBookData = {
  bookName: 'Genesis',
  chapters: [
    {
      chapter: 1,
      verses: [
        { verse: 1, text: 'In the beginning God created the heavens and the earth.' },
        { verse: 2, text: 'The earth was formless and void, and darkness was over the surface of the deep.' },
        { verse: 3, text: 'Then God said, "Let there be light"; and there was light.' },
      ],
    },
  ],
};

describe('VerseDisplay', () => {
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
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows loading state initially', () => {
    global.fetch = vi.fn().mockImplementation(() => new Promise(() => {})); // never resolves
    renderWithProviders(<VerseDisplay />);
    expect(screen.getByText(/Loading/)).toBeInTheDocument();
  });

  it('shows error state on fetch failure', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500 });
    renderWithProviders(<VerseDisplay />);
    await waitFor(() => {
      expect(screen.getByText(/Error/)).toBeInTheDocument();
    });
  });

  it('renders verses after successful fetch', async () => {
    // Dictionary returns empty
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('dictionaries')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve(mockBookData) });
    });

    renderWithProviders(<VerseDisplay />);
    await waitFor(() => {
      expect(screen.getByText(/In the beginning God created/)).toBeInTheDocument();
    });
  });

  it('displays book name and chapter heading', async () => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('dictionaries')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve(mockBookData) });
    });

    renderWithProviders(<VerseDisplay />);
    await waitFor(() => {
      expect(screen.getByText('Genesis')).toBeInTheDocument();
    });
    expect(screen.getByText(/Chapter 1/)).toBeInTheDocument();
    expect(screen.getByText(/NASB/)).toBeInTheDocument();
  });

  it('renders Previous and Next navigation buttons', async () => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('dictionaries')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve(mockBookData) });
    });

    renderWithProviders(<VerseDisplay />);
    await waitFor(() => {
      expect(screen.getByText('Previous')).toBeInTheDocument();
    });
    expect(screen.getByText('Next')).toBeInTheDocument();
  });

  it('shows chapter counter', async () => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('dictionaries')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve(mockBookData) });
    });

    renderWithProviders(<VerseDisplay />);
    await waitFor(() => {
      expect(screen.getByText('1 / 50')).toBeInTheDocument();
    });
  });

  it('renders verse numbers as superscripts', async () => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('dictionaries')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve(mockBookData) });
    });

    renderWithProviders(<VerseDisplay />);
    await waitFor(() => {
      expect(screen.getByText('1', { selector: 'sup' })).toBeInTheDocument();
      expect(screen.getByText('2', { selector: 'sup' })).toBeInTheDocument();
      expect(screen.getByText('3', { selector: 'sup' })).toBeInTheDocument();
    });
  });
});
