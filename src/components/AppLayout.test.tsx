import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AppLayout } from './AppLayout';
import { renderWithProviders } from '../test/renderWithProviders';

describe('AppLayout', () => {
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
      if (url.includes('dictionaries')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          bookName: 'Genesis',
          chapters: [{
            chapter: 1,
            verses: [
              { verse: 1, text: 'In the beginning God created the heavens and the earth.' },
            ],
          }],
        }),
      });
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the VerseApp logo', () => {
    renderWithProviders(<AppLayout />);
    expect(screen.getByText('VerseApp')).toBeInTheDocument();
  });

  it('renders sidebar toggle button', () => {
    renderWithProviders(<AppLayout />);
    expect(screen.getByLabelText('Toggle sidebar')).toBeInTheDocument();
  });

  it('renders dark mode toggle', () => {
    renderWithProviders(<AppLayout />);
    expect(screen.getByLabelText('Toggle dark mode')).toBeInTheDocument();
  });

  it('renders settings button', () => {
    renderWithProviders(<AppLayout />);
    expect(screen.getByLabelText('Settings')).toBeInTheDocument();
  });

  it('opens settings modal on click', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AppLayout />);
    await user.click(screen.getByLabelText('Settings'));
    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByText('Dark Mode')).toBeInTheDocument();
  });

  it('has 4 navigation tabs in sidebar', () => {
    renderWithProviders(<AppLayout />);
    // The nav buttons are identified by their title attributes
    const navButtons = screen.getAllByRole('button').filter(btn =>
      ['Read', 'Search', 'Bookmarks', 'Dictionary'].includes(btn.getAttribute('title') ?? '')
    );
    expect(navButtons).toHaveLength(4);
  });

  it('shows book selector in read mode', () => {
    renderWithProviders(<AppLayout />);
    expect(screen.getByText('Old Testament')).toBeInTheDocument();
    expect(screen.getByText('New Testament')).toBeInTheDocument();
  });

  it('shows chapter selector in read mode', () => {
    renderWithProviders(<AppLayout />);
    // ChapterSelector renders chapter buttons (1-50 for Genesis)
    expect(screen.getByRole('button', { name: '1' })).toBeInTheDocument();
  });

  it('shows verse content after loading', async () => {
    renderWithProviders(<AppLayout />);
    await waitFor(() => {
      expect(screen.getByText(/In the beginning God created/)).toBeInTheDocument();
    });
  });

  it('toggles sidebar visibility', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AppLayout />);
    const sidebar = screen.getByText('VerseApp').closest('aside');
    expect(sidebar).toHaveClass('w-64');
    await user.click(screen.getByLabelText('Toggle sidebar'));
    expect(sidebar).toHaveClass('w-0');
  });

  it('can switch to Search tab', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AppLayout />);
    const searchTab = screen.getAllByRole('button').find(
      btn => btn.getAttribute('title') === 'Search'
    )!;
    await user.click(searchTab);
    // SearchBar input should now be visible
    expect(screen.getByPlaceholderText('Search verses or references...')).toBeInTheDocument();
  });

  it('can switch to Bookmarks tab', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AppLayout />);
    const bmTab = screen.getAllByRole('button').find(
      btn => btn.getAttribute('title') === 'Bookmarks'
    )!;
    await user.click(bmTab);
    expect(screen.getByText('No bookmarks yet')).toBeInTheDocument();
  });

  it('can switch to Dictionary tab', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AppLayout />);
    const dictTab = screen.getAllByRole('button').find(
      btn => btn.getAttribute('title') === 'Dictionary'
    )!;
    await user.click(dictTab);
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search dictionary...')).toBeInTheDocument();
    });
  });

  it('closes settings modal when backdrop is clicked', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AppLayout />);
    await user.click(screen.getByLabelText('Settings'));
    expect(screen.getByText('Dark Mode')).toBeInTheDocument();
    // The backdrop is the fixed overlay — click outside the dialog
    const backdrop = document.querySelector('.fixed.inset-0')!;
    await user.click(backdrop);
    expect(screen.queryByText('Dark Mode')).not.toBeInTheDocument();
  });

  it('shows Read tab content (VerseDisplay) by default', async () => {
    renderWithProviders(<AppLayout />);
    await waitFor(() => {
      expect(screen.getByText(/In the beginning God created/)).toBeInTheDocument();
    });
  });
});
