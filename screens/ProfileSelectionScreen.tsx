import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Modal,
  TextInput,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import databaseService from '../services/databaseService';

// Definir interfaz Profile localmente
interface Profile {
  id: number;
  name: string;
  avatar_url?: string;
  isKids?: boolean;
}

interface ProfileSelectionScreenProps {
  navigation: any;
  route: {
    params: {
      userId: number;
    };
  };
}

// Avatares disponibles para los perfiles
const AVAILABLE_AVATARS = [
  { id: '1', name: 'Adulto 1', emoji: '👤', color: '#e50914' },
  { id: '2', name: 'Adulto 2', emoji: '👨', color: '#0071eb' },
  { id: '3', name: 'Adulto 3', emoji: '👩', color: '#46d369' },
  { id: '4', name: 'Adulto 4', emoji: '🧑', color: '#f59e0b' },
  { id: '5', name: 'Niños 1', emoji: '👶', color: '#8b5cf6' },
  { id: '6', name: 'Niños 2', emoji: '🧒', color: '#ec4899' },
  { id: '7', name: 'Niños 3', emoji: '👧', color: '#06b6d4' },
  { id: '8', name: 'Niños 4', emoji: '👦', color: '#84cc16' },
];

const ProfileSelectionScreen: React.FC<ProfileSelectionScreenProps> = ({ navigation, route }) => {
  const { userId } = route.params;
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(AVAILABLE_AVATARS[0]);
  const [isKidsProfile, setIsKidsProfile] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadProfiles();
  }, []);

  const loadProfiles = async () => {
    try {
      const rows = await databaseService.getProfiles(userId);
      const mapped: Profile[] = rows.map((p) => ({
        id: p.id,
        name: p.name,
        avatar_url: p.avatar_url,
        isKids: !!p.is_kids,
      }));
      setProfiles(mapped);
    } catch (error) {
      console.error('Error al cargar perfiles:', error);
      Alert.alert('Error', 'No se pudieron cargar los perfiles');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProfile = async () => {
    if (!newProfileName.trim()) {
      Alert.alert('Error', 'Por favor ingresa un nombre para el perfil');
      return;
    }

    if (profiles.length >= 5) {
      Alert.alert('Límite alcanzado', 'Solo puedes tener hasta 5 perfiles');
      return;
    }

    setCreating(true);
    try {
      const avatarUrl = `https://i.pravatar.cc/200?img=${selectedAvatar.id}`;
      await databaseService.createProfile({
        usuario_id: userId,
        name: newProfileName.trim(),
        avatar_url: avatarUrl,
        is_kids: isKidsProfile,
      });

      setNewProfileName('');
      setSelectedAvatar(AVAILABLE_AVATARS[0]);
      setIsKidsProfile(false);
      setShowCreateModal(false);
      await loadProfiles();
      Alert.alert('Éxito', 'Perfil creado correctamente');
    } catch (error) {
      console.error('Error al crear perfil:', error);
      Alert.alert('Error', 'No se pudo crear el perfil');
    } finally {
      setCreating(false);
    }
  };

  const getAvatarById = (avatarId: string) => {
    return AVAILABLE_AVATARS.find(avatar => avatar.id === avatarId) || AVAILABLE_AVATARS[0];
  };

  const handleSelectProfile = (profile: Profile) => {
    // Navegar a la pantalla principal con el perfil seleccionado
    navigation.replace('Main', { 
      selectedProfile: profile,
      userId: userId 
    });
  };

  const handleDeleteProfile = (profileId: number) => {
    Alert.alert(
      'Eliminar perfil',
      '¿Estás seguro de que quieres eliminar este perfil?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await databaseService.deleteProfile(profileId);
              await loadProfiles();
            } catch (error) {
              console.error('Error al eliminar perfil:', error);
              Alert.alert('Error', 'No se pudo eliminar el perfil');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <LinearGradient colors={['#000000', '#1a1a1a']} style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Cargando perfiles...</Text>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#000000', '#1a1a1a']} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>¿Quién está viendo?</Text>
          <Text style={styles.subtitle}>Selecciona tu perfil para continuar</Text>
        </View>

        <View style={styles.profilesContainer}>
          {profiles.map((profile) => {
            return (
              <TouchableOpacity
                key={profile.id}
                style={styles.profileCard}
                onPress={() => handleSelectProfile(profile)}
                onLongPress={() => handleDeleteProfile(profile.id!)}
              >
                <View style={[styles.avatarContainer, { backgroundColor: '#333' }]}>
                  {profile.avatar_url ? (
                    <Image source={{ uri: profile.avatar_url }} style={{ width: 80, height: 80, borderRadius: 40 }} />
                  ) : (
                    <Text style={styles.avatarEmoji}>{getAvatarById('1').emoji}</Text>
                  )}
                  {profile.isKids && (
                    <View style={styles.kidsIndicator}>
                      <Ionicons name="star" size={16} color="#ffd700" />
                    </View>
                  )}
                </View>
                <Text style={styles.profileName}>{profile.name}</Text>
              </TouchableOpacity>
            );
          })}

          {/* Botón para crear nuevo perfil */}
          {profiles.length < 5 && (
            <TouchableOpacity
              style={styles.addProfileCard}
              onPress={() => setShowCreateModal(true)}
            >
              <View style={styles.addAvatarContainer}>
                <Ionicons name="add" size={40} color="#666" />
              </View>
              <Text style={styles.addProfileText}>Agregar perfil</Text>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={styles.logoutButton}
          onPress={() => navigation.replace('Login')}
        >
          <Text style={styles.logoutText}>Cerrar sesión</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Modal para crear nuevo perfil */}
      <Modal
        visible={showCreateModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Crear nuevo perfil</Text>

            <TextInput
              style={styles.nameInput}
              placeholder="Nombre del perfil"
              placeholderTextColor="#666"
              value={newProfileName}
              onChangeText={setNewProfileName}
              maxLength={20}
            />

            <Text style={styles.sectionTitle}>Selecciona un avatar:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.avatarScroll}>
              {AVAILABLE_AVATARS.map((avatar) => (
                <TouchableOpacity
                  key={avatar.id}
                  style={[
                    styles.avatarOption,
                    { backgroundColor: avatar.color },
                    selectedAvatar.id === avatar.id && styles.selectedAvatar,
                  ]}
                  onPress={() => setSelectedAvatar(avatar)}
                >
                  <Text style={styles.avatarOptionEmoji}>{avatar.emoji}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity
              style={styles.kidsToggle}
              onPress={() => setIsKidsProfile(!isKidsProfile)}
            >
              <View style={[styles.checkbox, isKidsProfile && styles.checkboxChecked]}>
                {isKidsProfile && <Ionicons name="checkmark" size={16} color="#000" />}
              </View>
              <Text style={styles.kidsToggleText}>Perfil para niños</Text>
            </TouchableOpacity>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowCreateModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.createButton, creating && styles.buttonDisabled]}
                onPress={handleCreateProfile}
                disabled={creating}
              >
                <Text style={styles.createButtonText}>
                  {creating ? 'Creando...' : 'Crear'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    fontSize: 18,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#ccc',
    textAlign: 'center',
  },
  profilesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 20,
    marginBottom: 40,
  },
  profileCard: {
    alignItems: 'center',
    width: 120,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    position: 'relative',
  },
  avatarEmoji: {
    fontSize: 32,
  },
  kidsIndicator: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#000',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileName: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
  },
  addProfileCard: {
    alignItems: 'center',
    width: 120,
  },
  addAvatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 2,
    borderColor: '#666',
    borderStyle: 'dashed',
  },
  addProfileText: {
    color: '#666',
    fontSize: 16,
    textAlign: 'center',
  },
  logoutButton: {
    alignSelf: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  logoutText: {
    color: '#666',
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#222',
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 20,
  },
  nameInput: {
    backgroundColor: '#333',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    color: '#fff',
    marginBottom: 20,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 10,
  },
  avatarScroll: {
    marginBottom: 20,
  },
  avatarOption: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedAvatar: {
    borderColor: '#fff',
  },
  avatarOptionEmoji: {
    fontSize: 24,
  },
  kidsToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#666',
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#fff',
    borderColor: '#fff',
  },
  kidsToggleText: {
    color: '#fff',
    fontSize: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#666',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  createButton: {
    flex: 1,
    backgroundColor: '#e50914',
    borderRadius: 8,
    padding: 15,
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
});

export default ProfileSelectionScreen;