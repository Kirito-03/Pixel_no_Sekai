import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Image,
  Switch,
  SafeAreaView,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from '../theme';
import { useProfile } from '../contexts/ProfileContext';

export default function ProfileScreen() {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [autoplayEnabled, setAutoplayEnabled] = useState(true);
  const { currentProfile } = useProfile();
  
  const { width } = useWindowDimensions();
  const isSmallScreen = width < 768;

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
          <View style={styles.avatarContainer}>
            <Image
              source={{ 
                uri: currentProfile?.avatar_url || 'https://upload.wikimedia.org/wikipedia/commons/0/0b/Netflix-avatar.png' 
              }}
              style={styles.avatar}
            />
          </View>
          <Text style={styles.username}>{currentProfile?.name || 'Usuario'}</Text>
          <Text style={styles.email}>{currentProfile?.name || 'admin'}</Text>
        </View>

        {/* Sección CUENTA */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>CUENTA</Text>
          
          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>Información de la cuenta</Text>
              <Text style={styles.menuSubtitle}>administra tu información</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={colors.textGray} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>Metodos de Pago</Text>
              <Text style={styles.menuSubtitle}>Gestiona tus pagos</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={colors.textGray} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>Mi lista</Text>
              <Text style={styles.menuSubtitle}>ver contenido Pornografico</Text>
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

          <View style={styles.menuItem}>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>Reproduccion automatica</Text>
            </View>
            <Switch
              value={autoplayEnabled}
              onValueChange={setAutoplayEnabled}
              trackColor={{ false: '#767577', true: colors.primary }}
              thumbColor={autoplayEnabled ? '#00d4ff' : '#f4f3f4'}
            />
          </View>

          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>Descargas</Text>
              <Text style={styles.menuSubtitle}>Gestionar descargas</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={colors.textGray} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>Apariencia</Text>
              <Text style={styles.menuSubtitle}>modo oscuro</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={colors.textGray} />
          </TouchableOpacity>
    </View>

        {/* Espaciado inferior */}
        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

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
  avatarContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: 'hidden',
    marginBottom: spacing.md,
    borderWidth: 3,
    borderColor: colors.primary,
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  username: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  email: {
    fontSize: 16,
    color: colors.textGray,
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
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
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
});

