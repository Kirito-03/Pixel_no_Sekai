import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { View, ActivityIndicator } from 'react-native';

import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import ProfileSelectionScreen from '../screens/ProfileSelectionScreen';
import HomeScreen from '../screens/HomeScreen';
import SearchScreen from '../screens/SearchScreen';
import ProfileScreen from '../screens/ProfileScreen';
import CategoryScreen from '../screens/CategoryScreen';
import MyListScreen from '../screens/MyListScreen';
import DownloadsScreen from '../screens/DownloadsScreen';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useProfile } from '../contexts/ProfileContext';

const RootStack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const HomeStack = createNativeStackNavigator();

function HomeNavigator() {
  return (
    <HomeStack.Navigator screenOptions={{ headerShown: false }}>
      <HomeStack.Screen name="HomeScreen" component={HomeScreen as any} />
      <HomeStack.Screen name="Category" component={CategoryScreen as any} />
      <HomeStack.Screen name="MyList" component={MyListScreen as any} />
    </HomeStack.Navigator>
  );
}

function MainTabs({ route }: { route: any }) {
  const { colors } = useTheme();
  const { selectedProfile, userId } = route.params || {};
  
  // Importar useProfile hook
  const { setCurrentProfile, currentProfile } = require('../contexts/ProfileContext').useProfile();
  
  // Establecer el perfil seleccionado cuando se monta el componente
  React.useEffect(() => {
    if (!selectedProfile) {
      if (!currentProfile) {
        console.log('MainTabs: No profile found, should redirect to ProfileSelection');
      }
      return;
    }

    // Si no hay perfil en contexto aún, establecer el seleccionado
    if (!currentProfile) {
      console.log('MainTabs: No currentProfile; setting from selectedProfile:', selectedProfile);
      setCurrentProfile(selectedProfile);
      return;
    }

    // Si el ID difiere, cambiar de perfil
    if (selectedProfile.id !== currentProfile.id) {
      console.log('MainTabs: Different profile id; switching to selectedProfile:', {
        from: currentProfile,
        to: selectedProfile,
      });
      setCurrentProfile(selectedProfile);
      return;
    }

    // Mismo perfil: evitar sobreescribir datos más recientes del contexto (ej. avatar actualizado)
    if (selectedProfile.avatar_url !== currentProfile.avatar_url) {
      console.log('MainTabs: Same profile id; ignoring stale selectedProfile avatar_url. Keeping currentProfile avatar.', {
        selectedProfileAvatar: selectedProfile.avatar_url,
        currentProfileAvatar: currentProfile.avatar_url,
      });
      return;
    }

    // Mismo perfil y misma info; no hacer nada
    console.log('MainTabs: Profile already set and matches selectedProfile. No action.');
  }, [selectedProfile, currentProfile, setCurrentProfile]);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: colors.card },
        tabBarActiveTintColor: colors.text,
        tabBarInactiveTintColor: colors.textGray,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeNavigator}
        options={{
          tabBarIcon: ({ color }) => <Ionicons name="home" size={24} color={color} />,
          tabBarLabel: 'Inicio',
        }}
      />
      <Tab.Screen
        name="Search"
        component={SearchScreen}
        options={{
          tabBarIcon: ({ color }) => <Ionicons name="search" size={24} color={color} />,
          tabBarLabel: 'Buscar',
        }}
      />
      <Tab.Screen
        name="MyList"
        component={MyListScreen as any}
        options={{
          tabBarIcon: ({ color }) => <Ionicons name="bookmark" size={24} color={color} />,
          tabBarLabel: 'Mi Lista',
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ color }) => <Ionicons name="person-circle" size={24} color={color} />,
          tabBarLabel: 'Mi perfil',
        }}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { colors } = useTheme();
  const { user, isLoading } = useAuth();
  const { currentProfile, loadCurrentProfile } = useProfile();
  const [initialRoute, setInitialRoute] = React.useState<string | null>(null);

  useEffect(() => {
    const determineInitialRoute = async () => {
      if (isLoading) {
        return;
      }

      if (!user) {
        setInitialRoute('Login');
        return;
      }

      // Si hay usuario, verificar si hay perfil guardado
      await loadCurrentProfile();
      
      // Esperar un momento para que el estado se actualice
      setTimeout(() => {
        if (currentProfile) {
          // Si hay perfil guardado, ir directamente a Main
          setInitialRoute('Main');
        } else {
          // Si no hay perfil, ir a selección de perfil
          setInitialRoute('ProfileSelection');
        }
      }, 100);
    };

    determineInitialRoute();
  }, [user, isLoading]);

  // Mostrar loading mientras se determina la ruta inicial
  if (isLoading || initialRoute === null) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <RootStack.Navigator 
        screenOptions={{ headerShown: false }}
        initialRouteName={initialRoute}
      >
        <RootStack.Screen name="Login" component={LoginScreen} />
        <RootStack.Screen name="Register" component={RegisterScreen} />
        <RootStack.Screen 
          name="ProfileSelection" 
          component={ProfileSelectionScreen as any}
        />
        <RootStack.Screen name="Main" component={MainTabs} />
        {/* Apariencia */}
        <RootStack.Screen name="Appearance" component={require('../screens/AppearanceScreen').default} />
        <RootStack.Screen name="Downloads" component={DownloadsScreen as any} />
      </RootStack.Navigator>
    </NavigationContainer>
  );
}

