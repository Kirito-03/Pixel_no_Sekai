import React, { useState } from 'react';
import { View, Text, Switch, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { auth } from '../../services/firebase';
import { SubNav } from './SubNav';

const accountTabs = [
    { id: 'personal', label: 'Información Personal' },
    { id: 'preferences', label: 'Preferencias' },
];

const securityTabs = [
    { id: 'history', label: 'Historial de Sesiones' },
    { id: 'devices', label: 'Dispositivos Activos' },
];

export const ContentPanel = ({
    styles,
    activeTab,
    user,
    handleEmailVerification,
    handlePasswordReset,
    adultContentEnabled,
    setAdultContentEnabled,
    colors,
    theme,
    notificationsEnabled,
    setNotificationsEnabled,
    handleChangeProfile,
    navigation,
    handleAdminAccess,
}: any) => {
    const [accountSubTab, setAccountSubTab] = useState('personal');
    const [securitySubTab, setSecuritySubTab] = useState('history');

    const renderAccountContent = () => {
        switch (accountSubTab) {
            case 'personal':
                return (
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Detalles de la Cuenta</Text>
                        <View style={styles.row}>
                            <View>
                                <Text style={styles.rowLabel}>Email</Text>
                                <Text style={styles.rowDesc}>{user?.email}</Text>
                            </View>
                            {!auth.currentUser?.emailVerified && (
                                <TouchableOpacity style={styles.actionBtn} onPress={handleEmailVerification}>
                                    <Text style={styles.actionBtnText}>Verificar</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                        <View style={styles.row}>
                            <View>
                                <Text style={styles.rowLabel}>Contraseña</Text>
                                <Text style={styles.rowDesc}>*************</Text>
                            </View>
                            <TouchableOpacity style={styles.actionBtn} onPress={handlePasswordReset}>
                                <Text style={styles.actionBtnText}>Cambiar</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                );
            case 'preferences':
                return (
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Preferencias de Contenido</Text>
                        <View style={styles.row}>
                            <View>
                                <Text style={styles.rowLabel}>Contenido +18</Text>
                                <Text style={styles.rowDesc}>Mostrar contenido para adultos y NSFW</Text>
                            </View>
                            <Switch
                                value={adultContentEnabled}
                                onValueChange={setAdultContentEnabled}
                                trackColor={{ false: '#767577', true: colors.primary }}
                                thumbColor={adultContentEnabled ? '#00d4ff' : '#f4f3f4'}
                            />
                        </View>
                    </View>
                );
            default:
                return null;
        }
    };

    const renderSecurityContent = () => {
        switch (securitySubTab) {
            case 'history':
                return (
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Historial de Inicio de Sesión</Text>
                        <View style={styles.row}>
                            <View>
                                <Text style={styles.rowLabel}>Chrome en Windows 11</Text>
                                <Text style={styles.rowDesc}>Ubicación: Lima, Perú (IP: 192.168.1.1)</Text>
                            </View>
                            <Text style={styles.rowDesc}>Ahora</Text>
                        </View>
                        <View style={styles.row}>
                            <View>
                                <Text style={styles.rowLabel}>App de Android</Text>
                                <Text style={styles.rowDesc}>Ubicación: Arequipa, Perú (IP: 200.48.225.10)</Text>
                            </View>
                            <Text style={styles.rowDesc}>Ayer</Text>
                        </View>
                    </View>
                );
            case 'devices':
                return (
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Dispositivos Activos</Text>
                        <View style={styles.row}>
                            <View>
                                <Text style={styles.rowLabel}>Este Dispositivo (Chrome en Windows)</Text>
                                <Text style={styles.rowDesc}>Sesión actual</Text>
                            </View>
                            <TouchableOpacity style={[styles.actionBtn, { borderColor: '#aaa' }]}>
                                <Text style={[styles.actionBtnText, { color: '#aaa' }]}>Actual</Text>
                            </TouchableOpacity>
                        </View>
                        <View style={styles.row}>
                            <View>
                                <Text style={styles.rowLabel}>Samsung Galaxy S23</Text>
                                <Text style={styles.rowDesc}>Última actividad: hace 2 horas</Text>
                            </View>
                            <TouchableOpacity style={[styles.actionBtn, { borderColor: '#e50914' }]}>
                                <Text style={[styles.actionBtnText, { color: '#e50914' }]}>Cerrar Sesión</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                );
            default:
                return null;
        }
    };

    switch (activeTab) {
        case 'account':
            return (
                <View>
                    <Text style={styles.sectionTitle}>Cuenta</Text>
                    <SubNav tabs={accountTabs} activeTab={accountSubTab} onTabPress={setAccountSubTab} colors={colors} theme={theme} />
                    {renderAccountContent()}
                </View>
            );
        case 'security':
            return (
                <View>
                    <Text style={styles.sectionTitle}>Seguridad y Actividad</Text>
                    <SubNav tabs={securityTabs} activeTab={securitySubTab} onTabPress={setSecuritySubTab} colors={colors} theme={theme} />
                    {renderSecurityContent()}
                </View>
            );
        case 'settings':
            return (
                <View>
                    <Text style={styles.sectionTitle}>Configuración</Text>
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>General</Text>
                        <View style={styles.row}>
                            <View>
                                <Text style={styles.rowLabel}>Notificaciones</Text>
                                <Text style={styles.rowDesc}>Recibir alertas de nuevos estrenos</Text>
                            </View>
                            <Switch
                                value={notificationsEnabled}
                                onValueChange={setNotificationsEnabled}
                                trackColor={{ false: '#767577', true: colors.primary }}
                                thumbColor={notificationsEnabled ? '#00d4ff' : '#f4f3f4'}
                            />
                        </View>
                        <View style={styles.row}>
                            <Text style={styles.rowLabel}>Idioma</Text>
                            <Text style={{ color: colors.textGray }}>Español (Latam)</Text>
                        </View>
                    </View>
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Gestión de Perfiles</Text>
                        <TouchableOpacity style={styles.row} onPress={handleChangeProfile}>
                            <Text style={styles.rowLabel}>Cambiar de perfil</Text>
                            <Ionicons name="chevron-forward" size={20} color={colors.textGray} />
                        </TouchableOpacity>
                    </View>
                </View>
            );
        case 'appearance':
            return (
                <View>
                    <Text style={styles.sectionTitle}>Apariencia</Text>
                    <View style={styles.card}>
                        <View style={styles.row}>
                            <View>
                                <Text style={styles.rowLabel}>Tema</Text>
                                <Text style={styles.rowDesc}>{theme === 'dark' ? 'Modo Oscuro' : 'Modo Claro'}</Text>
                            </View>
                            <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('Apariencia' as never)}>
                                <Text style={styles.actionBtnText}>Personalizar</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            );
        case 'admin':
            return (
                <View>
                    <Text style={styles.sectionTitle}>Administración</Text>
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Panel de Control</Text>
                        <View style={styles.row}>
                            <View>
                                <Text style={styles.rowLabel}>Acceso Administrador</Text>
                                <Text style={styles.rowDesc}>Gestionar anime, usuarios y configuración</Text>
                            </View>
                            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.primary }]} onPress={handleAdminAccess}>
                                <Text style={{ color: '#fff', fontWeight: 'bold' }}>Entrar al Panel</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            );
        default:
            return null;
    }
};
