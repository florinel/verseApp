import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, useTheme, FontSize } from './ThemeContext';

function ThemeConsumer() {
  const { dark, toggle, fontSerif, toggleFont, fontSize, setFontSize } = useTheme();
  return (
    <div>
      <span data-testid="dark">{String(dark)}</span>
      <span data-testid="fontSerif">{String(fontSerif)}</span>
      <span data-testid="fontSize">{fontSize}</span>
      <button onClick={toggle}>toggle-dark</button>
      <button onClick={toggleFont}>toggle-font</button>
      <button onClick={() => setFontSize('xl')}>set-xl</button>
    </div>
  );
}

describe('ThemeContext', () => {
  let store: Record<string, string>;

  beforeEach(() => {
    store = {};
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation((key) => store[key] ?? null);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation((key, val) => { store[key] = val; });
    // Mock matchMedia
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('provides default values', () => {
    render(
      <ThemeProvider><ThemeConsumer /></ThemeProvider>
    );
    expect(screen.getByTestId('dark')).toHaveTextContent('false');
    expect(screen.getByTestId('fontSerif')).toHaveTextContent('true');
    expect(screen.getByTestId('fontSize')).toHaveTextContent('sm');
  });

  it('reads dark mode from localStorage', () => {
    store['verseapp-dark'] = 'true';
    render(
      <ThemeProvider><ThemeConsumer /></ThemeProvider>
    );
    expect(screen.getByTestId('dark')).toHaveTextContent('true');
  });

  it('reads font-serif false from localStorage', () => {
    store['verseapp-font-serif'] = 'false';
    render(
      <ThemeProvider><ThemeConsumer /></ThemeProvider>
    );
    expect(screen.getByTestId('fontSerif')).toHaveTextContent('false');
  });

  it('reads font size from localStorage', () => {
    store['verseapp-font-size'] = 'lg';
    render(
      <ThemeProvider><ThemeConsumer /></ThemeProvider>
    );
    expect(screen.getByTestId('fontSize')).toHaveTextContent('lg');
  });

  it('toggles dark mode and persists to localStorage', async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider><ThemeConsumer /></ThemeProvider>
    );
    expect(screen.getByTestId('dark')).toHaveTextContent('false');
    await user.click(screen.getByText('toggle-dark'));
    expect(screen.getByTestId('dark')).toHaveTextContent('true');
    expect(store['verseapp-dark']).toBe('true');
  });

  it('toggles font family', async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider><ThemeConsumer /></ThemeProvider>
    );
    expect(screen.getByTestId('fontSerif')).toHaveTextContent('true');
    await user.click(screen.getByText('toggle-font'));
    expect(screen.getByTestId('fontSerif')).toHaveTextContent('false');
    expect(store['verseapp-font-serif']).toBe('false');
  });

  it('sets font size', async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider><ThemeConsumer /></ThemeProvider>
    );
    await user.click(screen.getByText('set-xl'));
    expect(screen.getByTestId('fontSize')).toHaveTextContent('xl');
    expect(store['verseapp-font-size']).toBe('xl');
  });

  it('throws when useTheme is used outside ThemeProvider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<ThemeConsumer />)).toThrow('useTheme must be inside ThemeProvider');
    spy.mockRestore();
  });
});
