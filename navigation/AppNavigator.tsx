import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import ProfileSelectionScreen from '../screens/ProfileSelectionScreen';
import HomeScreen from '../screens/HomeScreen';
import SearchScreen from '../screens/SearchScreen';
import ProfileScreen from '../screens/ProfileScreen';
import CategoryScreen from '../screens/CategoryScreen';
import MyListScreen from '../screens/MyListScreen';
import DownloadsScreen from '../screens/DownloadsScreen';
import AdminLoginScreen from '../screens/admin/AdminLoginScreen';
import AdminDashboardScreen from '../screens/admin/AdminDashboardScreen';
import AnimeListScreen from '../screens/admin/AnimeListScreen';
import AnimeFormScreen from '../screens/admin/AnimeFormScreen';
import EpisodeManagerScreen from '../screens/admin/EpisodeManagerScreen';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useProfile } from '../contexts/ProfileContext';
import { useAdmin } from '../contexts/AdminContext';
import { LoadingScreen } from '../components/LoadingScreen';

const RootStack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const HomeStack = createNativeStackNavigator();
const AdminStack = createNativeStackNavigator();

function HomeNavigator() {
  return (
    <HomeStack.Navigator screenOptions={{ headerShown: false }}>
      <HomeStack.Screen name="Inicio" component={HomeScreen as any} />
      <HomeStack.Screen name="Categoria" component={CategoryScreen as any} />
      <HomeStack.Screen name="MiLista" component={MyListScreen as any} />
    </HomeStack.Navigator>
  );
}

function AdminNavigator() {
  return (
    <AdminStack.Navigator screenOptions={{ headerShown: false }}>
      <AdminStack.Screen name="AdminLogin" component={AdminLoginScreen as any} />
      <AdminStack.Screen name="AdminDashboard" component={AdminDashboardScreen as any} />
      <AdminStack.Screen name="AnimeList" component={AnimeListScreen as any} />
      <AdminStack.Screen name="AnimeForm" component={AnimeFormScreen as any} />
      <AdminStack.Screen name="EpisodeManager" component={EpisodeManagerScreen as any} />
    </AdminStack.Navigator>
  );
}

function MainTabs({ route }: { route: any }) {
  const { colors } = useTheme();
  const { selectedProfile, userId } = route.params || {};
  const { isAdmin } = useAdmin();

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
      console.log('MainTabs: No currentProfile; setting from selectedProfile ID:', selectedProfile.id);
      setCurrentProfile(selectedProfile);
      return;
    }

    // Si el ID difiere, cambiar de perfil
    if (selectedProfile.id !== currentProfile.id) {
      console.log('MainTabs: Different profile id; switching:', {
        fromId: currentProfile.id,
        toId: selectedProfile.id,
      });
      setCurrentProfile(selectedProfile);
      return;
    }

    // Mismo perfil: evitar sobreescribir datos más recientes del contexto (ej. avatar actualizado)
    if (selectedProfile.avatar_url !== currentProfile.avatar_url) {
      console.log('MainTabs: Same profile id; keeping current avatar (ID:', currentProfile.id, ')');
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
        name="Inicio"
        component={HomeNavigator}
        options={{
          tabBarIcon: ({ color }) => <Ionicons name="home" size={24} color={color} />,
          tabBarLabel: 'Inicio',
        }}
      />
      <Tab.Screen
        name="Buscar"
        component={SearchScreen}
        options={{
          tabBarIcon: ({ color }) => <Ionicons name="search" size={24} color={color} />,
          tabBarLabel: 'Buscar',
        }}
      />
      <Tab.Screen
        name="MiLista"
        component={MyListScreen as any}
        options={{
          tabBarIcon: ({ color }) => <Ionicons name="bookmark" size={24} color={color} />,
          tabBarLabel: 'Mi Lista',
        }}
      />
      <Tab.Screen
        name="Perfil"
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
  const [isReady, setIsReady] = React.useState(false);
  const [initialState, setInitialState] = React.useState();

  // Load navigation state on mount
  useEffect(() => {
    const restoreState = async () => {
      try {
        const savedStateString = await AsyncStorage.getItem('NAVIGATION_STATE');
        const state = savedStateString ? JSON.parse(savedStateString) : undefined;

        if (state !== undefined) {
          setInitialState(state);
        }
      } catch (e) {
        console.error('Error loading navigation state:', e);
      } finally {
        setIsReady(true);
      }
    };

    if (!isReady) {
      restoreState();
    }
  }, [isReady]);

  useEffect(() => {
    const determineInitialRoute = async () => {
      // Must wait for Auth AND Persistence to be ready
      if (isLoading || !isReady) {
        return;
      }

      // 1. If we have a restored state, prioritize it!
      if (initialState) {
        // If user is logged out but state is for internal screens, React Nav might handle it 
        // by resetting to restricted screens, or we should verify user.
        // For now, assuming if user exists, state is valid.
        if (user) {
          console.log('AppNavigator: Using restored state');
          setInitialRoute('RESTORED_STATE');
          return;
        }
        // If no user, we ignore state and force Login
      }

      if (!user) {
        // Delay mínimo para mostrar animación de carga
        setTimeout(() => setInitialRoute('Ingreso'), 2000);
        return;
      }

      // Si hay usuario, verificar si hay perfil guardado
      await loadCurrentProfile();

      // Esperar + delay mínimo de 2s para ver la animación
      setTimeout(() => {
        if (currentProfile) {
          // Si hay perfil guardado, ir directamente a Principal
          setInitialRoute('Principal');
        } else {
          // Si no hay perfil, ir a selección de perfil
          setInitialRoute('SeleccionPerfil');
        }
      }, 2100);
    };

    determineInitialRoute();
  }, [user, isLoading, isReady, initialState]);

  // Mostrar loading mientras se determina la ruta inicial
  if (isLoading || !isReady || initialRoute === null) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer
      initialState={initialState}
      onStateChange={(state) => {
        AsyncStorage.setItem('NAVIGATION_STATE', JSON.stringify(state));
      }}
    >
      <RootStack.Navigator
        screenOptions={{ headerShown: false }}
        initialRouteName={initialRoute === 'RESTORED_STATE' ? undefined : initialRoute}
      >
        {!user ? (
          <>
            <RootStack.Screen name="Ingreso" component={LoginScreen} />
            <RootStack.Screen name="Registro" component={RegisterScreen} />
          </>
        ) : (
          <>
            <RootStack.Screen
              name="SeleccionPerfil"
              component={ProfileSelectionScreen as any}
            />
            <RootStack.Screen name="Principal" component={MainTabs} />
            <RootStack.Screen name="Apariencia" component={require('../screens/AppearanceScreen').default} />
            <RootStack.Screen name="Descargas" component={DownloadsScreen as any} />
            <RootStack.Screen name="AdminPortal" component={AdminLoginScreen} />
            <RootStack.Screen name="Admin" component={AdminNavigator} />
          </>
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
}
