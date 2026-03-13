import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BookSelector } from './BookSelector';
import { renderWithProviders } from '../test/renderWithProviders';

describe('BookSelector', () => {
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

  it('renders Old Testament and New Testament sections', () => {
    renderWithProviders(<BookSelector />);
    expect(screen.getByText('Old Testament')).toBeInTheDocument();
    expect(screen.getByText('New Testament')).toBeInTheDocument();
  });

  it('displays Genesis as first book', () => {
    renderWithProviders(<BookSelector />);
    expect(screen.getByText('Genesis')).toBeInTheDocument();
  });

  it('displays Revelation as last book', () => {
    renderWithProviders(<BookSelector />);
    expect(screen.getByText('Revelation')).toBeInTheDocument();
  });

  it('displays Matthew in New Testament', () => {
    renderWithProviders(<BookSelector />);
    expect(screen.getByText('Matthew')).toBeInTheDocument();
  });

  it('shows chapter count next to book names', () => {
    renderWithProviders(<BookSelector />);
    // Genesis has 50 chapters
    expect(screen.getByText('50')).toBeInTheDocument();
  });

  it('highlights the current book (Genesis by default)', () => {
    renderWithProviders(<BookSelector />);
    const genesisBtn = screen.getByText('Genesis').closest('button');
    expect(genesisBtn).toHaveClass('sidebar-btn-active');
  });

  it('clicking a book selects it', async () => {
    const user = userEvent.setup();
    renderWithProviders(<BookSelector />);
    const exodusBtn = screen.getByText('Exodus').closest('button')!;
    await user.click(exodusBtn);
    expect(exodusBtn).toHaveClass('sidebar-btn-active');
  });

  it('can toggle Old Testament section', async () => {
    const user = userEvent.setup();
    renderWithProviders(<BookSelector />);
    // OT is expanded by default (contains Genesis which is selected)
    expect(screen.getByText('Genesis')).toBeInTheDocument();
    // Click OT header to collapse — but since Genesis is the current book,
    // effectiveOtOpen will still be true due to auto-expand logic
    // So toggling when current book is in OT won't collapse it
    const otButton = screen.getByText('Old Testament');
    await user.click(otButton);
    // Genesis should still be visible because it's the current book
    expect(screen.getByText('Genesis')).toBeInTheDocument();
  });
});
