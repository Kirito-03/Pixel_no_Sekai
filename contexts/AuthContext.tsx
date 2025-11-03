import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import databaseService from '../services/databaseService';

interface User {
  id: number;
  email: string;
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
      const userData = await AsyncStorage.getItem('userSession');
      console.log('AuthContext: User data from storage:', userData);
      if (userData) {
        const parsedUser = JSON.parse(userData);
        console.log('AuthContext: Parsed user:', parsedUser);
        // Validar contra backend para evitar sesiones fantasma
        try {
          const valid = await databaseService.validateUser(parsedUser.id);
          if (valid) {
            console.log('AuthContext: Server validated user session');
            setUser(parsedUser);
          } else {
            console.warn('AuthContext: Stored session user no longer exists. Clearing session.');
            await AsyncStorage.removeItem('userSession');
            await AsyncStorage.removeItem('currentProfile');
            setUser(null);
          }
        } catch (validationError) {
          console.error('AuthContext: Error validating session with server:', validationError);
          // En caso de error 404 ya se maneja como null arriba
          // Para otros errores de red, mantener comportamiento previo (no bloquear el uso offline)
          setUser(parsedUser);
        }
      } else {
        console.log('AuthContext: No session found in storage');
      }
    } catch (error) {
      console.error('Error loading session:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (userData: User) => {
    console.log('AuthContext: Logging in user:', userData);
    setUser(userData);
    await AsyncStorage.setItem('userSession', JSON.stringify(userData));
    console.log('AuthContext: Session saved to AsyncStorage');
  };

  const logout = async () => {
    console.log('AuthContext: Logging out user');
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

