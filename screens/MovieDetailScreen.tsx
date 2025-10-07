import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { HomeStackParamList, MovieDetail, ContentItem } from '../types';
import { getMovieDetails, getImageUrl } from '../services/api';
import MovieModal from '../components/MovieModal';
import { colors, spacing } from '../theme';

type Props = NativeStackScreenProps<HomeStackParamList, 'MovieDetail'>;

export default function MovieDetailScreen({ route }: Props) {
  const [movie, setMovie] = useState<MovieDetail | null>(null);
  const [contentItem, setContentItem] = useState<ContentItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    loadMovie();
  }, []);

  const loadMovie = async () => {
    try {
      const data = await getMovieDetails(route.params.movieId);
      setMovie(data);
      
      // Crear ContentItem para el modal
      const content: ContentItem = {
        id: data.id,
        type: 'movie',
        title: data.title,
        overview: data.overview,
        poster_path: data.poster_path,
        backdrop_path: data.backdrop_path,
        release_date: data.release_date,
        vote_average: data.vote_average,
      };
      setContentItem(content);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const openTrailer = () => {
    setModalVisible(true);
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
        <Image
          source={{ uri: getImageUrl(movie.backdrop_path, 'original') }}
          style={styles.backdrop}
        />
        <View style={styles.content}>
          <Text style={styles.title}>{movie.title}</Text>
          <Text style={styles.date}>Fecha: {movie.release_date}</Text>
          <Text style={styles.rating}>⭐ {movie.vote_average.toFixed(1)}</Text>
          <Text style={styles.overview}>{movie.overview}</Text>
          
          <TouchableOpacity style={styles.button} onPress={openTrailer}>
            <Text style={styles.buttonText}>▶ Ver Trailer</Text>
          </TouchableOpacity>
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
  backdrop: {
    width: '100%',
    height: 300,
  },
  content: {
    padding: spacing.lg,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  date: {
    fontSize: 14,
    color: colors.textGray,
    marginBottom: spacing.xs,
  },
  rating: {
    fontSize: 16,
    color: colors.text,
    marginBottom: spacing.md,
  },
  overview: {
    fontSize: 16,
    color: colors.text,
    lineHeight: 24,
    marginBottom: spacing.lg,
  },
  button: {
    backgroundColor: colors.primary,
    padding: spacing.md,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: colors.text,
    fontSize: 18,
    fontWeight: 'bold',
  },
});

