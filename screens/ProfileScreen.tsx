import React, { useState, useRef } from 'react';
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
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { CommonActions } from '@react-navigation/native';
import { spacing } from '../theme';
import { useTheme } from '../contexts/ThemeContext';
import { useProfile } from '../contexts/ProfileContext';
import { useAuth } from '../contexts/AuthContext';
import databaseService from '../services/databaseService';

export default function ProfileScreen({ navigation }: any) {
  const { colors, theme } = useTheme();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [updatingAvatar, setUpdatingAvatar] = useState(false);
  const [avatarKey, setAvatarKey] = useState(0); // Para forzar el re-renderizado de la imagen
  const [imageError, setImageError] = useState(false); // Para manejar errores de carga
  const { currentProfile, setCurrentProfile, clearCurrentProfile, adultContentEnabled, setAdultContentEnabled } = useProfile();
  const { logout, user } = useAuth();
  const fileInputRef = useRef<any>(null);
  
  const { width } = useWindowDimensions();
  const isSmallScreen = width < 768;

  // Añade un parámetro de cache-busting a la URL para forzar refresco en Android
  const appendCacheBust = (url: string) => {
    try {
      // Si ya existe algún query, añadimos usando &; si no, usamos ?
      const hasQuery = url.includes('?');
      const sep = hasQuery ? '&' : '?';
      // Usar avatarKey para que solo cambie cuando el usuario actualiza el avatar
      return `${url}${sep}cb=${avatarKey}`;
    } catch {
      return url;
    }
  };

  // Función para obtener la URL del avatar, con fallback si es necesario
  const getAvatarUrl = () => {
    if (!currentProfile?.avatar_url) {
      return appendCacheBust('https://upload.wikimedia.org/wikipedia/commons/0/0b/Netflix-avatar.png');
    }
    
    if (currentProfile.avatar_url.startsWith('data:')) {
      return currentProfile.avatar_url;
    }
    if (currentProfile.avatar_url.startsWith('http')) {
      return appendCacheBust(currentProfile.avatar_url);
    }
    return currentProfile.avatar_url;
  };

  // Función para manejar la imagen seleccionada (común para web y móvil)
  const processSelectedImage = async (imageSource: string | File) => {
    if (!currentProfile) return;
    
    setUpdatingAvatar(true);
    try {
      // Subir la imagen al servidor (acepta tanto URI string como File object)
      const uploadResult = await databaseService.uploadAvatar(imageSource);
      
  console.log('Imagen subida, URL:', uploadResult.url);
      
      // Actualizar el perfil con la nueva URL del avatar
      await databaseService.updateProfile(currentProfile.id, {
        avatar_url: uploadResult.url,
      });
      
      // Actualizar el perfil en el contexto con la nueva URL
      const updatedProfile = {
        ...currentProfile,
        avatar_url: uploadResult.url,
      };
      
      console.log('Actualizando perfil en contexto:', updatedProfile);
      await setCurrentProfile(updatedProfile);
      
      // Forzar actualización de la imagen incrementando la key
      setAvatarKey(prev => prev + 1);
      // Prefetch explícito para ayudar a RN/Android a refrescar la imagen
      try {
        const nextUrl = `${uploadResult.url}${uploadResult.url.includes('?') ? '&' : '?'}cb=${avatarKey + 1}`;
        // @ts-ignore - RN Image tiene prefetch
        Image.prefetch(nextUrl);
        console.log('Prefetch de nuevo avatar:', nextUrl);
      } catch (e) {
        // Ignorar si prefetch no está disponible
      }
      setImageError(false); // Resetear el error para intentar cargar la nueva imagen
      
      // Pequeño delay para asegurar que el estado se actualice
      await new Promise(resolve => setTimeout(resolve, 200));
      
      Alert.alert('Éxito', 'Avatar actualizado correctamente');
    } catch (error) {
      console.error('Error al actualizar avatar:', error);
      Alert.alert('Error', 'No se pudo actualizar el avatar. Por favor intenta nuevamente.');
    } finally {
      setUpdatingAvatar(false);
    }
  };

  // Función para web: manejar input file
  const handleWebFileSelect = async (event: any) => {
    const file = event.target?.files?.[0];
    if (!file) return;

    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
      Alert.alert('Error', 'Por favor selecciona un archivo de imagen');
      return;
    }

    // Validar tamaño (5MB máximo)
    if (file.size > 5 * 1024 * 1024) {
      Alert.alert('Error', 'El archivo es demasiado grande. Máximo 5MB');
      return;
    }

    // En web, pasamos el File object directamente a processSelectedImage
    await processSelectedImage(file as any);
    
    // Limpiar el input para que se pueda seleccionar el mismo archivo de nuevo
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Cerrar sesión',
      '¿Estás seguro de que quieres cerrar sesión?',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Cerrar sesión',
          style: 'destructive',
          onPress: async () => {
            await clearCurrentProfile();
            await logout();
            navigation.replace('Login');
          },
        },
      ]
    );
  };

  const handleChangeAvatar = async () => {
    if (!currentProfile) return;
    
    // En web, usar input file nativo
    if (Platform.OS === 'web') {
      if (fileInputRef.current) {
        fileInputRef.current.click();
      }
      return;
    }

    // Para móviles (Android/iOS), usar expo-image-picker
    try {
      // Pedir permisos para acceder a la galería
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Permisos requeridos',
          'Necesitamos acceso a tu galería para cambiar el avatar',
          [{ text: 'OK' }]
        );
        return;
      }

      // Abrir el picker de imágenes
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'] as any,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const imageUri = result.assets[0].uri;
      await processSelectedImage(imageUri);
    } catch (error) {
      console.error('Error al seleccionar imagen:', error);
      Alert.alert('Error', 'No se pudo seleccionar la imagen');
    }
  };

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
      // El borde rojo no era consistente con la imagen. Eliminamos el borde para que el avatar se vea limpio
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
                        const avatarUrl = getAvatarUrl();
                        console.error('Error al cargar imagen del avatar');
                        console.error('URL intentada:', avatarUrl);
                        console.error('URL original:', currentProfile?.avatar_url);
                        // BASE_URL ya no aplica; avatares vienen de Firebase Storage o data-url
                        if (error?.nativeEvent) {
                          console.error('Error nativo:', JSON.stringify(error.nativeEvent, null, 2));
                        }
                        setImageError(true);
                      }}
                      onLoad={() => {
  console.log('Avatar cargado exitosamente:', getAvatarUrl());
                        setImageError(false); // Resetear error si carga correctamente
                      }}
                      onLoadStart={() => {
                        console.log('Iniciando carga del avatar:', getAvatarUrl());
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
            {/* Input file oculto para web */}
            {Platform.OS === 'web' && (
              <input
                // @ts-ignore - React Native Web permite elementos HTML
                ref={(el: HTMLInputElement) => { fileInputRef.current = el; }}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleWebFileSelect}
              />
            )}
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

          {/* Eliminado: Métodos de Pago */}

          {/* Contenido +18 (como Notificaciones) */}
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
            onPress={async () => {
              try {
                // Limpiar el perfil actual
                await clearCurrentProfile();
                console.log('📱 Limpiando perfil y navegando a ProfileSelection...');
                
                // Intentar múltiples métodos de navegación
                const parent = navigation.getParent();
                const grandParent = parent?.getParent();
                
                console.log('📱 Parent existe:', !!parent);
                console.log('📱 GrandParent existe:', !!grandParent);
                
                // Intentar con el grandParent primero (RootStack)
                if (grandParent) {
                  console.log('📱 Usando grandParent para navegar...');
                  grandParent.dispatch(
                    CommonActions.reset({
                      index: 0,
                      routes: [
                        {
                          name: 'ProfileSelection',
                          // Usar el id del usuario (o fallback al usuario_id del perfil actual)
                          params: { },
                        },
                      ],
                    })
                  );
                } else if (parent) {
                  console.log('📱 Usando parent para navegar...');
                  parent.dispatch(
                    CommonActions.reset({
                      index: 0,
                      routes: [
                        {
                          name: 'ProfileSelection',
                          params: { },
                        },
                      ],
                    })
                  );
                } else {
                  // Último recurso: subir manualmente
                  console.log('📱 Subiendo manualmente al root...');
                  let rootNavigator = navigation;
                  while (rootNavigator.getParent()) {
                    rootNavigator = rootNavigator.getParent();
                  }
                  rootNavigator.dispatch(
                    CommonActions.reset({
                      index: 0,
                      routes: [
                        {
                          name: 'ProfileSelection',
                          params: { },
                        },
                      ],
                    })
                  );
                }
                
  console.log('Navegación completada');
              } catch (error) {
  console.error('Error al navegar:', error);
                Alert.alert('Error', 'No se pudo cambiar de perfil. Intenta de nuevo.');
              }
            }}
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

          {/* Eliminado: Reproducción automática */}

          <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('Downloads' as never)}>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>Descargas</Text>
              <Text style={styles.menuSubtitle}>Gestionar descargas</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={colors.textGray} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('Appearance' as never)}>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>Apariencia</Text>
              <Text style={styles.menuSubtitle}>Tema actual: {theme === 'dark' ? 'Oscuro' : 'Claro'}</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={colors.textGray} />
          </TouchableOpacity>
        </View>

        {/* Sección CERRAR SESIÓN */}
        <View style={styles.section}>
          <TouchableOpacity 
            style={[styles.menuItem, styles.logoutButton]} 
            onPress={handleLogout}
          >
            <View style={styles.menuContent}>
              <Text style={[styles.menuTitle, styles.logoutText]}>Cerrar sesión</Text>
            </View>
            <Ionicons name="log-out-outline" size={24} color="#e50914" />
          </TouchableOpacity>
        </View>

        {/* Espaciado inferior */}
        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// styles moved inside component to support dynamic theming

