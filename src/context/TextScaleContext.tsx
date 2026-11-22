import {
  createContext, useCallback, useContext, useLayoutEffect, useMemo, useState, type ReactNode,
} from 'react';
import {
  applyFixedTextScale, readFixedTextScale, writeFixedTextScale,
} from '@/lib/textScale';

interface TextScaleContextValue {
  fixedTextScale: boolean;
  setFixedTextScale: (fixed: boolean) => void;
  toggleFixedTextScale: () => void;
}

const TextScaleContext = createContext<TextScaleContextValue | undefined>(undefined);

export function TextScaleProvider({ children }: { children: ReactNode }) {
  const [fixedTextScale, setFixedTextScaleState] = useState(readFixedTextScale);

  // Runs before paint, so there is no flash of oversized text while the app opens.
  useLayoutEffect(() => {
    writeFixedTextScale(fixedTextScale);
    applyFixedTextScale(fixedTextScale);
  }, [fixedTextScale]);

  const setFixedTextScale = useCallback((fixed: boolean) => setFixedTextScaleState(fixed), []);
  const toggleFixedTextScale = useCallback(() => setFixedTextScaleState((prev) => !prev), []);

  const value = useMemo(() => ({
    fixedTextScale,
    setFixedTextScale,
    toggleFixedTextScale,
  }), [fixedTextScale, setFixedTextScale, toggleFixedTextScale]);

  return (
    <TextScaleContext.Provider value={value}>
      {children}
    </TextScaleContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTextScale() {
  const ctx = useContext(TextScaleContext);
  if (!ctx) throw new Error('useTextScale must be used within TextScaleProvider');
  return ctx;
}
