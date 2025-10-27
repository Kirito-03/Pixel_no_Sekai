import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  useWindowDimensions,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { HomeStackParamList, MovieDetail, ContentItem } from '../types';
import { getMovieDetails, getImageUrl } from '../services/api';
import { useProfile } from '../contexts/ProfileContext';
import { useMyList } from '../contexts/MyListContext';
import MovieModal from '../components/MovieModal';
import { colors, spacing } from '../theme';

type Props = NativeStackScreenProps<HomeStackParamList, 'MovieDetail'>;

export default function MovieDetailScreen({ route, navigation }: Props) {
  const { currentProfile } = useProfile();
  const { isInMyList, toggleMyList } = useMyList();
  const [movie, setMovie] = useState<MovieDetail | null>(null);
  const [contentItem, setContentItem] = useState<ContentItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    if (route.params.movieId) {
      loadMovieDetails();
    }
  }, [route.params.movieId]);

  const loadMovieDetails = async () => {
    setLoading(true);
    try {
      const movieDetail = await getMovieDetails(route.params.movieId);
      setMovie(movieDetail);
      
      // Crear ContentItem para el modal
      const content: ContentItem = {
        id: movieDetail.id,
        type: 'movie',
        title: movieDetail.title,
        overview: movieDetail.overview,
        poster_path: movieDetail.poster_path,
        backdrop_path: movieDetail.backdrop_path,
        release_date: movieDetail.release_date,
        vote_average: movieDetail.vote_average,
      };
      setContentItem(content);
    } catch (error) {
      console.error('Error loading movie details:', error);
      Alert.alert('Error', 'No se pudo cargar la información de la película');
    } finally {
      setLoading(false);
    }
  };

  const openTrailer = () => {
    setModalVisible(true);
  };

  const handleToggleMyList = async () => {
    if (!currentProfile) {
      Alert.alert('Error', 'No hay perfil seleccionado');
      return;
    }

    try {
      await toggleMyList(route.params.movieId, 'movie');
      const action = isInMyList(route.params.movieId) ? 'eliminada de' : 'agregada a';
      Alert.alert('Éxito', `Película ${action} Mi Lista`);
    } catch (error) {
      console.error('Error toggling my list:', error);
      if (error.response?.status === 409 || error.message?.includes('duplicate')) {
        Alert.alert('Información', 'Este título ya está en tu lista.');
      } else {
        Alert.alert('Error', 'No se pudo actualizar Mi Lista');
      }
    }
  };

  const getYear = (date: string) => {
    return date ? date.split('-')[0] : '';
  };

  const getDuration = () => {
    // Si tienes runtime en tu MovieDetail, úsalo. Si no, usa un valor por defecto
    return movie?.runtime ? `${Math.floor(movie.runtime / 60)}h ${movie.runtime % 60}min` : '1h 43min';
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!movie) return null;

  return (
    <>
      <ScrollView style={styles.container}>
        {/* Header con backdrop */}
        <View style={styles.headerContainer}>
          <Image
            source={{ uri: getImageUrl(movie.backdrop_path, 'original') }}
            style={styles.backdrop}
          />
          {/* Gradient overlay */}
          <View style={styles.gradientOverlay} />
          
          {/* Botones de navegación superior */}
          <View style={styles.topBar}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={28} color={colors.text} />
            </TouchableOpacity>
            <View style={styles.topBarRight}>
              <TouchableOpacity style={styles.iconButton}>
                <Ionicons name="search" size={28} color={colors.text} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Contenido principal */}
        <View style={styles.content}>
          {/* Logo de Netflix */}
          <Text style={styles.netflixLogo}>NETFLIX</Text>
          
          {/* Título */}
          <Text style={styles.title}>{movie.title}</Text>
          
          {/* Metadatos */}
          <View style={styles.metadata}>
            <Text style={styles.metadataText}>{getYear(movie.release_date)}</Text>
            <View style={styles.dot} />
            <View style={styles.ratingBadge}>
              <Text style={styles.ratingText}>16+</Text>
            </View>
            <View style={styles.dot} />
            <Text style={styles.metadataText}>{getDuration()}</Text>
            <View style={styles.dot} />
            <Ionicons name="square" size={16} color={colors.textGray} />
            <Text style={styles.metadataText}>HD</Text>
            <View style={styles.dot} />
            <Ionicons name="volume-high" size={16} color={colors.textGray} />
          </View>

          {/* Botón Ver */}
          <TouchableOpacity style={styles.playButton} onPress={openTrailer}>
            <Ionicons name="play" size={24} color={colors.background} />
            <Text style={styles.playButtonText}>Ver</Text>
          </TouchableOpacity>

          {/* Botón Descargar */}
          <TouchableOpacity style={styles.downloadButton}>
            <Ionicons name="download-outline" size={24} color={colors.text} />
            <Text style={styles.downloadButtonText}>Descargar</Text>
          </TouchableOpacity>

          {/* Sinopsis */}
          <Text style={styles.overview}>{movie.overview}</Text>

          {/* Cast y Dirección */}
          {movie.credits?.cast && (
            <Text style={styles.credits}>
              <Text style={styles.creditsLabel}>Protagonistas: </Text>
              <Text style={styles.creditsText}>
                {movie.credits.cast.slice(0, 3).map(actor => actor.name).join(', ')}
                {movie.credits.cast.length > 3 ? '... más' : ''}
              </Text>
            </Text>
          )}
          
          {movie.credits?.crew && (
            <Text style={styles.credits}>
              <Text style={styles.creditsLabel}>Dirección: </Text>
              <Text style={styles.creditsText}>
                {movie.credits.crew
                  .filter(person => person.job === 'Director')
                  .map(director => director.name)
                  .join(', ')}
              </Text>
            </Text>
          )}

          {/* Botón Mi lista */}
          <View style={styles.actionsContainer}>
            <TouchableOpacity style={styles.actionButton} onPress={handleToggleMyList}>
              <Ionicons 
                name={isInMyList(route.params.movieId) ? "checkmark" : "add"} 
                size={24} 
                color={colors.text} 
              />
              <Text style={styles.actionText}>Mi lista</Text>
            </TouchableOpacity>
          </View>

          {/* Sección de títulos similares */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Más títulos similares</Text>
            {/* Aquí irían las películas similares */}
          </View>
        </View>
      </ScrollView>

      <MovieModal
        content={contentItem}
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
      />
    </>
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
  headerContainer: {
    position: 'relative',
    height: 400,
  },
  backdrop: {
    width: '100%',
    height: '100%',
  },
  gradientOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 150,
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: 50,
    paddingBottom: spacing.md,
  },
  backButton: {
    padding: spacing.sm,
  },
  topBarRight: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  iconButton: {
    padding: spacing.sm,
  },
  content: {
    padding: spacing.lg,
  },
  netflixLogo: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.primary,
    letterSpacing: 2,
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.md,
  },
  metadata: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
    flexWrap: 'wrap',
  },
  metadataText: {
    fontSize: 14,
    color: colors.textGray,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.textGray,
    marginHorizontal: spacing.sm,
  },
  ratingBadge: {
    backgroundColor: colors.textGray,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 2,
  },
  ratingText: {
    fontSize: 12,
    color: colors.background,
    fontWeight: 'bold',
  },
  playButton: {
    backgroundColor: colors.text,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: 4,
    marginBottom: spacing.md,
  },
  playButtonText: {
    color: colors.background,
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: spacing.sm,
  },
  downloadButton: {
    backgroundColor: '#2a2a2a',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: 4,
    marginBottom: spacing.lg,
  },
  downloadButtonText: {
    color: colors.text,
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: spacing.sm,
  },
  overview: {
    fontSize: 15,
    color: colors.text,
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  credits: {
    fontSize: 13,
    marginBottom: spacing.sm,
  },
  creditsLabel: {
    color: colors.textGray,
  },
  creditsText: {
    color: colors.text,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
  },
  actionButton: {
    alignItems: 'center',
    marginRight: spacing.xl,
  },
  actionText: {
    color: colors.textGray,
    fontSize: 12,
    marginTop: spacing.xs,
  },
  section: {
    marginTop: spacing.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.md,
  },
});