import { useEffect } from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VerseDisplay } from './VerseDisplay';
import { useBible } from '../context/BibleContext';
import * as dictionaryHooks from '../hooks/useDictionary';
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

  it('Previous button is disabled at Genesis chapter 1', async () => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('dictionaries')) return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
      return Promise.resolve({ ok: true, json: () => Promise.resolve(mockBookData) });
    });
    renderWithProviders(<VerseDisplay />);
    await waitFor(() => expect(screen.getByText('Previous')).toBeInTheDocument());
    expect(screen.getByText('Previous').closest('button')).toBeDisabled();
  });

  it('Next button is disabled at Revelation chapter 22', async () => {
    const revData = { bookName: 'Revelation', chapters: [{ chapter: 22, verses: [{ verse: 1, text: 'Then the angel showed me' }] }] };
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('dictionaries')) return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
      return Promise.resolve({ ok: true, json: () => Promise.resolve(revData) });
    });
    function RevWrapper() {
      const { navigateTo, currentBook } = useBible();
      useEffect(() => {
        if (currentBook !== 'Revelation') {
          navigateTo('Revelation', 22);
        }
      }, [currentBook, navigateTo]);
      return <VerseDisplay />;
    }
    renderWithProviders(<RevWrapper />);
    await waitFor(() => expect(screen.getByText('Revelation')).toBeInTheDocument());
    expect(screen.getByText('Next').closest('button')).toBeDisabled();
  });

  it('clicking a verse selects it and shows action bar', async () => {
    const user = userEvent.setup();
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('dictionaries')) return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
      return Promise.resolve({ ok: true, json: () => Promise.resolve(mockBookData) });
    });
    renderWithProviders(<VerseDisplay />);
    await waitFor(() => expect(screen.getByText(/In the beginning God created/)).toBeInTheDocument());
    // Click on the verse 1 span (find the sup=1 and click its parent)
    const sup1 = screen.getByText('1', { selector: 'sup' });
    await user.click(sup1.parentElement!);
    // Action bar should appear with bookmark and copy buttons
    expect(screen.getByLabelText('Bookmark this verse')).toBeInTheDocument();
    expect(screen.getByLabelText('Copy verse')).toBeInTheDocument();
  });

  it('clicking a selected verse deselects it (hides action bar)', async () => {
    const user = userEvent.setup();
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('dictionaries')) return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
      return Promise.resolve({ ok: true, json: () => Promise.resolve(mockBookData) });
    });
    renderWithProviders(<VerseDisplay />);
    await waitFor(() => expect(screen.getByText(/In the beginning God created/)).toBeInTheDocument());
    const sup1 = screen.getByText('1', { selector: 'sup' });
    await user.click(sup1.parentElement!);
    expect(screen.getByLabelText('Bookmark this verse')).toBeInTheDocument();
    // Click again to deselect
    await user.click(sup1.parentElement!);
    expect(screen.queryByLabelText('Bookmark this verse')).not.toBeInTheDocument();
  });

  it('known dictionary terms are highlighted in verse text', async () => {
    const mockDictEntry = {
      term: 'God',
      category: 'topic' as const,
      definition: 'The Creator',
      references: [],
    };
    vi.spyOn(dictionaryHooks, 'useDictionary').mockReturnValue({
      entries: [mockDictEntry],
      loading: false,
      lookup: (term: string) => (term.toLowerCase() === 'god' ? mockDictEntry : undefined),
      searchEntries: () => [mockDictEntry],
      isKnownTerm: (word: string) => word.toLowerCase() === 'god',
      getByCategory: () => [mockDictEntry],
      getCandidates: () => [{
        entry: mockDictEntry,
        score: 1,
        confidence: 1,
        features: {
          exactTermMatch: 1,
          contextDefinitionOverlap: 1,
          referenceSupport: 0,
          bookReferencePrior: 0,
          categoryPrior: 1,
          queryDefinitionOverlap: 0,
        },
      }],
      resolveBestCandidate: () => mockDictEntry,
    });
    global.fetch = vi.fn().mockImplementation((url: string) => {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(mockBookData) });
    });
    renderWithProviders(<VerseDisplay />);
    await waitFor(() => {
      expect(document.querySelector('.dict-highlight')).toBeInTheDocument();
    });
    const highlighted = document.querySelector('.dict-highlight');
    expect(highlighted).toBeInTheDocument();
    expect(highlighted?.textContent).toBe('God');
  });
});
