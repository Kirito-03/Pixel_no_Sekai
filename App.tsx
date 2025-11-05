/**
 * Archivo raíz de la aplicación (Expo / React Native).
 *
 * ¿Para qué es?
 * - Orquesta los proveedores de contexto de Tema, Autenticación, Perfil y "Mi Lista".
 * - Monta el navegador principal de la app (AppNavigator).
 * - Ajusta el StatusBar automáticamente según el tema activo.
 *
 * ¿Cómo funciona?
 * - App envuelve AppNavigator dentro de ThemeProvider, AuthProvider, ProfileProvider y MyListProvider.
 * - ThemedStatusBar usa el hook useTheme para elegir el estilo del StatusBar (claro u oscuro).
 * - Este componente no gestiona estado propio; el estado global vive en los contextos.
 */
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import AppNavigator from './navigation/AppNavigator';
import { ProfileProvider } from './contexts/ProfileContext';
import { MyListProvider } from './contexts/MyListContext';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';

// Componente auxiliar para que el StatusBar refleje el tema actual.
// Si el tema es "dark", usamos estilo de barra "light" para contraste, y viceversa.
function ThemedStatusBar() {
  const { theme } = useTheme();
  return <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />;
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ProfileProvider>
          <MyListProvider>
            <AppNavigator />
            <ThemedStatusBar />
          </MyListProvider>
        </ProfileProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
