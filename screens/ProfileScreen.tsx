import React from 'react';
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { spacing } from '../theme';
import { auth } from '../services/firebase';
import { ProfileScreenProps, useProfileScreenLogic } from '../hooks/useProfileScreenLogic';
import { useAdmin } from '../contexts/AdminContext';

export default function ProfileScreen() {
  console.log('Rendering ProfileScreen (Mobile/Default)');
  const props = useProfileScreenLogic();
  const { isAdmin } = useAdmin();
  const {
    navigation,
    colors,
    theme,
    notificationsEnabled, setNotificationsEnabled,
    updatingAvatar,
    avatarKey,
    imageError, setImageError,
    currentProfile,
    user,
    adultContentEnabled, setAdultContentEnabled,
    accountModalVisible, setAccountModalVisible,
    logoutVisible, setLogoutVisible,
    logoutLoading,
    fileInputRef,
    getAvatarUrl,
    handleWebFileSelect,
    handleChangeAvatar,
    handleChangeProfile,
    handleAdminLongPress,
    handlePasswordReset,
    handleEmailVerification,
    handleLogoutAction,
  } = props;

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    decorativeCircle: {
      position: 'absolute',
      top: -30,
      left: -30,
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: '#00d4ff',
      opacity: 0.8,
      zIndex: 1,
    },
    scrollView: {
      flex: 1,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      alignItems: 'center',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
    },
    helpButton: {
      paddingVertical: 8,
      paddingHorizontal: 12,
    },
    helpText: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '500',
    },
    profileSection: {
      alignItems: 'center',
      paddingVertical: spacing.xl,
      paddingHorizontal: spacing.lg,
    },
    avatarWrapper: {
      position: 'relative',
    },
    avatarContainer: {
      width: 120,
      height: 120,
      borderRadius: 60,
      overflow: 'hidden',
      marginBottom: spacing.md,
      borderWidth: 0,
      borderColor: 'transparent',
    },
    avatar: {
      width: '100%',
      height: '100%',
    },
    avatarLoading: {
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    editAvatarBadge: {
      position: 'absolute',
      bottom: 0,
      right: 0,
      backgroundColor: colors.primary,
      borderRadius: 15,
      width: 30,
      height: 30,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 2,
      borderColor: colors.background,
    },
    username: {
      fontSize: 24,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: spacing.xs,
    },
    section: {
      paddingHorizontal: spacing.lg,
      marginBottom: spacing.xl,
    },
    sectionTitle: {
      fontSize: 14,
      fontWeight: 'bold',
      color: colors.textGray,
      marginBottom: spacing.md,
      letterSpacing: 1,
    },
    menuItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
    },
    menuContent: {
      flex: 1,
    },
    menuTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 4,
    },
    menuSubtitle: {
      fontSize: 13,
      color: colors.textGray,
    },
    logoutButton: {
      marginTop: spacing.md,
      borderTopWidth: 1,
      borderTopColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
    },
    logoutText: {
      color: '#e50914',
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.6)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContent: {
      backgroundColor: theme === 'dark' ? '#1f1f1f' : '#fff',
      borderRadius: 12,
      padding: spacing.lg,
      width: '90%',
      maxWidth: 420,
    },
    infoRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
    },
    infoLabel: {
      color: colors.textGray,
      fontSize: 14,
      fontWeight: '600',
    },
    infoValue: {
      color: colors.text,
      fontSize: 14,
    },
    modalButtons: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 12,
      marginTop: spacing.lg,
    },
    cancelButton: {
      flex: 1,
      backgroundColor: theme === 'dark' ? '#666' : '#e5e7eb',
      borderRadius: 8,
      padding: spacing.md,
      alignItems: 'center',
    },
    cancelButtonText: {
      color: theme === 'dark' ? '#fff' : '#111827',
      fontSize: 16,
      fontWeight: 'bold',
    },
    createButton: {
      flex: 1,
      backgroundColor: '#e50914',
      borderRadius: 8,
      padding: spacing.md,
      alignItems: 'center',
    },
    buttonDisabled: {
      opacity: 0.6,
    },
    createButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: 'bold',
    },
    actionContainer: {
      marginTop: spacing.md,
      gap: 10,
    },
    actionButton: {
      backgroundColor: colors.primary,
      borderRadius: 8,
      padding: spacing.md,
      alignItems: 'center',
    },
    actionButtonSecondary: {
      backgroundColor: theme === 'dark' ? '#374151' : '#e5e7eb',
      borderRadius: 8,
      padding: spacing.md,
      alignItems: 'center',
    },
    actionButtonText: {
      color: theme === 'dark' ? '#fff' : '#111827',
      fontSize: 14,
      fontWeight: '600',
    },
  });

  return (
    <SafeAreaView style={styles.container}>
      {/* Círculo decorativo */}
      <View style={styles.decorativeCircle} />

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Header con ayuda */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.helpButton}>
            <Text style={styles.helpText}>Ayuda</Text>
          </TouchableOpacity>
        </View>

        {/* Perfil de usuario */}
        <View style={styles.profileSection}>
          <View style={styles.avatarWrapper}>
            <TouchableOpacity
              style={styles.avatarContainer}
              onPress={handleChangeAvatar}
              onLongPress={handleAdminLongPress}
              delayLongPress={800}
              activeOpacity={0.8}
              disabled={updatingAvatar}
            >
              {updatingAvatar ? (
                <View style={[styles.avatar, styles.avatarLoading]}>
                  <ActivityIndicator size="large" color={colors.primary} />
                </View>
              ) : (
                <>
                  {!imageError ? (
                    <Image
                      key={`${currentProfile?.avatar_url || 'default-avatar'}-${avatarKey}`}
                      source={{
                        uri: getAvatarUrl()
                      }}
                      style={styles.avatar}
                      onError={(error) => {
                        setImageError(true);
                      }}
                    />
                  ) : (
                    <View style={[styles.avatar, { backgroundColor: '#333', justifyContent: 'center', alignItems: 'center' }]}>
                      <Ionicons name="person" size={48} color="#666" />
                    </View>
                  )}
                  <View style={styles.editAvatarBadge}>
                    <Ionicons name="camera" size={16} color="#fff" />
                  </View>
                </>
              )}
            </TouchableOpacity>
            {/* Input file oculto para web removido para evitar conflictos en Android */}
          </View>
          <Text style={styles.username}>{currentProfile?.name || 'Usuario'}</Text>
        </View>

        {/* Sección CUENTA */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>CUENTA</Text>

          <TouchableOpacity style={styles.menuItem} onPress={() => setAccountModalVisible(true)}>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>Información de la cuenta</Text>
              <Text style={styles.menuSubtitle}>administra tu información</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={colors.textGray} />
          </TouchableOpacity>

          <View style={styles.menuItem}>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>Contenido +18</Text>
              <Text style={styles.menuSubtitle}>Ecchi/Hentai y adultos</Text>
            </View>
            <Switch
              value={adultContentEnabled}
              onValueChange={setAdultContentEnabled}
              trackColor={{ false: '#767577', true: colors.primary }}
              thumbColor={adultContentEnabled ? '#00d4ff' : '#f4f3f4'}
            />
          </View>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={handleChangeProfile}
          >
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>Cambiar de perfil</Text>
              <Text style={styles.menuSubtitle}>Selecciona otro perfil o crea uno nuevo</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={colors.textGray} />
          </TouchableOpacity>
        </View>

        {/* Sección CONFIGURACIÓN */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>CONFIGURACION</Text>

          <View style={styles.menuItem}>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>Notificaciones</Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ false: '#767577', true: colors.primary }}
              thumbColor={notificationsEnabled ? '#00d4ff' : '#f4f3f4'}
            />
          </View>

          <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('Descargas' as never)}>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>Descargas</Text>
              <Text style={styles.menuSubtitle}>Gestionar descargas</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={colors.textGray} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('Apariencia' as never)}>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>Apariencia</Text>
              <Text style={styles.menuSubtitle}>Tema actual: {theme === 'dark' ? 'Oscuro' : 'Claro'}</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={colors.textGray} />
          </TouchableOpacity>

          {isAdmin && (
            <TouchableOpacity style={styles.menuItem} onPress={handleAdminLongPress}>
              <View style={styles.menuContent}>
                <Text style={styles.menuTitle}>Administrador</Text>
                <Text style={styles.menuSubtitle}>Panel de control</Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color={colors.textGray} />
            </TouchableOpacity>
          )}


        </View>

        {/* Sección CERRAR SESIÓN */}
        <View style={styles.section}>
          <TouchableOpacity
            style={[styles.menuItem, styles.logoutButton]}
            onPress={() => setLogoutVisible(true)}
          >
            <View style={styles.menuContent}>
              <Text style={[styles.menuTitle, styles.logoutText]}>Cerrar sesión</Text>
            </View>
            <Ionicons name="log-out-outline" size={24} color="#e50914" />
          </TouchableOpacity>
        </View>

        <Modal
          visible={accountModalVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setAccountModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.sectionTitle}>Información de la cuenta</Text>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Email</Text>
                <Text style={styles.infoValue}>{user?.email || '—'}</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Proveedor</Text>
                <Text style={styles.infoValue}>{(() => {
                  const cu = auth.currentUser;
                  const providers = cu?.providerData?.map((p: any) => p.providerId) || [];
                  const isGoogle = providers.includes('google.com');
                  const isEmail = providers.includes('password');
                  return isGoogle ? 'Google' : (isEmail ? 'Email y contraseña' : (providers[0] || '—'));
                })()}</Text>
              </View>
              <View style={styles.actionContainer}>
                {(() => {
                  const cu = auth.currentUser;
                  const providers = cu?.providerData?.map((p: any) => p.providerId) || [];
                  const isEmail = providers.includes('password');
                  const emailVerified = !!auth.currentUser?.emailVerified;
                  return (
                    <>
                      {isEmail && (
                        <TouchableOpacity
                          style={styles.actionButton}
                          onPress={handlePasswordReset}
                        >
                          <Text style={styles.actionButtonText}>Restablecer contraseña</Text>
                        </TouchableOpacity>
                      )}
                      {!emailVerified && (
                        <TouchableOpacity
                          style={styles.actionButtonSecondary}
                          onPress={handleEmailVerification}
                        >
                          <Text style={styles.actionButtonText}>Enviar verificación de email</Text>
                        </TouchableOpacity>
                      )}
                    </>
                  );
                })()}
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Email verificado</Text>
                <Text style={styles.infoValue}>{auth.currentUser?.emailVerified ? 'Sí' : 'No'}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Creación</Text>
                <Text style={styles.infoValue}>{auth.currentUser?.metadata?.creationTime || '—'}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Último acceso</Text>
                <Text style={styles.infoValue}>{auth.currentUser?.metadata?.lastSignInTime || '—'}</Text>
              </View>
              <View style={styles.modalButtons}>
                <TouchableOpacity style={styles.cancelButton} onPress={() => setAccountModalVisible(false)}>
                  <Text style={styles.cancelButtonText}>Cerrar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        <Modal
          visible={logoutVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setLogoutVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.sectionTitle}>Cerrar sesión</Text>
              <Text style={styles.menuSubtitle}>¿Estás seguro de que quieres cerrar sesión?</Text>
              <View style={styles.modalButtons}>
                <TouchableOpacity style={styles.cancelButton} onPress={() => setLogoutVisible(false)}>
                  <Text style={styles.cancelButtonText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.createButton, logoutLoading && styles.buttonDisabled]}
                  onPress={handleLogoutAction}
                  disabled={logoutLoading}
                >
                  <ActivityIndicator size="small" color="#fff" animating={logoutLoading} style={{ display: logoutLoading ? 'flex' : 'none' }} />
                  {!logoutLoading && <Text style={styles.createButtonText}>Cerrar sesión</Text>}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </SafeAreaView>
  );
}
