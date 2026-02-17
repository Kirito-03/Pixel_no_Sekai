import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAdmin } from '../../contexts/AdminContext';
import { useNavigation } from '@react-navigation/native';

export default function AdminLoginScreen() {
    const [isLoading, setIsLoading] = useState(true); // Start loading immediately
    const { isAdmin, checkAdminStatus } = useAdmin();
    const navigation = useNavigation();

    // Intentar login automático al montar
    React.useEffect(() => {
        const tryAutoLogin = async () => {
            if (isAdmin) {
                navigation.reset({
                    index: 0,
                    routes: [{ name: 'Admin', params: { screen: 'AdminDashboard' } } as any]
                });
                return;
            }

            // Forzar chequeo (que ahora incluye el sync con firebase)
            const success = await checkAdminStatus();
            if (success) {
                navigation.reset({
                    index: 0,
                    routes: [{ name: 'Admin', params: { screen: 'AdminDashboard' } } as any]
                });
            } else {
                setIsLoading(false); // Solo mostrar UI si falló el auto-login
            }
        };

        tryAutoLogin();
    }, [isAdmin]);

    const handleRetry = async () => {
        setIsLoading(true);
        const success = await checkAdminStatus();
        if (!success) {
            setIsLoading(false);
            Alert.alert('Acceso Denegado', 'No tienes permisos de administrador.');
        }
    };

    if (isLoading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.content}>
                    <ActivityIndicator size="large" color="#0A2342" />
                    <Text style={{ textAlign: 'center', marginTop: 20, color: '#666' }}>
                        Verificando credenciales...
                    </Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                <View style={styles.header}>
                    <View style={styles.iconContainer}>
                        <Ionicons name="lock-closed" size={64} color="#e50914" />
                    </View>
                    <Text style={styles.title}>Acceso Restringido</Text>
                    <Text style={styles.subtitle}>Solo personal autorizado</Text>
                </View>

                <View style={styles.loginSection}>
                    <Text style={styles.infoText}>
                        No pudimos verificar tus permisos de administrador automáticamente.
                    </Text>
                    
                    <TouchableOpacity
                        style={styles.googleButton}
                        onPress={handleRetry}
                    >
                        <Text style={styles.googleButtonText}>Reintentar Verificación</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.googleButton, { backgroundColor: '#666', marginTop: 10 }]}
                        onPress={() => navigation.goBack()}
                    >
                        <Text style={styles.googleButtonText}>Volver</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8F9FA',
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        padding: 24,
    },
    header: {
        alignItems: 'center',
        marginBottom: 48,
    },
    iconContainer: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    title: {
        fontSize: 32,
        fontWeight: '700',
        color: '#0A2342',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: '#666666',
        fontWeight: '400',
    },
    loginSection: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 32,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 6,
    },
    loginTitle: {
        fontSize: 24,
        fontWeight: '600',
        color: '#1a1a1a',
        marginBottom: 8,
    },
    loginSubtitle: {
        fontSize: 14,
        color: '#666666',
        marginBottom: 32,
    },
    googleButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFFFFF',
        borderWidth: 1.5,
        borderColor: '#e0e0e0',
        borderRadius: 12,
        padding: 16,
        marginBottom: 24,
    },
    googleIcon: {
        width: 24,
        height: 24,
        marginRight: 12,
    },
    googleButtonText: {
        fontSize: 16,
        fontWeight: '500',
        color: '#1a1a1a',
    },
    infoBox: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: '#F8F9FA',
        borderRadius: 12,
        padding: 16,
        gap: 12,
    },
    infoText: {
        flex: 1,
        fontSize: 13,
        color: '#666666',
        lineHeight: 20,
    },
});
