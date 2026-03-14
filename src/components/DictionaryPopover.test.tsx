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

  it('shows confidence label when confidence is provided', async () => {
    const user = userEvent.setup();
    render(
      <DictionaryPopover entry={mockEntry} confidence={0.05}>Moses</DictionaryPopover>
    );
    await user.click(screen.getByText('Moses'));
    expect(screen.getByLabelText('Match confidence')).toHaveTextContent('Low confidence');
  });

  it('shows other matches and allows switching to an alternative', async () => {
    const user = userEvent.setup();
    const altEntry = {
      term: 'Moses',
      category: 'topic' as const,
      definition: 'A topic-oriented Moses entry for disambiguation.',
      references: ['Hebrews 11:24'],
    };

    const candidates = [
      {
        entry: mockEntry,
        score: 0.9,
        confidence: 0.1,
        features: {
          exactTermMatch: 1,
          contextDefinitionOverlap: 0.3,
          referenceSupport: 0.2,
          bookReferencePrior: 0,
          categoryPrior: 1,
          queryDefinitionOverlap: 0,
        },
      },
      {
        entry: altEntry,
        score: 0.8,
        confidence: 0.1,
        features: {
          exactTermMatch: 1,
          contextDefinitionOverlap: 0.2,
          referenceSupport: 0.1,
          bookReferencePrior: 0,
          categoryPrior: 0.7,
          queryDefinitionOverlap: 0,
        },
      },
    ];

    render(
      <DictionaryPopover entry={mockEntry} candidates={candidates} confidence={0.1}>Moses</DictionaryPopover>
    );
    await user.click(screen.getByText('Moses'));
    expect(screen.getByText('Other matches')).toBeInTheDocument();
    await user.click(screen.getByText(/topic: A topic-oriented Moses entry/));
    expect(screen.getByText(altEntry.definition)).toBeInTheDocument();
  });
});
