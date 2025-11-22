import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { useProfile } from '../contexts/ProfileContext';
import { useMyList } from '../contexts/MyListContext';
import MovieCard from '../components/MovieCard';
import MovieModal from '../components/MovieModal';
import AnimeSeriesModal from '../components/AnimeSeriesModal';
import { colors, spacing } from '../theme';
import databaseService from '../services/databaseService';
import { getContentDetails } from '../services/api';
import { ContentItem } from '../types';
import { Ionicons } from '@expo/vector-icons';

// Dejamos de usar la interfaz local Movie, trabajamos directamente con ContentItem

type Props = NativeStackScreenProps<RootStackParamList, 'MyList'>;

export default function MyListScreen({ navigation }: Props) {
  const { currentProfile, adultContentEnabled } = useProfile();
  const { refreshMyList, removeFromMyList, myListItems } = useMyList();
  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [profileName, setProfileName] = useState<string>('');
  const [selectedContent, setSelectedContent] = useState<ContentItem | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [removingKey, setRemovingKey] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (currentProfile) {
        setProfileName(currentProfile.name);
        loadMyList();
      }
    }, [currentProfile])
  );

  const loadMyList = async () => {
    if (!currentProfile) return;
    
    console.log('📋 MyListScreen: Starting loadMyList for profile:', currentProfile.id);
    setLoading(true);
    try {
      // Refrescar la lista global
      console.log('📋 MyListScreen: Refreshing global list');
      await refreshMyList();
      
      // Obtener los elementos de Mi Lista desde la base de datos
      console.log('📋 MyListScreen: Fetching items from database');
      const myListItems = await databaseService.getMyList(currentProfile.id);
      console.log('📋 MyListScreen: Items received from database:', myListItems);
      
      if (myListItems.length === 0) {
        console.log('📋 MyListScreen: No items found, setting empty list');
        setItems([]);
        return;
      }

      // Obtener detalles respetando el tipo de contenido (movie/tv/anime)
      console.log('📋 MyListScreen: Processing', myListItems.length, 'items');
      const detailPromises = myListItems.map(async (item: any, index: number) => {
        try {
          // Normalizar el tipo desde el backend por si llega con mayúsculas o variantes
          const typeRaw = String(item.content_type || '').toLowerCase();
          let type: 'movie' | 'tv' | 'anime';
          if (typeRaw === 'movie' || typeRaw === 'tv' || typeRaw === 'anime') {
            type = typeRaw as 'movie' | 'tv' | 'anime';
          } else {
            type = 'movie';
            console.warn(`⚠️ MyListScreen: content_type inválido ('${typeRaw}') para ID ${item.content_id}. Usando fallback 'movie'.`);
          }
          const source = type === 'anime' ? 'anilist' : 'tmdb';
          
          console.log(`📋 MyListScreen: Processing item ${index + 1}/${myListItems.length}:`, {
            contentId: item.content_id,
            originalType: item.content_type,
            normalizedType: type,
            source
          });
          
          const content = await getContentDetails(Number(item.content_id), type, source);
          
          if (content) {
            console.log(`✅ MyListScreen: Item ${index + 1} loaded successfully:`, {
              id: content.id,
              title: content.title,
              type: content.type,
              source: content.source
            });
          } else {
            console.log(`❌ MyListScreen: Item ${index + 1} failed to load (null response)`);
          }
          
          return content; // ContentItem o null
        } catch (error) {
          console.error(`❌ MyListScreen: Error loading item ${index + 1} (${item.content_id}/${item.content_type}):`, error);
          return null;
        }
      });

      const details = await Promise.allSettled(detailPromises);
      let validItems = details
        .map((result, index) => {
          if (result.status === 'fulfilled') {
            return result.value;
          } else {
            const item = myListItems[index];
            console.error(`❌ MyListScreen: Failed to load item ${item.content_id}/${item.content_type}:`, result.reason);
            
            // Si es un error 404 de TMDB, loggear para posible auto-eliminación
            if (result.reason?.message?.includes('TMDB_404')) {
              console.warn(`🗑️ MyListScreen: TMDB 404 detected for item ${item.content_id}, item may need removal`);
            }
            // Si es un error 404 de AniList
            if (result.reason?.message?.includes('ANILIST_404')) {
              console.warn(`🗑️ MyListScreen: AniList 404 detected for anime ${item.content_id}, item may need removal`);
            }
            
            return null;
          }
        })
        .filter((c): c is ContentItem => !!c);

      // Aplicar filtro de +18 para anime si está deshabilitado
      if (!adultContentEnabled) {
        validItems = validItems.filter(item => !(item.type === 'anime' && item.isAdult));
      }
      
      // Auto-eliminar opcional de items inválidos (404)
      const removalCandidates = details
        .map((result, index) => ({ result, item: myListItems[index] }))
        .filter(({ result }) => result.status === 'rejected' && (
          (result.reason?.message?.includes('TMDB_404')) ||
          (result.reason?.message?.includes('ANILIST_404'))
        ));

      if (removalCandidates.length > 0) {
        console.warn(`🧹 MyListScreen: Auto-removing ${removalCandidates.length} invalid items (404)`);
        for (const { item } of removalCandidates) {
          try {
            const typeRaw = String(item.content_type || '').toLowerCase();
            const type: 'movie' | 'tv' | 'anime' = (typeRaw === 'movie' || typeRaw === 'tv' || typeRaw === 'anime')
              ? (typeRaw as 'movie' | 'tv' | 'anime')
              : 'movie';
            console.log(`🗑️ MyListScreen: Removing invalid item ${item.content_id} (${type})`);
            await removeFromMyList(Number(item.content_id), type);
          } catch (remErr) {
            console.error('❌ MyListScreen: Failed to auto-remove invalid item', remErr);
          }
        }
        // Refrescar estado global después de las eliminaciones
        try {
          await refreshMyList();
        } catch (refreshErr) {
          console.error('❌ MyListScreen: Failed to refresh after auto-removals', refreshErr);
        }
      }

      console.log('📋 MyListScreen: Final results:', {
        totalItems: myListItems.length,
        validItems: validItems.length,
        failedItems: myListItems.length - validItems.length
      });
      
      setItems(validItems);
    } catch (error) {
      console.error('❌ MyListScreen: Error loading my list:', error);
      Alert.alert('Error', 'No se pudo cargar Mi Lista');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFromList = async (content: ContentItem) => {
    if (!currentProfile) return;

    Alert.alert(
      'Eliminar de Mi Lista',
      '¿Estás seguro de que quieres eliminar este contenido de tu lista?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              const key = `${content.type}:${content.id}`;
              setRemovingKey(key);
              // Usar el contexto para eliminar con el tipo correcto
              await removeFromMyList(content.id, content.type);

              // Actualizar la lista local filtrando por id+tipo
              setItems(prev => prev.filter(item => !(item.id === content.id && item.type === content.type)));
              Alert.alert('Eliminado', 'Contenido eliminado de Mi Lista');
            } catch (error) {
              console.error('Error removing from list:', error);
              Alert.alert('Error', 'No se pudo eliminar el contenido');
            } finally {
              setRemovingKey(null);
            }
          }
        }
      ]
    );
  };

  const handleContentPress = (item: ContentItem) => {
    setSelectedContent(item);
    setModalVisible(true);
  };

  const renderItem = ({ item }: { item: ContentItem }) => (
    <View style={styles.movieContainer}>
      <MovieCard movie={item} onPress={() => handleContentPress(item)} />
      <TouchableOpacity
        style={[styles.removeButton, removingKey === `${item.type}:${item.id}` && { opacity: 0.6 } ]}
        onPress={() => handleRemoveFromList(item)}
        disabled={removingKey === `${item.type}:${item.id}`}
      >
        {removingKey === `${item.type}:${item.id}` ? (
          <ActivityIndicator size="small" color={colors.text} />
        ) : (
          <Ionicons name="close" size={18} color={colors.text} />
        )}
      </TouchableOpacity>
    </View>
  );

  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyTitle}>Tu lista está vacía</Text>
      <Text style={styles.emptyText}>
        Agrega películas, series y anime a tu lista para verlos más tarde
      </Text>
      <TouchableOpacity
        style={styles.browseButton}
        onPress={() => navigation.navigate('Main')}
      >
        <Text style={styles.browseButtonText}>Explorar contenido</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Cargando Mi Lista...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Mi Lista</Text>
        <Text style={styles.subtitle}>Perfil de {profileName}</Text>
        <Text style={styles.count}>
          {items.length} {items.length === 1 ? 'título' : 'títulos'}
        </Text>
      </View>

      <FlatList
        data={items}
        renderItem={renderItem}
        keyExtractor={(item) => `${item.type}:${item.id}`}
        numColumns={2}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={renderEmptyList}
        showsVerticalScrollIndicator={false}
      />

      {/* Modal de detalles: usar modal específico para anime */}
      {selectedContent?.type === 'anime' ? (
        <AnimeSeriesModal
          content={selectedContent}
          visible={modalVisible}
          onClose={() => {
            setModalVisible(false);
            setSelectedContent(null);
          }}
        />
      ) : (
        <MovieModal
          content={selectedContent}
          visible={modalVisible}
          onClose={() => {
            setModalVisible(false);
            setSelectedContent(null);
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    color: colors.text,
    marginTop: spacing.md,
    fontSize: 16,
  },
  header: {
    padding: spacing.lg,
    paddingTop: spacing.xl,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textGray,
    marginBottom: spacing.xs,
  },
  count: {
    fontSize: 14,
    color: colors.textGray,
  },
  listContainer: {
    padding: spacing.md,
    paddingTop: 0,
  },
  movieContainer: {
    flex: 1,
    margin: spacing.xs,
    position: 'relative',
  },
  removeButton: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  removeButtonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl * 2,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: colors.textGray,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: spacing.xl,
  },
  browseButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: 8,
  },
  browseButtonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: 'bold',
  },
});