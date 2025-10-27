import React from 'react';
import { StatusBar } from 'expo-status-bar';
import AppNavigator from './navigation/AppNavigator';
import { ProfileProvider } from './contexts/ProfileContext';
import { MyListProvider } from './contexts/MyListContext';

export default function App() {
  return (
    <ProfileProvider>
      <MyListProvider>
        <AppNavigator />
        <StatusBar style="light" />
      </MyListProvider>
    </ProfileProvider>
  );
}
