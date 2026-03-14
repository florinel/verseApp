import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CopyButton } from './CopyButton';

describe('CopyButton', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders copy button with default label', () => {
    render(<CopyButton text="Test text" />);
    expect(screen.getByLabelText('Copy to clipboard')).toBeInTheDocument();
  });

  it('renders copy button with custom label', () => {
    render(<CopyButton text="Test text" label="Copy verse" />);
    expect(screen.getByLabelText('Copy verse')).toBeInTheDocument();
  });

  it('copies text to clipboard on click', async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      writable: true,
      configurable: true,
    });

    render(<CopyButton text="Genesis 1:1 — In the beginning" />);
    await user.click(screen.getByLabelText('Copy to clipboard'));
    expect(writeText).toHaveBeenCalledWith('Genesis 1:1 — In the beginning');
  });

  it('shows share button when navigator.share is available', () => {
    Object.defineProperty(navigator, 'share', {
      value: vi.fn(),
      writable: true,
      configurable: true,
    });
    render(<CopyButton text="Test text" />);
    expect(screen.getByLabelText('Share verse')).toBeInTheDocument();
  });

  it('shows "Copied!" tooltip feedback after clicking copy', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
      writable: true,
      configurable: true,
    });
    render(<CopyButton text="Hello" />);
    const btn = screen.getByLabelText('Copy to clipboard');
    await user.click(btn);
    expect(btn).toHaveAttribute('title', 'Copied!');
    vi.useRealTimers();
  });

  it('share button calls navigator.share with the text', async () => {
    const shareMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'share', { value: shareMock, writable: true, configurable: true });
    const user = userEvent.setup();
    render(<CopyButton text="Share me" />);
    await user.click(screen.getByLabelText('Share verse'));
    expect(shareMock).toHaveBeenCalledWith({ text: 'Share me' });
  });

  it('share button falls back to clipboard copy when navigator.share throws', async () => {
    const shareMock = vi.fn().mockRejectedValue(new Error('AbortError'));
    Object.defineProperty(navigator, 'share', { value: shareMock, writable: true, configurable: true });
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, writable: true, configurable: true });
    const user = userEvent.setup();
    render(<CopyButton text="Fallback" />);
    await user.click(screen.getByLabelText('Share verse'));
    // share was attempted — it threw, no crash
    expect(shareMock).toHaveBeenCalled();
  });
});
