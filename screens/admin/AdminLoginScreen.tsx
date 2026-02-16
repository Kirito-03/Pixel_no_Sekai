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
    const [isLoading, setIsLoading] = useState(false);
    const { loginAsAdmin, isAdmin } = useAdmin();
    const navigation = useNavigation();

    // Redirigir automáticamente si ya es admin
    React.useEffect(() => {
        if (isAdmin) {
            navigation.reset({
                index: 0,
                routes: [{
                    name: 'Admin',
                    params: { screen: 'AdminDashboard' }
                } as any]
            });
        }
    }, [isAdmin]);

    const handleGoogleLogin = async () => {
        try {
            setIsLoading(true);
            await loginAsAdmin();

            // Navigate to admin dashboard on success
            // Navigate to admin dashboard on success (via MainTabs)
            // Navigate to admin dashboard on success (via MainTabs)
            navigation.reset({
                index: 0,
                routes: [{
                    name: 'Admin',
                    params: { screen: 'AdminDashboard' }
                } as any]
            });
        } catch (error: any) {
            setIsLoading(false);
            Alert.alert(
                'Error de Autenticación',
                error.message || 'No se pudo iniciar sesión. Por favor, intenta de nuevo.',
                [{ text: 'OK' }]
            );
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                {/* Logo/Header */}
                <View style={styles.header}>
                    <View style={styles.iconContainer}>
                        <Ionicons name="shield-checkmark" size={64} color="#0A2342" />
                    </View>
                    <Text style={styles.title}>Admin Panel</Text>
                    <Text style={styles.subtitle}>Pixel No Sekai</Text>
                </View>

                {/* Login Section */}
                <View style={styles.loginSection}>
                    <Text style={styles.loginTitle}>Iniciar Sesión</Text>
                    <Text style={styles.loginSubtitle}>
                        Acceso exclusivo para administradores
                    </Text>

                    {/* Google Login Button */}
                    <TouchableOpacity
                        style={styles.googleButton}
                        onPress={handleGoogleLogin}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <ActivityIndicator color="#0A2342" />
                        ) : (
                            <>
                                <Image
                                    source={{ uri: 'https://www.google.com/favicon.ico' }}
                                    style={styles.googleIcon}
                                />
                                <Text style={styles.googleButtonText}>Continuar con Google</Text>
                            </>
                        )}
                    </TouchableOpacity>

                    {/* Info Box */}
                    <View style={styles.infoBox}>
                        <Ionicons name="information-circle" size={20} color="#0A2342" />
                        <Text style={styles.infoText}>
                            Solo los administradores autorizados pueden acceder a este panel.
                        </Text>
                    </View>
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
