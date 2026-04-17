import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Image,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useProfile, Profile } from '../contexts/ProfileContext';
import { useAuth } from '../contexts/AuthContext';
import { useProfileManagement } from '../hooks/useProfileManagement';
import { CreateProfileModal } from '../components/modals/CreateProfileModal';
import { DeleteProfileModal } from '../components/modals/DeleteProfileModal';
import { AnimatedProfileCard } from '../components/AnimatedProfileCard';



interface ProfileSelectionScreenProps {
  navigation: any;
}

const ProfileSelectionScreen: React.FC<ProfileSelectionScreenProps> = ({ navigation }) => {
  const { logout } = useAuth();
  const { setCurrentProfile } = useProfile();
  const { profiles, loading, createProfile, deleteProfile, getCorrectedAvatarUrl } = useProfileManagement();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');
  const [creating, setCreating] = useState(false);
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleSelectImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permisos requeridos', 'Necesitamos acceso a tu galería.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setSelectedImageUri(result.assets[0].uri);
    }
  };

  const handleWebFileSelect = (event: any) => {
    const file = event.target?.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      Alert.alert('Error', 'Por favor selecciona un archivo de imagen');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      Alert.alert('Error', 'El archivo es demasiado grande. Máximo 5MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      setSelectedImageUri(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleCreateProfile = async () => {
    if (!newProfileName.trim() || !selectedImageUri) {
      Alert.alert('Error', 'El nombre y la imagen son requeridos.');
      return;
    }
    setCreating(true);
    try {
      await createProfile(newProfileName, selectedImageUri);
      setShowCreateModal(false);
      setNewProfileName('');
      setSelectedImageUri(null);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'No se pudo crear el perfil';
      Alert.alert('Error', msg);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (deleteTargetId === null) return;
    setDeleting(true);
    try {
      await deleteProfile(deleteTargetId);
      setShowDeleteModal(false);
      setDeleteTargetId(null);
      Alert.alert('Eliminado', 'El perfil fue eliminado correctamente');
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'No se pudo eliminar el perfil';
      Alert.alert('Error', msg);
    } finally {
      setDeleting(false);
    }
  };

  const handleSelectProfile = async (profile: Profile) => {
    await setCurrentProfile(profile);
    navigation.reset({
      index: 0,
      routes: [{ name: 'Principal', params: { selectedProfile: profile } }],
    });
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
      <View style={styles.mainContentContainer}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <Text style={styles.title}>¿Quién está viendo?</Text>
          </View>

          <View style={styles.profilesContainer}>
            {profiles.map((profile, index) => (
              <AnimatedProfileCard
                key={profile.id}
                profile={profile}
                index={index}
                onPress={() => handleSelectProfile(profile)}
                onLongPress={() => {
                  setDeleteTargetId(profile.id);
                  setShowDeleteModal(true);
                }}
                getCorrectedAvatarUrl={getCorrectedAvatarUrl}
              />
            ))}

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
            onPress={async () => {
              await logout();
              navigation.replace('Ingreso');
            }}
          >
            <Text style={styles.logoutText}>Cerrar sesión</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      <CreateProfileModal
        visible={showCreateModal}
        creating={creating}
        newProfileName={newProfileName}
        selectedImageUri={selectedImageUri}
        onClose={() => setShowCreateModal(false)}
        onConfirm={handleCreateProfile}
        setNewProfileName={setNewProfileName}
        handleSelectImage={handleSelectImage}
        handleWebFileSelect={handleWebFileSelect}
      />

      <DeleteProfileModal
        visible={showDeleteModal}
        deleting={deleting}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteConfirm}
      />
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center', // Centrar el contenedor principal
    },
    mainContentContainer: {
        width: '100%',
        maxWidth: 1200,
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
        alignItems: 'center',
        paddingVertical: 60,
        paddingHorizontal: 20,
    },
    header: {
        marginBottom: 40,
        alignItems: 'center',
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#fff',
    },
    profilesContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 20,
        width: '100%',
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
        overflow: 'hidden',
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
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10,
        backgroundColor: '#333',
    },
    addProfileText: {
        color: '#aaa',
        fontSize: 16,
    },
    logoutButton: {
        marginTop: 60,
    },
    logoutText: {
        color: '#aaa',
        fontSize: 16,
    },
});

export default ProfileSelectionScreen;
