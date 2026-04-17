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
import { spacing } from '../theme';
import { auth } from '../services/firebase';
import { ProfileScreenProps, useProfileScreenLogic } from '../hooks/useProfileScreenLogic';

import { createStyles } from './ProfileScreen.web.styles';

import { Sidebar } from '../components/profile/Sidebar';
import { ContentPanel } from '../components/profile/ContentPanel';

export default function ProfileScreen() {
    console.log('Rendering ProfileScreen (Web)');
    const props = useProfileScreenLogic();
    const {
        navigation,
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
