import { ThemeProvider } from './context/ThemeContext';
import { BibleProvider } from './context/BibleContext';
import { BookmarkProvider } from './context/BookmarkContext';
import { AppLayout } from './components/AppLayout';

export default function App() {
  return (
    <ThemeProvider>
      <BibleProvider>
        <BookmarkProvider>
          <AppLayout />
        </BookmarkProvider>
      </BibleProvider>
    </ThemeProvider>
  );
}
