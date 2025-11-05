/**
 * Contexto de Tema (dark/light).
 *
 * ¿Para qué es?
 * - Expone el tema actual, paleta de colores y espaciados para estilizar la app.
 * - Permite alternar entre modo oscuro y claro y fijar explícitamente un tema.
 *
 * ¿Cómo funciona?
 * - Mantiene el estado 'theme' y deriva 'colors' con useMemo desde theme (darkColors/lightColors).
 * - 'spacing' se exporta desde theme.ts y se expone tal cual.
 * - useTheme arroja error si se usa fuera de ThemeProvider para asegurar contexto válido.
 */
import React, { createContext, useContext, useMemo, useState, ReactNode } from 'react';
import { darkColors, lightColors, spacing as baseSpacing } from '../theme';

type ThemeName = 'dark' | 'light';

interface ThemeContextValue {
  theme: ThemeName;
  colors: typeof darkColors;
  spacing: typeof baseSpacing;
  toggleTheme: () => void;
  setTheme: (t: ThemeName) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeName>('dark');

  const setTheme = (t: ThemeName) => setThemeState(t);
  const toggleTheme = () => setThemeState(prev => (prev === 'dark' ? 'light' : 'dark'));

  const colors = useMemo(() => (theme === 'dark' ? darkColors : lightColors), [theme]);
  const spacing = baseSpacing;

  const value: ThemeContextValue = {
    theme,
    colors,
    spacing,
    toggleTheme,
    setTheme,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
}