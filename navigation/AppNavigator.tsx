import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import ProfileSelectionScreen from '../screens/ProfileSelectionScreen';
import HomeScreen from '../screens/HomeScreen';
import SearchScreen from '../screens/SearchScreen';
import ProfileScreen from '../screens/ProfileScreen';
import CategoryScreen from '../screens/CategoryScreen';
import MyListScreen from '../screens/MyListScreen';
import { colors } from '../theme';

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
  const { selectedProfile, userId } = route.params || {};
  
  // Importar useProfile hook
  const { setCurrentProfile } = require('../contexts/ProfileContext').useProfile();
  
  // Establecer el perfil seleccionado cuando se monta el componente
  React.useEffect(() => {
    if (selectedProfile) {
      console.log('MainTabs: Setting selected profile:', selectedProfile);
      setCurrentProfile(selectedProfile);
    }
  }, [selectedProfile, setCurrentProfile]);

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
        component={MyListScreen}
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
          tabBarLabel: 'Mi DSIview',
        }}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        <RootStack.Screen name="Login" component={LoginScreen} />
        <RootStack.Screen name="Register" component={RegisterScreen} />
        <RootStack.Screen name="ProfileSelection" component={ProfileSelectionScreen} />
        <RootStack.Screen name="Main" component={MainTabs} />
      </RootStack.Navigator>
    </NavigationContainer>
  );
}

