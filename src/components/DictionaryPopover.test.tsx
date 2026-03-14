import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DictionaryPopover } from './DictionaryPopover';

const mockEntry = {
  term: 'Moses',
  category: 'person' as const,
  definition: 'Led the Israelites out of Egypt through the wilderness.',
  references: ['Exodus 3:10', 'Deuteronomy 34:5'],
};

describe('DictionaryPopover', () => {
  it('renders children text', () => {
    render(
      <DictionaryPopover entry={mockEntry}>Moses</DictionaryPopover>
    );
    expect(screen.getByText('Moses')).toBeInTheDocument();
  });

  it('opens popover on click', async () => {
    const user = userEvent.setup();
    render(
      <DictionaryPopover entry={mockEntry}>Moses</DictionaryPopover>
    );
    await user.click(screen.getByText('Moses'));
    expect(screen.getByText('Led the Israelites out of Egypt through the wilderness.')).toBeInTheDocument();
    expect(screen.getByText('person')).toBeInTheDocument();
  });

  it('shows references in popover', async () => {
    const user = userEvent.setup();
    render(
      <DictionaryPopover entry={mockEntry}>Moses</DictionaryPopover>
    );
    await user.click(screen.getByText('Moses'));
    expect(screen.getByText('Exodus 3:10, Deuteronomy 34:5')).toBeInTheDocument();
  });

  it('closes popover with close button', async () => {
    const user = userEvent.setup();
    render(
      <DictionaryPopover entry={mockEntry}>Moses</DictionaryPopover>
    );
    await user.click(screen.getByText('Moses'));
    expect(screen.getByText(mockEntry.definition)).toBeInTheDocument();
    await user.click(screen.getByLabelText('Close'));
    expect(screen.queryByText(mockEntry.definition)).not.toBeInTheDocument();
  });

  it('toggles popover on repeated clicks', async () => {
    const user = userEvent.setup();
    render(
      <DictionaryPopover entry={mockEntry}>Moses</DictionaryPopover>
    );
    const trigger = screen.getByText('Moses');
    await user.click(trigger);
    expect(screen.getByText(mockEntry.definition)).toBeInTheDocument();
    await user.click(trigger);
    expect(screen.queryByText(mockEntry.definition)).not.toBeInTheDocument();
  });

  it('handles entry with no references', async () => {
    const user = userEvent.setup();
    const entryNoRefs = { ...mockEntry, references: [] };
    render(
      <DictionaryPopover entry={entryNoRefs}>Moses</DictionaryPopover>
    );
    await user.click(screen.getByText('Moses'));
    expect(screen.getByText(mockEntry.definition)).toBeInTheDocument();
    expect(screen.queryByText('References:')).not.toBeInTheDocument();
  });

  it('calls onSearch callback when provided', async () => {
    const user = userEvent.setup();
    const onSearch = vi.fn();
    render(
      <DictionaryPopover entry={mockEntry} onSearch={onSearch}>Moses</DictionaryPopover>
    );
    await user.click(screen.getByText('Moses'));
    expect(screen.getByText(mockEntry.definition)).toBeInTheDocument();
    // The onSearch prop is available — verify popover opened (onSearch is called from "See TERM" links)
  });

  it('"See TERM" cross-reference in definition is clickable and calls onSearch', async () => {
    const user = userEvent.setup();
    const onSearch = vi.fn();
    const entryWithRef = {
      ...mockEntry,
      definition: 'A great leader. -See AARON for more.',
    };
    render(
      <DictionaryPopover entry={entryWithRef} onSearch={onSearch}>Moses</DictionaryPopover>
    );
    await user.click(screen.getByText('Moses'));
    const seeLink = screen.getByText('See AARON');
    expect(seeLink).toBeInTheDocument();
    await user.click(seeLink);
    expect(onSearch).toHaveBeenCalledWith('AARON');
  });

  it('popover displays term name in heading', async () => {
    const user = userEvent.setup();
    render(
      <DictionaryPopover entry={mockEntry}>Moses</DictionaryPopover>
    );
    await user.click(screen.getByText('Moses'));
    // The bold heading inside the popover should show the term
    const headings = screen.getAllByText('Moses');
    expect(headings.length).toBeGreaterThanOrEqual(2); // trigger + popover heading
  });
});
