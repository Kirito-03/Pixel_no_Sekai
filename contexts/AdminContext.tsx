import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { adminAuthService } from '../services/adminAuthService';

interface AdminUser {
    id: number;
    email: string;
    name: string;
    picture?: string;
}

interface AdminContextType {
    isAdmin: boolean;
    adminUser: AdminUser | null;
    isLoading: boolean;
    loginAsAdmin: () => Promise<void>;
    logoutAdmin: () => Promise<void>;
    checkAdminStatus: () => Promise<boolean>;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

interface AdminProviderProps {
    children: ReactNode;
}

export const ADMIN_EMAILS = [
    'leojuniorss.8lj@gmail.com',
    'pixel@dragonfluxstudios.com'
];

export const AdminProvider: React.FC<AdminProviderProps> = ({ children }) => {
    const [isAdmin, setIsAdmin] = useState(false);
    const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Check admin status on mount
    // Obtener usuario del contexto de autenticación para reaccionar a cambios (login/logout)
    // Usamos require para evitar ciclos de importación si AuthContext usa AdminContext (aunque aquí parece seguro)
    // Pero mejor usar el hook expuesto si es posible, o simplemente suscribirse a firebase auth direct
    // Dado que AuthProvider envuelve a AdminProvider, podemos usar useAuth?
    // Sí, App.tsx muestra AuthProvider > AdminProvider.

    // Sin embargo, para evitar dependencias circulares si las hubiera, vamos a usar un listener de firebase simple o 
    // mejor aún, aceptar que AdminProvider se actualice cuando AuthContext cambie si lo consumimos.

    // Vamos a importar useAuth dinámicamente o asumir que el componente se renderiza.
    // Para simplificar y asegurar que funciona:

    useEffect(() => {
        const unsubscribe = require('../services/firebase').auth.onAuthStateChanged((user: any) => {
            console.log('AdminContext: Auth state changed, re-checking admin status', user?.email);
            checkAdminStatus();
        });
        return unsubscribe;
    }, []);

    const checkAdminStatus = async (): Promise<boolean> => {
        try {
            setIsLoading(true);

            // 1. Check if we have a firebase user and sync with backend
            const currentUser = require('../services/firebase').auth.currentUser;
            if (currentUser) {
                // Verificar preliminarmente si el email está permitido (opcional, pero ahorra requests)
                // Usamos la API del backend para saber si está permitido o si tenemos el array local
                // Pero lo importante es obtener el token del backend.

                // Obtener ID Token de Firebase
                const idToken = await currentUser.getIdToken(true); // force refresh

                // Intentar login silencioso con backend
                const result = await adminAuthService.loginWithFirebaseToken(idToken);

                if (result.success && result.token && result.user) {
                    await AsyncStorage.setItem('admin_token', result.token);
                    setIsAdmin(true);
                    setAdminUser(result.user);
                    return true;
                }
            }

            // 2. Fallback to stored token (if user not logged in via firebase but has token?)
            // Esto es raro si queremos single login, pero mantenemos por si acaso.
            const token = await AsyncStorage.getItem('admin_token');
            if (!token) {
                setIsAdmin(false);
                setAdminUser(null);
                return false;
            }

            // Verify token with backend
            const user = await adminAuthService.verifyToken(token);

            if (user && ADMIN_EMAILS.includes(user.email)) {
                setIsAdmin(true);
                setAdminUser(user);
                return true;
            } else {
                await AsyncStorage.removeItem('admin_token');
                setIsAdmin(false);
                setAdminUser(null);
                return false;
            }
        } catch (error) {
            console.error('Error checking admin status:', error);
            setIsAdmin(false);
            setAdminUser(null);
            return false;
        } finally {
            setIsLoading(false);
        }
    };

    const loginAsAdmin = async () => {
        try {
            setIsLoading(true);
            const result = await adminAuthService.authenticateWithGoogle();

            if (result.success && result.user && result.token) {
                // Verify email is authorized
                if (!ADMIN_EMAILS.includes(result.user.email)) {
                    throw new Error('Email no autorizado para acceso de administrador');
                }

                // Store token
                await AsyncStorage.setItem('admin_token', result.token);

                setIsAdmin(true);
                setAdminUser(result.user);
            } else {
                throw new Error(result.error || 'Autenticación fallida');
            }
        } catch (error: any) {
            console.error('Error logging in as admin:', error);
            setIsAdmin(false);
            setAdminUser(null);
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    const logoutAdmin = async () => {
        try {
            await AsyncStorage.removeItem('admin_token');
            setIsAdmin(false);
            setAdminUser(null);
        } catch (error) {
            console.error('Error logging out admin:', error);
        }
    };

    const value: AdminContextType = {
        isAdmin,
        adminUser,
        isLoading,
        loginAsAdmin,
        logoutAdmin,
        checkAdminStatus,
    };

    return (
        <AdminContext.Provider value={value}>
            {children}
        </AdminContext.Provider>
    );
};

export const useAdmin = (): AdminContextType => {
    const context = useContext(AdminContext);
    if (context === undefined) {
        throw new Error('useAdmin must be used within an AdminProvider');
    }
    return context;
};
