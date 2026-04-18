import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Image,
    Switch,
    ActivityIndicator,
    Platform,
    Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { spacing } from '../theme';
import { auth } from '../services/firebase';
import { ProfileScreenProps, useProfileScreenLogic } from '../hooks/useProfileScreenLogic';

import { createStyles } from './ProfileScreen.web.styles';

import { Sidebar } from '../components/profile/Sidebar';
import { ContentPanel } from '../components/profile/ContentPanel';

export default function ProfileScreen() {
    console.log('Rendering ProfileScreen (Web)');
    const props = useProfileScreenLogic();
    const navigation = useNavigation<any>();
    const {
        navigation: nav,
        colors,
        theme,
        logoutVisible, setLogoutVisible,
        logoutLoading,
        handleLogoutAction,
    } = props;

    const [activeTab, setActiveTab] = useState('account');
    const styles = createStyles(colors, theme);

    return (
        <View style={styles.pageWrapper}>
            {/* ── TOP BAR ── */}
            <View style={topBarStyles.bar}>
                <TouchableOpacity
                    style={topBarStyles.backBtn}
                    onPress={() => navigation.goBack()}
                >
                    <Ionicons name="arrow-back" size={20} color="rgba(255,255,255,0.8)" />
                    <Text style={topBarStyles.backText}>Volver</Text>
                </TouchableOpacity>
                <Text style={topBarStyles.title}>Mi perfil</Text>
                <View style={topBarStyles.backBtn} />
            </View>

            <View style={styles.container}>
                <Sidebar
                    styles={styles}
                    {...props}
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                />
                <ScrollView style={styles.contentArea}>
                    <ContentPanel
                        styles={styles}
                        activeTab={activeTab}
                        {...props}
                    />
                </ScrollView>
                <Modal
                    visible={logoutVisible}
                    transparent
                    animationType="fade"
                    onRequestClose={() => setLogoutVisible(false)}
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <Text style={styles.modalTitle}>Cerrar sesión</Text>
                            <Text style={styles.modalSubtitle}>¿Estás seguro de que quieres cerrar sesión?</Text>
                            <View style={styles.modalButtons}>
                                <TouchableOpacity style={styles.modalCancelButton} onPress={() => setLogoutVisible(false)}>
                                    <Text style={styles.modalCancelText}>Cancelar</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.modalConfirmButton}
                                    onPress={handleLogoutAction}
                                    disabled={logoutLoading}
                                >
                                    {logoutLoading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.modalConfirmText}>Cerrar sesión</Text>}
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>
            </View>
        </View>
    );
}

const topBarStyles = StyleSheet.create({
    bar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: 'rgba(255,255,255,0.08)',
        backgroundColor: '#0A0A0A',
    },
    backBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        minWidth: 90,
        cursor: 'pointer' as any,
    },
    backText: {
        color: 'rgba(255,255,255,0.75)',
        fontSize: 14,
        fontWeight: '500',
    },
    title: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: -0.2,
    },
});
