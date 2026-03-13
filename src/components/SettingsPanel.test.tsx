import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SettingsPanel } from './SettingsPanel';
import { ThemeProvider } from '../context/ThemeContext';

function renderSettings(onClose = vi.fn()) {
  return {
    onClose,
    ...render(
      <ThemeProvider>
        <SettingsPanel onClose={onClose} />
      </ThemeProvider>
    ),
  };
}

describe('SettingsPanel', () => {
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

  it('renders Settings heading', () => {
    renderSettings();
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('renders close button', () => {
    renderSettings();
    expect(screen.getByLabelText('Close settings')).toBeInTheDocument();
  });

  it('close button calls onClose', async () => {
    const user = userEvent.setup();
    const { onClose } = renderSettings();
    await user.click(screen.getByLabelText('Close settings'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders Dark Mode toggle', () => {
    renderSettings();
    expect(screen.getByText('Dark Mode')).toBeInTheDocument();
  });

  it('renders Font toggle with Serif and Sans options', () => {
    renderSettings();
    expect(screen.getByText('Font')).toBeInTheDocument();
    expect(screen.getByText('Serif')).toBeInTheDocument();
    expect(screen.getByText('Sans')).toBeInTheDocument();
  });

  it('renders Text Size options', () => {
    renderSettings();
    expect(screen.getByText('Text Size')).toBeInTheDocument();
    // The buttons show last word of label, so "Extra Small" and "Small" both show "Small"
    expect(screen.getAllByText('Small').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Medium')).toBeInTheDocument();
    expect(screen.getAllByText('Large').length).toBeGreaterThanOrEqual(1);
  });

  it('renders preview section', () => {
    renderSettings();
    expect(screen.getByText('Preview')).toBeInTheDocument();
    expect(screen.getByText(/In the beginning God created/)).toBeInTheDocument();
  });

  it('clicking a font size option changes the size', async () => {
    const user = userEvent.setup();
    renderSettings();
    // "Large" appears twice (for lg and xl), get the first one
    const largeButtons = screen.getAllByText('Large');
    await user.click(largeButtons[0]);
    expect(store['verseapp-font-size']).toBe('lg');
  });

  it('clicking Sans toggles font to sans-serif', async () => {
    const user = userEvent.setup();
    renderSettings();
    await user.click(screen.getByText('Sans'));
    expect(store['verseapp-font-serif']).toBe('false');
  });

  it('clicking backdrop calls onClose', async () => {
    const user = userEvent.setup();
    const { onClose, container } = renderSettings();
    // The backdrop is the outermost div with the fixed class
    const backdrop = container.querySelector('.fixed.inset-0')!;
    await user.click(backdrop);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('clicking inside the dialog does not close', async () => {
    const user = userEvent.setup();
    const { onClose } = renderSettings();
    await user.click(screen.getByText('Settings'));
    expect(onClose).not.toHaveBeenCalled();
  });
});
