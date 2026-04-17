import React from 'react';
import { View, Text, TouchableOpacity, Image, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { useAdmin } from '../../contexts/AdminContext';

const SidebarItem = ({ id, icon, label, activeTab, colors, styles, onPress }: any) => (
    <TouchableOpacity
        style={[styles.menuItem, activeTab === id && styles.menuItemActive]}
        onPress={() => onPress(id)}
    >
        <Ionicons
            name={icon}
            size={22}
            color={activeTab === id ? colors.primary : colors.textGray}
            style={styles.menuIcon}
        />
        <Text style={[styles.menuText, activeTab === id && styles.menuTextActive]}>{label}</Text>
    </TouchableOpacity>
);

export const Sidebar = ({
    styles,
    currentProfile,
    getAvatarUrl,
    setImageError,
    handleChangeAvatar,
    fileInputRef,
    handleWebFileSelect,
    activeTab,
    setActiveTab,
    setLogoutVisible,
    colors,
    navigation
}: any) => {
    const { user } = useAuth();
    const { isAdmin } = useAdmin();
    return (
        <View style={styles.sidebar}>
            <View style={styles.sidebarHeader}>
                <TouchableOpacity
                    style={styles.avatarContainer}
                    onPress={handleChangeAvatar}
                >
                    <Image
                        key={`${currentProfile?.avatar_url || 'default-avatar'}`}
                        source={{ uri: getAvatarUrl() }}
                        style={styles.avatar}
                        onError={() => setImageError(true)}
                    />
                </TouchableOpacity>
                <Text style={styles.username}>{currentProfile?.name}</Text>
                <Text style={styles.userEmail}>{user?.email}</Text>

                {Platform.OS === 'web' && (
                    <input
                        ref={(el: HTMLInputElement) => { fileInputRef.current = el; }}
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={handleWebFileSelect}
                    />
                )}
            </View>

            <View style={styles.menuContainer}>
                <SidebarItem id="account" icon="person-outline" label="Cuenta" activeTab={activeTab} colors={colors} styles={styles} onPress={setActiveTab} />
                <SidebarItem id="security" icon="lock-closed-outline" label="Seguridad" activeTab={activeTab} colors={colors} styles={styles} onPress={setActiveTab} />
                <SidebarItem id="settings" icon="settings-outline" label="Configuración" activeTab={activeTab} colors={colors} styles={styles} onPress={setActiveTab} />
                <SidebarItem id="appearance" icon="color-palette-outline" label="Apariencia" activeTab={activeTab} colors={colors} styles={styles} onPress={setActiveTab} />
                {isAdmin && (
                    <SidebarItem id="admin" icon="shield-checkmark-outline" label="Administrador" activeTab={activeTab} colors={colors} styles={styles} onPress={setActiveTab} />
                )}
            </View>

            <View style={styles.sidebarFooter}>
                <TouchableOpacity style={styles.logoutButton} onPress={() => setLogoutVisible(true)}>
                    <Ionicons name="log-out-outline" size={24} color="#e50914" />
                    <Text style={styles.logoutText}>Cerrar sesión</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};
