import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';

import { useColorScheme } from '@/hooks/use-color-scheme';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

  // 🔍 Simulamos verificación de sesión
  useEffect(() => {
    setTimeout(() => {
      setIsLoggedIn(false); // cambia a true si el usuario ya tiene sesión guardada
    }, 1000);
  }, []);

  if (isLoggedIn === null) {
    // Mientras se “verifica” sesión
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        {/* 👇 Si no está logueado, mostramos login */}
        {!isLoggedIn ? (
          <Stack.Screen name="login" />
        ) : (
          // 👇 Si está logueado, mostramos las tabs
          <Stack.Screen name="(tabs)" />
        )}

        {/* El modal sigue igual */}
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
