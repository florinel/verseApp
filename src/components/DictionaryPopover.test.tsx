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
});
