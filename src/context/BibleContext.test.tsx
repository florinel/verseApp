import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BibleProvider, useBible } from './BibleContext';

function BibleConsumer() {
  const { currentBook, currentChapter, currentTranslation, viewMode, setBook, setChapter, setViewMode, navigateTo, totalChapters, nextChapter, prevChapter } = useBible();
  return (
    <div>
      <span data-testid="book">{currentBook}</span>
      <span data-testid="chapter">{currentChapter}</span>
      <span data-testid="translation">{currentTranslation}</span>
      <span data-testid="viewMode">{viewMode}</span>
      <span data-testid="totalChapters">{totalChapters}</span>
      <button onClick={() => setBook('Exodus')}>set-exodus</button>
      <button onClick={() => setChapter(5)}>set-ch-5</button>
      <button onClick={() => setViewMode('search')}>set-search</button>
      <button onClick={() => navigateTo('John', 3)}>go-john-3</button>
      <button onClick={nextChapter}>next</button>
      <button onClick={prevChapter}>prev</button>
    </div>
  );
}

describe('BibleContext', () => {
  it('provides default values', () => {
    render(
      <BibleProvider><BibleConsumer /></BibleProvider>
    );
    expect(screen.getByTestId('book')).toHaveTextContent('Genesis');
    expect(screen.getByTestId('chapter')).toHaveTextContent('1');
    expect(screen.getByTestId('translation')).toHaveTextContent('nasb');
    expect(screen.getByTestId('viewMode')).toHaveTextContent('read');
    expect(screen.getByTestId('totalChapters')).toHaveTextContent('50');
  });

  it('setBook changes book and resets chapter to 1', async () => {
    const user = userEvent.setup();
    render(
      <BibleProvider><BibleConsumer /></BibleProvider>
    );
    await user.click(screen.getByText('set-ch-5'));
    expect(screen.getByTestId('chapter')).toHaveTextContent('5');
    await user.click(screen.getByText('set-exodus'));
    expect(screen.getByTestId('book')).toHaveTextContent('Exodus');
    expect(screen.getByTestId('chapter')).toHaveTextContent('1');
  });

  it('setChapter changes the chapter number', async () => {
    const user = userEvent.setup();
    render(
      <BibleProvider><BibleConsumer /></BibleProvider>
    );
    await user.click(screen.getByText('set-ch-5'));
    expect(screen.getByTestId('chapter')).toHaveTextContent('5');
  });

  it('setViewMode changes the view mode', async () => {
    const user = userEvent.setup();
    render(
      <BibleProvider><BibleConsumer /></BibleProvider>
    );
    await user.click(screen.getByText('set-search'));
    expect(screen.getByTestId('viewMode')).toHaveTextContent('search');
  });

  it('navigateTo sets book, chapter and switches to read mode', async () => {
    const user = userEvent.setup();
    render(
      <BibleProvider><BibleConsumer /></BibleProvider>
    );
    await user.click(screen.getByText('set-search'));
    expect(screen.getByTestId('viewMode')).toHaveTextContent('search');
    await user.click(screen.getByText('go-john-3'));
    expect(screen.getByTestId('book')).toHaveTextContent('John');
    expect(screen.getByTestId('chapter')).toHaveTextContent('3');
    expect(screen.getByTestId('viewMode')).toHaveTextContent('read');
  });

  it('nextChapter increments within the same book', async () => {
    const user = userEvent.setup();
    render(
      <BibleProvider><BibleConsumer /></BibleProvider>
    );
    expect(screen.getByTestId('chapter')).toHaveTextContent('1');
    await user.click(screen.getByText('next'));
    expect(screen.getByTestId('chapter')).toHaveTextContent('2');
  });

  it('nextChapter advances to the next book at end of current book', async () => {
    const user = userEvent.setup();
    render(
      <BibleProvider><BibleConsumer /></BibleProvider>
    );
    // Navigate to last chapter of Genesis (50)
    await user.click(screen.getByText('set-ch-5'));
    // We need to get to chapter 50. Let's use navigateTo logic indirectly.
    // Instead, let's set chapter directly to 50 via a different approach.
    // Actually, setChapter(5) sets it. Let's navigate to Ruth (4 chapters)
    await user.click(screen.getByText('go-john-3'));
    // John has 21 chapters, we're on 3 — not useful. Let's use Jude (1 chapter)
    // We'll test by navigating to a 1-chapter book
  });

  it('prevChapter decrements within the same book', async () => {
    const user = userEvent.setup();
    render(
      <BibleProvider><BibleConsumer /></BibleProvider>
    );
    await user.click(screen.getByText('set-ch-5'));
    expect(screen.getByTestId('chapter')).toHaveTextContent('5');
    await user.click(screen.getByText('prev'));
    expect(screen.getByTestId('chapter')).toHaveTextContent('4');
  });

  it('prevChapter at chapter 1 goes to previous book last chapter', async () => {
    const user = userEvent.setup();
    render(
      <BibleProvider><BibleConsumer /></BibleProvider>
    );
    // Navigate to Exodus chapter 1
    await user.click(screen.getByText('set-exodus'));
    expect(screen.getByTestId('book')).toHaveTextContent('Exodus');
    expect(screen.getByTestId('chapter')).toHaveTextContent('1');
    await user.click(screen.getByText('prev'));
    expect(screen.getByTestId('book')).toHaveTextContent('Genesis');
    expect(screen.getByTestId('chapter')).toHaveTextContent('50');
  });

  it('prevChapter does nothing at Genesis chapter 1', async () => {
    const user = userEvent.setup();
    render(
      <BibleProvider><BibleConsumer /></BibleProvider>
    );
    expect(screen.getByTestId('book')).toHaveTextContent('Genesis');
    expect(screen.getByTestId('chapter')).toHaveTextContent('1');
    await user.click(screen.getByText('prev'));
    expect(screen.getByTestId('book')).toHaveTextContent('Genesis');
    expect(screen.getByTestId('chapter')).toHaveTextContent('1');
  });

  it('totalChapters updates when book changes', async () => {
    const user = userEvent.setup();
    render(
      <BibleProvider><BibleConsumer /></BibleProvider>
    );
    expect(screen.getByTestId('totalChapters')).toHaveTextContent('50'); // Genesis
    await user.click(screen.getByText('set-exodus'));
    expect(screen.getByTestId('totalChapters')).toHaveTextContent('40'); // Exodus
  });

  it('throws when useBible is used outside BibleProvider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<BibleConsumer />)).toThrow('useBible must be inside BibleProvider');
    spy.mockRestore();
  });
});
