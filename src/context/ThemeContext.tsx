import {
  createContext, useCallback, useContext, useLayoutEffect, useMemo, useState, type ReactNode,
} from 'react';
import {
  contrastOn, getColorTheme, hexToChannels, readCustomColors, saveCustomColors,
  type ColorTheme, type ColorThemeId, type CustomColors,
} from '@/lib/colorThemes';

type Theme = 'light' | 'dark';

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  colorTheme: ColorThemeId;
  setColorTheme: (id: ColorThemeId) => void;
  customColors: CustomColors;
  setCustomColors: (colors: CustomColors) => void;
  activeTheme: ColorTheme;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export const THEME_KEY = 'nammy-theme';
export const COLOR_KEY = 'nammy-color-theme';
const SHADES = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  const [colorTheme, setColorThemeState] = useState<ColorThemeId>(() => {
    const stored = localStorage.getItem(COLOR_KEY);
    return getColorTheme(stored).id;
  });

  const [customColors, setCustomColorsState] = useState<CustomColors>(() => readCustomColors());
  const activeTheme = useMemo(
    () => getColorTheme(colorTheme, customColors),
    [colorTheme, customColors],
  );

  // useLayoutEffect applies everything before the browser paints — no flash of the wrong theme.
  useLayoutEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', theme === 'dark');
    root.style.colorScheme = theme;
    root.dataset.colorTheme = colorTheme;

    for (const shade of SHADES) {
      root.style.setProperty(`--primary-${shade}`, hexToChannels(activeTheme.primary[shade]));
      root.style.setProperty(`--accent-${shade}`, hexToChannels(activeTheme.accent[shade]));
    }
    root.style.setProperty('--primary-contrast', contrastOn(activeTheme.primary[600]));
    root.style.setProperty('--accent-contrast', contrastOn(activeTheme.accent[500]));

    // Keeps the Android status bar / browser toolbar in sync with the chosen theme.
    const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (meta) meta.content = activeTheme.primary[theme === 'dark' ? 900 : 600];

    try {
      localStorage.setItem(THEME_KEY, theme);
      localStorage.setItem(COLOR_KEY, colorTheme);
    } catch {
      // Ignore storage failures — the theme is still applied for this session.
    }
  }, [theme, colorTheme, activeTheme]);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => (prev === 'light' ? 'dark' : 'light'));
  }, []);

  const setTheme = useCallback((next: Theme) => setThemeState(next), []);
  const setColorTheme = useCallback((id: ColorThemeId) => setColorThemeState(id), []);

  const setCustomColors = useCallback((colors: CustomColors) => {
    setCustomColorsState(colors);
    saveCustomColors(colors);
    setColorThemeState('custom');
  }, []);

  return (
    <ThemeContext.Provider value={{
      theme, toggleTheme, setTheme,
      colorTheme, setColorTheme,
      customColors, setCustomColors,
      activeTheme,
    }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
