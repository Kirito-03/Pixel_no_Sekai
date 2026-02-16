import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './navigation/AppNavigator';
import { ProfileProvider } from './contexts/ProfileContext';
import { MyListProvider } from './contexts/MyListContext';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { AdminProvider } from './contexts/AdminContext';

function ThemedStatusBar() {
  const { theme } = useTheme();
  return <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />;
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <AdminProvider>
            <ProfileProvider>
              <MyListProvider>
                <AppNavigator />
                <ThemedStatusBar />
              </MyListProvider>
            </ProfileProvider>
          </AdminProvider>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
