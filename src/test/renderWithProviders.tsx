import { render } from '@testing-library/react';
import { ThemeProvider } from '../context/ThemeContext';
import { BibleProvider } from '../context/BibleContext';
import { BookmarkProvider } from '../context/BookmarkContext';
import { SearchProvider } from '../context/SearchContext';

export function renderWithProviders(ui: React.ReactElement) {
  return render(
    <ThemeProvider>
      <BibleProvider>
        <BookmarkProvider>
          <SearchProvider>{ui}</SearchProvider>
        </BookmarkProvider>
      </BibleProvider>
    </ThemeProvider>
  );
}
