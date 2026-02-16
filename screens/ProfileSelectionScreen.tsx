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
  ActivityIndicator,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import databaseService from '../services/databaseService';
import { useProfile } from '../contexts/ProfileContext';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
// DYNAMIC_NETWORK_CONFIG is not used in this file; remove the import to fix the missing module error

// Definir interfaz Profile localmente
interface Profile {
  id: number;
  name: string;
  avatar_url?: string;
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
  { id: '1', name: 'Avatar 1', emoji: '👤', color: '#e50914' },
  { id: '2', name: 'Avatar 2', emoji: '👨', color: '#0071eb' },
  { id: '3', name: 'Avatar 3', emoji: '👩', color: '#46d369' },
  { id: '4', name: 'Avatar 4', emoji: '🧑', color: '#f59e0b' },
  { id: '5', name: 'Avatar 5', emoji: '👶', color: '#8b5cf6' },
  { id: '6', name: 'Avatar 6', emoji: '🧒', color: '#ec4899' },
  { id: '7', name: 'Avatar 7', emoji: '👧', color: '#06b6d4' },
  { id: '8', name: 'Avatar 8', emoji: '👦', color: '#84cc16' },
];

const ProfileSelectionScreen: React.FC<ProfileSelectionScreenProps> = ({ navigation, route }) => {
  const { user, logout } = useAuth();
  const { setCurrentProfile } = useProfile();
  const userId = route.params?.userId || user?.uid;
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  // Versión de perfiles para cache-busting de imágenes en Android
  const [profilesVersion, setProfilesVersion] = useState(0);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(AVAILABLE_AVATARS[0]);
  // Eliminado soporte de perfil para niños
  const [creating, setCreating] = useState(false);
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = React.useRef<any>(null);
  const [menuProfileId, setMenuProfileId] = useState<number | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editProfile, setEditProfile] = useState<Profile | null>(null);
  const [editName, setEditName] = useState('');
  const [editImageUri, setEditImageUri] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const editFileInputRef = React.useRef<any>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadProfiles();
  }, []);

  // Volver a cargar los perfiles cada vez que la pantalla vuelve a estar en foco
  useFocusEffect(
    React.useCallback(() => {
      loadProfiles();
      return undefined;
    }, [])
  );

  const loadProfiles = async () => {
    try {
      const rows = await databaseService.getProfiles(0);
      const mapped: Profile[] = rows.map((p: any) => ({
        id: p.id,
        name: p.name,
        avatar_url: p.avatar_url,
      }));
      setProfiles(mapped);
      // Aumentar la versión para invalidar caché de imágenes
      setProfilesVersion((v) => v + 1);
      // Prefetch de avatares corregidos para ayudar a Android a refrescar caché
      try {
        const urls = mapped
          .map((p) => (p.avatar_url ? (getCorrectedAvatarUrl(p.avatar_url) || p.avatar_url) : null))
          .filter((u): u is string => Boolean(u));
        urls.forEach((u) => {
          // @ts-ignore RN Image tiene prefetch
          Image.prefetch(u).catch(() => { });
        });
        console.log('ProfileSelection: Prefetch de avatares, cantidad:', urls.length);
      } catch { }
    } catch (error) {
      console.error('Error al cargar perfiles:', error);
      Alert.alert('Error', 'No se pudieron cargar los perfiles');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectImage = async () => {
    if (Platform.OS === 'web') {
      if (fileInputRef.current) {
        fileInputRef.current.click();
      }
      return;
    }

    // Para móviles, usar expo-image-picker
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert(
          'Permisos requeridos',
          'Necesitamos acceso a tu galería para agregar una foto de perfil',
          [{ text: 'OK' }]
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'] as any,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      setSelectedImageUri(result.assets[0].uri);
    } catch (error) {
      console.error('Error al seleccionar imagen:', error);
      Alert.alert('Error', 'No se pudo seleccionar la imagen');
    }
  };

  const handleWebFileSelect = async (event: any) => {
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

    // Crear una URL local para la vista previa
    const reader = new FileReader();
    reader.onload = (e) => {
      setSelectedImageUri(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Guardar el archivo para subirlo después
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCreateProfile = async () => {
    if (!newProfileName.trim()) {
      Alert.alert('Error', 'Por favor ingresa un nombre para el perfil');
      return;
    }

    if (!selectedImageUri) {
      Alert.alert('Error', 'Por favor selecciona una imagen para el perfil');
      return;
    }

    if (profiles.length >= 5) {
      Alert.alert('Límite alcanzado', 'Solo puedes tener hasta 5 perfiles');
      return;
    }

    setCreating(true);
    setUploadingImage(true);
    try {
      let avatarUrl: string;
      if (Platform.OS === 'web' && selectedImageUri.startsWith('data:')) {
        const response = await fetch(selectedImageUri);
        const blob = await response.blob();
        const file = new File([blob], 'avatar.jpg', { type: 'image/jpeg' });
        const uploadResult = await databaseService.uploadAvatar(file);
        avatarUrl = uploadResult.url;
      } else if (typeof selectedImageUri === 'string') {
        const uploadResult = await databaseService.uploadAvatar(selectedImageUri);
        avatarUrl = uploadResult.url;
      } else {
        throw new Error('Tipo de imagen no soportado');
      }

      setUploadingImage(false);

      // Crear el perfil con la URL del avatar subido
      await databaseService.createProfile({
        usuario_id: 0,
        name: newProfileName.trim(),
        avatar_url: avatarUrl,
      });

      setNewProfileName('');
      setSelectedImageUri(null);
      // No hay estado de perfil para niños
      setShowCreateModal(false);
      await loadProfiles();

      // Obtener el perfil recién creado
      const updatedProfiles = await databaseService.getProfiles(0);
      const createdProfile = updatedProfiles.find((p: any) => p.avatar_url === avatarUrl);

      if (createdProfile) {
        // Navegar a Main con el perfil creado
        const mappedProfile = {
          id: createdProfile.id,
          name: createdProfile.name,
          avatar_url: createdProfile.avatar_url,
        };
        await setCurrentProfile(mappedProfile as any);
        navigation.reset({
          index: 0,
          routes: [
            {
              name: 'Principal',
              params: {
                selectedProfile: mappedProfile,
              },
            },
          ],
        });
      } else {
        Alert.alert('Éxito', 'Perfil creado correctamente');
      }
    } catch (error: any) {
      console.error('Error al crear perfil:', {
        status: error?.response?.status,
        data: error?.response?.data,
        message: error?.message,
      });
      Alert.alert('Error', 'No se pudo crear el perfil. Por favor intenta nuevamente.');
    } finally {
      setCreating(false);
      setUploadingImage(false);
    }
  };

  const getAvatarById = (avatarId: string) => {
    return AVAILABLE_AVATARS.find(avatar => avatar.id === avatarId) || AVAILABLE_AVATARS[0];
  };

  // Añadir parámetro de cache-busting a la URL
  const appendCacheBust = (url: string) => {
    try {
      const hasQuery = url.includes('?');
      const sep = hasQuery ? '&' : '?';
      // Usar profilesVersion, que cambia cada vez que recargamos la lista
      return `${url}${sep}cb=${profilesVersion}`;
    } catch {
      return url;
    }
  };

  // Función para corregir URLs de avatar que contengan localhost y añadir cache-busting
  const getCorrectedAvatarUrl = (avatarUrl: string | undefined): string | null => {
    if (!avatarUrl) return null;

    if (avatarUrl.startsWith('data:')) return avatarUrl;
    if (avatarUrl.startsWith('http')) return appendCacheBust(avatarUrl);
    return avatarUrl;
  };

  const handleSelectProfile = async (profile: Profile) => {
    await setCurrentProfile(profile as any);
    navigation.reset({
      index: 0,
      routes: [
        {
          name: 'Principal',
          params: {
            selectedProfile: profile,
          },
        },
      ],
    });
  };

  const handleDeleteProfile = (profileId: number) => {
    setDeleteTargetId(profileId);
    setShowDeleteModal(true);
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
                    (() => {
                      const corrected = getCorrectedAvatarUrl(profile.avatar_url) || profile.avatar_url;
                      // Forzar remount del Image cuando cambia la URL o la versión de perfiles
                      return (
                        <Image
                          key={`avatar-${profile.id}-${profilesVersion}-${corrected}`}
                          source={{ uri: corrected }}
                          style={{ width: 80, height: 80, borderRadius: 40 }}
                          onLoadStart={() => {
                            console.log('ProfileSelection: Iniciando carga de avatar', { id: profile.id, url: corrected });
                          }}
                          onLoad={() => {
                            console.log('ProfileSelection: Avatar cargado', { id: profile.id, url: corrected });
                          }}
                          onError={(error) => {
                            console.error('Error al cargar avatar en selección:', {
                              id: profile.id,
                              url: profile.avatar_url,
                              corrected,
                              error: error.nativeEvent
                            });
                          }}
                        />
                      );
                    })()
                  ) : (
                    <Text style={styles.avatarEmoji}>{getAvatarById('1').emoji}</Text>
                  )}
                  <TouchableOpacity
                    style={styles.menuBadge}
                    onPress={() => setMenuProfileId(profile.id!)}
                    accessibilityLabel="Opciones del perfil"
                  >
                    <Ionicons name="ellipsis-vertical" size={16} color="#fff" />
                  </TouchableOpacity>
                  {/* Indicador de niños eliminado */}
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
          onPress={async () => {
            await logout();
            navigation.replace('Ingreso');
          }}
        >
          <Text style={styles.logoutText}>Cerrar sesión</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal
        visible={showDeleteModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDeleteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Eliminar perfil</Text>
            <Text style={styles.subtitle}>¿Seguro que quieres eliminar este perfil?</Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => { setShowDeleteModal(false); setDeleteTargetId(null); }}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.createButton, deleting && styles.buttonDisabled]}
                disabled={deleting}
                onPress={async () => {
                  if (deleteTargetId == null) return;
                  setDeleting(true);
                  try {
                    await databaseService.deleteProfile(deleteTargetId);
                    setShowDeleteModal(false);
                    setDeleteTargetId(null);
                    await loadProfiles();
                    Alert.alert('Eliminado', 'El perfil fue eliminado correctamente');
                  } catch (error) {
                    const msg = (error as any)?.message || 'No se pudo eliminar el perfil';
                    Alert.alert('Error', msg);
                  } finally {
                    setDeleting(false);
                  }
                }}
              >
                <Text style={styles.createButtonText}>{deleting ? 'Eliminando...' : 'Eliminar'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={menuProfileId !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuProfileId(null)}
      >
        <View style={styles.menuOverlay}>
          <View style={styles.menuBox}>
            <TouchableOpacity
              style={styles.menuItemButton}
              onPress={() => {
                const p = profiles.find(x => x.id === menuProfileId) || null;
                setMenuProfileId(null);
                if (!p) return;
                setEditProfile(p);
                setEditName(p.name);
                setEditImageUri(p.avatar_url || null);
                setShowEditModal(true);
              }}
            >
              <Text style={styles.menuItemText}>Editar perfil</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.menuItemButton, styles.menuItemDelete]}
              onPress={() => {
                const id = menuProfileId;
                setMenuProfileId(null);
                if (id != null) {
                  setDeleteTargetId(id);
                  setShowDeleteModal(true);
                }
              }}
            >
              <Text style={[styles.menuItemText, styles.menuItemDeleteText]}>Eliminar perfil</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItemButton} onPress={() => setMenuProfileId(null)}>
              <Text style={styles.menuItemText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showEditModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Editar perfil</Text>

            <TextInput
              style={styles.nameInput}
              placeholder="Nombre del perfil"
              placeholderTextColor="#666"
              value={editName}
              onChangeText={setEditName}
              maxLength={20}
            />

            <Text style={styles.sectionTitle}>Foto de perfil:</Text>
            <TouchableOpacity
              style={styles.imagePickerContainer}
              onPress={async () => {
                if (Platform.OS === 'web') {
                  if (editFileInputRef.current) editFileInputRef.current.click();
                  return;
                }
                try {
                  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
                  if (status !== 'granted') return;
                  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'] as any, allowsEditing: true, aspect: [1, 1], quality: 0.8 });
                  if (result.canceled || !result.assets || result.assets.length === 0) return;
                  setEditImageUri(result.assets[0].uri);
                } catch { }
              }}
              disabled={editing}
            >
              {editImageUri ? (
                <Image source={{ uri: editImageUri }} style={styles.previewImage} />
              ) : (
                <View style={styles.imagePickerPlaceholder}>
                  <Ionicons name="camera" size={40} color="#666" />
                  <Text style={styles.imagePickerText}>Toca para seleccionar imagen</Text>
                </View>
              )}
            </TouchableOpacity>
            {Platform.OS === 'web' && (
              <input
                ref={(el: HTMLInputElement) => { editFileInputRef.current = el; }}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={async (event: any) => {
                  const file = event.target?.files?.[0];
                  if (!file) return;
                  if (!file.type.startsWith('image/')) return;
                  if (file.size > 5 * 1024 * 1024) return;
                  const reader = new FileReader();
                  reader.onload = (e) => setEditImageUri(e.target?.result as string);
                  reader.readAsDataURL(file);
                  if (editFileInputRef.current) editFileInputRef.current.value = '';
                }}
              />
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setShowEditModal(false)}>
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.createButton, editing && styles.buttonDisabled]}
                onPress={async () => {
                  if (!editProfile) return;
                  setEditing(true);
                  try {
                    let avatarUrl = editProfile.avatar_url || '';
                    if (editImageUri) {
                      if (Platform.OS === 'web' && editImageUri.startsWith('data:')) {
                        const response = await fetch(editImageUri);
                        const blob = await response.blob();
                        const file = new File([blob], 'avatar.jpg', { type: 'image/jpeg' });
                        const uploadResult = await databaseService.uploadAvatar(file);
                        avatarUrl = uploadResult.url;
                      } else if (typeof editImageUri === 'string') {
                        const uploadResult = await databaseService.uploadAvatar(editImageUri);
                        avatarUrl = uploadResult.url;
                      }
                    }
                    await databaseService.updateProfile(editProfile.id, { name: editName.trim() || editProfile.name, avatar_url: avatarUrl });
                    setShowEditModal(false);
                    setEditProfile(null);
                    setEditImageUri(null);
                    setEditName('');
                    await loadProfiles();
                    Alert.alert('Guardado', 'Perfil actualizado correctamente');
                  } catch (error) {
                    const msg = (error as any)?.message || 'No se pudo actualizar el perfil';
                    Alert.alert('Error', msg);
                  } finally {
                    setEditing(false);
                  }
                }}
                disabled={editing}
              >
                <Text style={styles.createButtonText}>{editing ? 'Guardando...' : 'Guardar'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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

            <Text style={styles.sectionTitle}>Foto de perfil (obligatorio):</Text>
            <TouchableOpacity
              style={styles.imagePickerContainer}
              onPress={handleSelectImage}
              disabled={uploadingImage}
            >
              {selectedImageUri ? (
                <Image
                  source={{ uri: selectedImageUri }}
                  style={styles.previewImage}
                />
              ) : (
                <View style={styles.imagePickerPlaceholder}>
                  {uploadingImage ? (
                    <ActivityIndicator size="large" color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="camera" size={40} color="#666" />
                      <Text style={styles.imagePickerText}>Toca para seleccionar imagen</Text>
                    </>
                  )}
                </View>
              )}
            </TouchableOpacity>

            {/* Input file oculto para web */}
            {Platform.OS === 'web' && (
              <input
                // @ts-ignore
                ref={(el: HTMLInputElement) => { fileInputRef.current = el; }}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleWebFileSelect}
              />
            )}

            {/* Opción de perfil para niños eliminada */}

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
  menuBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#444',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#222',
    zIndex: 10,
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuBox: {
    backgroundColor: '#1f1f1f',
    borderRadius: 10,
    padding: 16,
    width: '90%',
    maxWidth: 320,
  },
  menuItemButton: {
    paddingVertical: 12,
  },
  menuItemText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
  },
  menuItemDelete: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#333',
  },
  menuItemDeleteText: {
    color: '#e50914',
    fontWeight: 'bold',
  },
  // Indicador de niños eliminado
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
  // Estilos de perfil para niños eliminados
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
  imagePickerContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: 'hidden',
    backgroundColor: '#333',
    borderWidth: 2,
    borderColor: '#666',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 15,
    alignSelf: 'center',
  },
  imagePickerPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  imagePickerText: {
    color: '#666',
    fontSize: 12,
    textAlign: 'center',
    paddingHorizontal: 10,
  },
  previewImage: {
    width: '100%',
    height: '100%',
    borderRadius: 60,
  },
});

export default ProfileSelectionScreen;