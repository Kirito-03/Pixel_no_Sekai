// Paletas de color para soportar modo oscuro y claro
export const darkColors = {
  primary: '#E50914',      // Rojo Netflix
  secondary: '#B20710',    // Rojo oscuro
  background: '#000000',    // Negro
  card: '#141414',         // Gris oscuro
  cardLight: '#1a1a1a',    // Gris oscuro claro
  text: '#FFFFFF',         // Blanco
  textGray: '#808080',     // Gris
  textLight: '#b3b3b3',    // Gris claro
  overlay: 'rgba(0, 0, 0, 0.7)', // Overlay oscuro
};

export const lightColors = {
  primary: '#E50914',
  secondary: '#B20710',
  background: '#FFFFFF',
  card: '#F4F4F4',
  cardLight: '#FAFAFA',
  text: '#000000',
  textGray: '#666666',
  textLight: '#999999',
  overlay: 'rgba(255, 255, 255, 0.7)',
};

// Compatibilidad: exportar 'colors' por defecto usando paleta oscura.
// Esto evita romper componentes que aún no usan ThemeContext.
export const colors = darkColors;

// Gradientes predefinidos para efectos premium
export const gradients = {
  primary: ['#E50914', '#B20710'],
  primaryVertical: ['#E50914', '#B20710'],
  dark: ['rgba(0,0,0,0)', 'rgba(0,0,0,0.9)'],
  darkReverse: ['rgba(0,0,0,0.9)', 'rgba(0,0,0,0)'],
  shimmer: ['#1a1a1a', '#2a2a2a', '#1a1a1a'],
  overlay: ['transparent', 'rgba(0,0,0,0.8)'],
  overlayTop: ['rgba(0,0,0,0.6)', 'transparent'],
};

// Sombras predefinidas para consistencia
export const shadows = {
  none: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 12,
  },
  glow: {
    shadowColor: '#E50914',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  glowSoft: {
    shadowColor: '#E50914',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
};

// Border radius escalable
export const borderRadius = {
  xs: 2,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 20,
  full: 9999,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

