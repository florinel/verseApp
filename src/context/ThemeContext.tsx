import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface ThemeContextType {
  dark: boolean;
  toggle: () => void;
  fontSerif: boolean;
  toggleFont: () => void;
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

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('verseapp-dark', String(dark));
  }, [dark]);

  useEffect(() => {
    localStorage.setItem('verseapp-font-serif', String(fontSerif));
  }, [fontSerif]);

  return (
    <ThemeContext.Provider value={{
      dark,
      toggle: () => setDark(d => !d),
      fontSerif,
      toggleFont: () => setFontSerif(f => !f),
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
