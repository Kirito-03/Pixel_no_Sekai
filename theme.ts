/**
 * Definición de paletas de color y espaciados de la UI.
 *
 * ¿Para qué es?
 * - Proveer colores para modo oscuro y claro y una escala de spacing usada por la aplicación.
 * - Mantener compatibilidad con componentes que aún lean 'colors' directamente.
 *
 * ¿Cómo funciona?
 * - darkColors y lightColors describen paletas por modo.
 * - spacing expone tamaños estándar.
 * - colors exporta por defecto la paleta oscura para compatibilidad hasta que todo use ThemeContext.
 */
// Paletas de color para soportar modo oscuro y claro
export const darkColors = {
  primary: '#E50914',      // Rojo Netflix
  background: '#000000',    // Negro
  card: '#141414',         // Gris oscuro
  text: '#FFFFFF',         // Blanco
  textGray: '#808080',     // Gris
};

export const lightColors = {
  primary: '#E50914',
  background: '#FFFFFF',
  card: '#F4F4F4',
  text: '#000000',
  textGray: '#666666',
};

// Compatibilidad: exportar 'colors' por defecto usando paleta oscura.
// Esto evita romper componentes que aún no usan ThemeContext.
export const colors = darkColors;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

