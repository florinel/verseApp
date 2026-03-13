import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChapterSelector } from './ChapterSelector';
import { renderWithProviders } from '../test/renderWithProviders';

describe('ChapterSelector', () => {
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

  it('displays current book name', () => {
    renderWithProviders(<ChapterSelector />);
    expect(screen.getByText('Genesis')).toBeInTheDocument();
  });

  it('renders correct number of chapter buttons (50 for Genesis)', () => {
    renderWithProviders(<ChapterSelector />);
    // Genesis has 50 chapters
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(50);
  });

  it('chapter 1 is highlighted by default', () => {
    renderWithProviders(<ChapterSelector />);
    const ch1 = screen.getByRole('button', { name: '1' });
    expect(ch1).toHaveClass('bg-amber-600');
  });

  it('clicking a chapter button selects it', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ChapterSelector />);
    const ch5 = screen.getByRole('button', { name: '5' });
    await user.click(ch5);
    expect(ch5).toHaveClass('bg-amber-600');
  });

  it('renders chapter numbers 1 through 50', () => {
    renderWithProviders(<ChapterSelector />);
    expect(screen.getByRole('button', { name: '1' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '25' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '50' })).toBeInTheDocument();
  });
});
