import React, { ComponentProps } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { IconSymbol } from '@/components/ui/icon-symbol';

type IconName = ComponentProps<typeof IconSymbol>['name'];

export default function MenuScreen() {
  const router = useRouter();
  const [notifications, setNotifications] = React.useState(true);
  const [autoPlay, setAutoPlay] = React.useState(true);

  const handleLogout = () => {
    Alert.alert(
      'Cerrar sesión',
      '¿Estás seguro que deseas cerrar sesión?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cerrar sesión',
          style: 'destructive',
          onPress: () => router.replace('/login'),
        },
      ]
    );
  };

  interface MenuItemProps {
    icon: IconName;
    title: string;
    subtitle?: string;
    onPress: () => void;
    showArrow?: boolean;
  }

  interface MenuToggleProps {
    icon: IconName;
    title: string;
    value: boolean;
    onValueChange: (value: boolean) => void;
  }

  const MenuItem = ({ icon, title, subtitle, onPress, showArrow = true }: MenuItemProps) => (
    <TouchableOpacity style={styles.menuItem} onPress={onPress}>
      <View style={styles.menuIconContainer}>
        <IconSymbol name={icon} size={24} color="#fff" />
      </View>
      <View style={styles.menuContent}>
        <Text style={styles.menuTitle}>{title}</Text>
        {subtitle && <Text style={styles.menuSubtitle}>{subtitle}</Text>}
      </View>
      {showArrow && <IconSymbol name="chevron.right" size={20} color="#666" />}
    </TouchableOpacity>
  );

  const MenuToggle = ({ icon, title, value, onValueChange }: MenuToggleProps) => (
    <View style={styles.menuItem}>
      <View style={styles.menuIconContainer}>
        <IconSymbol name={icon} size={24} color="#fff" />
      </View>
      <View style={styles.menuContent}>
        <Text style={styles.menuTitle}>{title}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: '#333', true: '#E50914' }}
        thumbColor="#fff"
      />
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView>
        {/* Header con perfil */}
        <View style={styles.profileSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>👤</Text>
          </View>
          <Text style={styles.profileName}>Mi Perfil</Text>
          <Text style={styles.profileEmail}>usuario@email.com</Text>
        </View>

        {/* Sección Cuenta */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>CUENTA</Text>
          <MenuItem
            icon="person.circle"
            title="Información de cuenta"
            subtitle="Administra tu información"
            onPress={() => Alert.alert('Info', 'Ir a información de cuenta')}
          />
          <MenuItem
            icon="creditcard"
            title="Métodos de pago"
            subtitle="Gestiona tus pagos"
            onPress={() => Alert.alert('Info', 'Ir a métodos de pago')}
          />
          <MenuItem
            icon="rectangle.stack"
            title="Mi lista"
            subtitle="Ver contenido guardado"
            onPress={() => Alert.alert('Info', 'Ir a mi lista')}
          />
        </View>

        {/* Sección Configuración */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>CONFIGURACIÓN</Text>
          <MenuToggle
            icon="bell"
            title="Notificaciones"
            value={notifications}
            onValueChange={setNotifications}
          />
          <MenuToggle
            icon="play.circle"
            title="Reproducción automática"
            value={autoPlay}
            onValueChange={setAutoPlay}
          />
          <MenuItem
            icon="wifi"
            title="Descargas"
            subtitle="Gestiona tus descargas"
            onPress={() => Alert.alert('Info', 'Ir a descargas')}
          />
          <MenuItem
            icon="paintbrush"
            title="Apariencia"
            subtitle="Tema y personalización"
            onPress={() => Alert.alert('Info', 'Ir a apariencia')}
          />
        </View>

        {/* Sección Ayuda */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>AYUDA</Text>
          <MenuItem
            icon="questionmark.circle"
            title="Centro de ayuda"
            onPress={() => Alert.alert('Info', 'Abrir centro de ayuda')}
          />
          <MenuItem
            icon="envelope"
            title="Contactar soporte"
            onPress={() => Alert.alert('Info', 'Contactar soporte')}
          />
          <MenuItem
            icon="doc.text"
            title="Términos y condiciones"
            onPress={() => Alert.alert('Info', 'Ver términos')}
          />
          <MenuItem
            icon="shield"
            title="Política de privacidad"
            onPress={() => Alert.alert('Info', 'Ver política')}
          />
        </View>

        {/* Botón cerrar sesión */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <IconSymbol name="arrow.right.square" size={24} color="#E50914" />
          <Text style={styles.logoutText}>Cerrar sesión</Text>
        </TouchableOpacity>

        <Text style={styles.version}>Versión 1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  avatar: {
    width: 80,
    height: 80,
    backgroundColor: '#E50914',
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 40,
  },
  profileName: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  profileEmail: {
    color: '#888',
    fontSize: 14,
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    color: '#888',
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 20,
    marginBottom: 8,
    letterSpacing: 1,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
    gap: 16,
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    backgroundColor: '#222',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  menuSubtitle: {
    color: '#888',
    fontSize: 13,
    marginTop: 2,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 32,
    marginHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E50914',
    gap: 12,
  },
  logoutText: {
    color: '#E50914',
    fontSize: 16,
    fontWeight: '600',
  },
  version: {
    textAlign: 'center',
    color: '#666',
    fontSize: 12,
    marginTop: 24,
    marginBottom: 32,
  },
});