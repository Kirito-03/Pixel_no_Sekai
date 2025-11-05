// Temporal: shim de tipos para @expo/vector-icons mientras el paquete se instala correctamente.
// Esto evita errores de TypeScript "Cannot find module '@expo/vector-icons' or its corresponding type declarations".
// En producción, instala el paquete con:
//   - npx expo install @expo/vector-icons
//   - o npm install @expo/vector-icons
// y asegura que node_modules esté presente.

declare module '@expo/vector-icons' {
  // Exportaciones comunes. Tipado laxo para no bloquear el build.
  export const Ionicons: any;
  export const MaterialIcons: any;
  export const FontAwesome: any;
  export const Entypo: any;
  export const Feather: any;
  export const AntDesign: any;
}