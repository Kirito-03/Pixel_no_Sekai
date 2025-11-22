import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { subscribeAuth, logout as firebaseLogout } from '../services/auth';

interface User {
  uid: string;
  email: string | null;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (user: User) => Promise<void>;
  logout: () => Promise<void>;
  loadSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadSession = async () => {
    try {
      console.log('AuthContext: Loading session...');
      const stored = await AsyncStorage.getItem('userSession');
      if (stored) {
        const parsed = JSON.parse(stored);
        setUser(parsed);
      }
      subscribeAuth(async (firebaseUser) => {
        if (firebaseUser) {
          const u: User = { uid: firebaseUser.uid, email: firebaseUser.email };
          setUser(u);
          await AsyncStorage.setItem('userSession', JSON.stringify(u));
        } else {
          setUser(null);
          await AsyncStorage.removeItem('userSession');
          await AsyncStorage.removeItem('currentProfile');
        }
      });
    } catch (error) {
      console.error('Error loading session:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (userData: User) => {
    setUser(userData);
    await AsyncStorage.setItem('userSession', JSON.stringify(userData));
  };

  const logout = async () => {
    console.log('AuthContext: Logging out user');
    try {
      await firebaseLogout();
    } catch (e) {}
    setUser(null);
    await AsyncStorage.removeItem('userSession');
    // También limpiar el perfil actual
    await AsyncStorage.removeItem('currentProfile');
    console.log('AuthContext: Session removed from AsyncStorage');
  };

  useEffect(() => {
    loadSession();
  }, []);

  const value: AuthContextType = {
    user,
    isLoading,
    login,
    logout,
    loadSession,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

