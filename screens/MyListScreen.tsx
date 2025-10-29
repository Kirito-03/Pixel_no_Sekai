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
import { colors, spacing } from '../theme';
import databaseService from '../services/databaseService';
import { getMovieDetails } from '../services/api';
import { ContentItem } from '../types';

// Definir interfaz Movie localmente
interface Movie {
  id: number;
  title: string;
  description: string;
  posterUrl: string;
  backdropUrl: string;
  releaseYear: number;
  rating: number;
  titulo: string;
  poster_url: string;
}

type Props = NativeStackScreenProps<RootStackParamList, 'MyList'>;

export default function MyListScreen({ navigation }: Props) {
  const { currentProfile } = useProfile();
  const { refreshMyList, removeFromMyList } = useMyList();
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [profileName, setProfileName] = useState<string>('');
  const [selectedContent, setSelectedContent] = useState<ContentItem | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

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
    
    setLoading(true);
    try {
      // Refrescar la lista global
      await refreshMyList();
      
      // Obtener los elementos de Mi Lista desde la base de datos
      const myListItems = await databaseService.getMyList(currentProfile.id);
      
      if (myListItems.length === 0) {
        setMovies([]);
        return;
      }

      // Obtener detalles de cada película desde la API de TMDB
      const moviePromises = myListItems.map(async (item: any) => {
        try {
          const movieDetail = await getMovieDetails(item.content_id);
          return {
            id: movieDetail.id,
            title: movieDetail.title,
            description: movieDetail.overview,
            posterUrl: movieDetail.poster_path,
            backdropUrl: movieDetail.backdrop_path,
            releaseYear: new Date(movieDetail.release_date).getFullYear(),
            rating: movieDetail.vote_average,
            titulo: movieDetail.title, // Para compatibilidad con la interfaz Movie
            poster_url: movieDetail.poster_path
          };
        } catch (error) {
          console.error(`Error loading movie ${item.content_id}:`, error);
          return null;
        }
      });

      const movieDetails = await Promise.all(moviePromises);
      const validMovies = movieDetails.filter(movie => movie !== null);
      setMovies(validMovies);
    } catch (error) {
      console.error('Error loading my list:', error);
      Alert.alert('Error', 'No se pudo cargar Mi Lista');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFromList = async (movieId: number) => {
    if (!currentProfile) return;

    Alert.alert(
      'Eliminar de Mi Lista',
      '¿Estás seguro de que quieres eliminar esta película de tu lista?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              // Usar el contexto para eliminar
              await removeFromMyList(movieId, 'movie');
              
              // Actualizar la lista local
              setMovies(prev => prev.filter(movie => movie.id !== movieId));
              Alert.alert('Eliminado', 'Película eliminada de Mi Lista');
            } catch (error) {
              console.error('Error removing from list:', error);
              Alert.alert('Error', 'No se pudo eliminar la película');
            }
          }
        }
      ]
    );
  };

  const handleContentPress = (item: Movie) => {
    // Convertir Movie a ContentItem para el modal
    const contentItem: ContentItem = {
      id: item.id!,
      type: 'movie', // Asumimos que son películas por ahora
      title: item.title,
      overview: item.description || '',
      poster_path: item.posterUrl || '',
      backdrop_path: item.backdropUrl || '',
      release_date: item.releaseYear?.toString() || '',
      vote_average: item.rating || 0,
      source: 'tmdb',
    };
    
    setSelectedContent(contentItem);
    setModalVisible(true);
  };

  const renderMovie = ({ item }: { item: Movie }) => (
    <View style={styles.movieContainer}>
      <MovieCard
        movie={{
          id: item.id!,
          title: item.title,
          poster_path: item.posterUrl || '',
          backdrop_path: item.backdropUrl || '',
          overview: item.description || '',
          release_date: item.releaseYear?.toString() || '',
          vote_average: item.rating || 0,
        }}
        onPress={() => handleContentPress(item)}
      />
      <TouchableOpacity
        style={styles.removeButton}
        onPress={() => handleRemoveFromList(item.id!)}
      >
        <Text style={styles.removeButtonText}>✕</Text>
      </TouchableOpacity>
    </View>
  );

  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyTitle}>Tu lista está vacía</Text>
      <Text style={styles.emptyText}>
        Agrega películas y series a tu lista para verlas más tarde
      </Text>
      <TouchableOpacity
        style={styles.browseButton}
        onPress={() => navigation.navigate('Home')}
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
          {movies.length} {movies.length === 1 ? 'película' : 'películas'}
        </Text>
      </View>

      <FlatList
        data={movies}
        renderItem={renderMovie}
        keyExtractor={(item) => item.id!.toString()}
        numColumns={2}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={renderEmptyList}
        showsVerticalScrollIndicator={false}
      />

      {/* Modal de detalles */}
      <MovieModal
        content={selectedContent}
        visible={modalVisible}
        onClose={() => {
          setModalVisible(false);
          setSelectedContent(null);
        }}
      />
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
    paddingVertical: spacing.xxl,
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