import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type FontSize = 'xs' | 'sm' | 'base' | 'lg' | 'xl';

interface ThemeContextType {
  dark: boolean;
  toggle: () => void;
  fontSerif: boolean;
  toggleFont: () => void;
  fontSize: FontSize;
  setFontSize: (size: FontSize) => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [dark, setDark] = useState(() => {
    const stored = localStorage.getItem('verseapp-dark');
    if (stored !== null) return stored === 'true';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  const [fontSerif, setFontSerif] = useState(() => {
    return localStorage.getItem('verseapp-font-serif') !== 'false';
  });
  const [fontSize, setFontSize] = useState<FontSize>(() => {
    return (localStorage.getItem('verseapp-font-size') as FontSize) || 'sm';
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('verseapp-dark', String(dark));
  }, [dark]);

  useEffect(() => {
    localStorage.setItem('verseapp-font-serif', String(fontSerif));
  }, [fontSerif]);

  useEffect(() => {
    localStorage.setItem('verseapp-font-size', fontSize);
  }, [fontSize]);

  return (
    <ThemeContext.Provider value={{
      dark,
      toggle: () => setDark(d => !d),
      fontSerif,
      toggleFont: () => setFontSerif(f => !f),
      fontSize,
      setFontSize,
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be inside ThemeProvider');
  return ctx;
}
