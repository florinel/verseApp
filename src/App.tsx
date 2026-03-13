import { ThemeProvider } from './context/ThemeContext';
import { BibleProvider } from './context/BibleContext';
import { BookmarkProvider } from './context/BookmarkContext';
import { SearchProvider } from './context/SearchContext';
import { AppLayout } from './components/AppLayout';

export default function App() {
  return (
    <ThemeProvider>
      <BibleProvider>
        <BookmarkProvider>
          <SearchProvider>
            <AppLayout />
          </SearchProvider>
        </BookmarkProvider>
      </BibleProvider>
    </ThemeProvider>
  );
}
