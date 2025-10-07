import React, { useEffect, useState, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
  Animated,
  ActivityIndicator,
  ScrollView,
  Platform,
  FlatList,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { MovieDetail, Movie, TVShow, TVShowDetail, ContentItem } from '../types';
import { 
  getTrailerUrl, 
  getSimilarMovies, 
  getSimilarTVShows,
  getRecommendedMovies,
  getRecommendedTVShows,
  getMovieDetails,
  getTVShowDetails,
  getImageUrl 
} from '../services/api';
import { colors, spacing } from '../theme';

interface MovieModalProps {
  content: ContentItem | null;
  visible: boolean;
  onClose: () => void;
  movie?: MovieDetail | null; // Mantener compatibilidad hacia atrás
}

export default function MovieModal({ content, movie, visible, onClose }: MovieModalProps) {
  const [currentContent, setCurrentContent] = useState<ContentItem | null>(null);
  const [detailData, setDetailData] = useState<MovieDetail | TVShowDetail | null>(null);
  const [trailerKey, setTrailerKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [relatedContent, setRelatedContent] = useState<(Movie | TVShow)[]>([]);
  const [loadingRelated, setLoadingRelated] = useState(false);
  
  const { width, height } = useWindowDimensions();
  const isSmallScreen = width < 768;
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  // Actualizar contenido cuando cambie el prop
  useEffect(() => {
    if (content) {
      setCurrentContent(content);
    }
  }, [content]);

  useEffect(() => {
    if (visible && currentContent) {
      // Animación de entrada
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
      
      // Cargar detalles del contenido
      loadContentDetails();
      loadRelatedContent();
    } else {
      // Reset animaciones
      fadeAnim.setValue(0);
      slideAnim.setValue(50);
    }
  }, [visible, currentContent]);

  const loadContentDetails = async () => {
    if (!currentContent) return;
    
    setLoading(true);
    try {
      let details;
      if (currentContent.type === 'movie') {
        details = await getMovieDetails(currentContent.id);
      } else {
        details = await getTVShowDetails(currentContent.id);
      }
      
      setDetailData(details);
      
      // Extraer trailer
      const trailer = details.videos?.results.find(
        (video: any) => video.type === 'Trailer' && video.site === 'YouTube'
      );
      
      const anyVideo = details.videos?.results.find(
        (video: any) => video.site === 'YouTube'
      );
      
      if (trailer) {
        setTrailerKey(trailer.key);
      } else if (anyVideo) {
        setTrailerKey(anyVideo.key);
      } else {
        setTrailerKey(null);
      }
    } catch (error) {
      console.error('Error loading content details:', error);
      setTrailerKey(null);
    } finally {
      setLoading(false);
    }
  };

  const loadRelatedContent = async () => {
    if (!currentContent) return;
    
    setLoadingRelated(true);
    try {
      let similar = [];
      let recommended = [];
      
      if (currentContent.type === 'movie') {
        [similar, recommended] = await Promise.all([
          getSimilarMovies(currentContent.id),
          getRecommendedMovies(currentContent.id),
        ]);
      } else {
        [similar, recommended] = await Promise.all([
          getSimilarTVShows(currentContent.id),
          getRecommendedTVShows(currentContent.id),
        ]);
      }
      
      // Combinar y eliminar duplicados
      const combined = [...similar, ...recommended];
      const uniqueContent = combined.filter((item, index, self) =>
        index === self.findIndex((t) => t.id === item.id)
      );
      
      setRelatedContent(uniqueContent.slice(0, 20));
    } catch (error) {
      console.error('Error loading related content:', error);
      setRelatedContent([]);
    } finally {
      setLoadingRelated(false);
    }
  };

  const handleRelatedContentPress = (item: Movie | TVShow) => {
    // Crear nuevo ContentItem
    const isMovie = 'title' in item;
    const newContentItem: ContentItem = {
      id: item.id,
      type: isMovie ? 'movie' : 'tv',
      title: isMovie ? (item as Movie).title : (item as TVShow).name,
      overview: item.overview,
      poster_path: item.poster_path,
      backdrop_path: item.backdrop_path,
      release_date: isMovie ? (item as Movie).release_date : (item as TVShow).first_air_date,
      vote_average: item.vote_average,
    };
    
    // Actualizar el contenido actual - esto recargará el modal con el nuevo contenido
    setCurrentContent(newContentItem);
  };

  const getAgeRating = (): string => {
    if (!detailData) return 'No clasificado';
    
    if (currentContent?.type === 'movie' && 'release_dates' in detailData) {
      const movieDetail = detailData as MovieDetail;
      if (!movieDetail.release_dates?.results) return 'No clasificado';
      
      const usRelease = movieDetail.release_dates.results.find(r => r.iso_3166_1 === 'US');
      const esRelease = movieDetail.release_dates.results.find(r => r.iso_3166_1 === 'ES');
      
      const release = usRelease || esRelease || movieDetail.release_dates.results[0];
      const certification = release?.release_dates?.[0]?.certification;
      
      return certification || 'No clasificado';
    } else if (currentContent?.type === 'tv' && 'content_ratings' in detailData) {
      const tvDetail = detailData as TVShowDetail;
      if (!tvDetail.content_ratings?.results) return 'No clasificado';
      
      const usRating = tvDetail.content_ratings.results.find(r => r.iso_3166_1 === 'US');
      const esRating = tvDetail.content_ratings.results.find(r => r.iso_3166_1 === 'ES');
      
      const rating = usRating || esRating || tvDetail.content_ratings.results[0];
      return rating?.rating || 'No clasificado';
    }
    
    return 'No clasificado';
  };

  const formatRuntime = (minutes: number | number[]): string => {
    if (Array.isArray(minutes)) {
      if (minutes.length === 0) return 'N/A';
      const avgMinutes = Math.round(minutes.reduce((a, b) => a + b, 0) / minutes.length);
      const hours = Math.floor(avgMinutes / 60);
      const mins = avgMinutes % 60;
      return `${hours}h ${mins}min por episodio`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}min`;
  };

  const formatDate = (dateString: string): string => {
    if (!dateString) return 'Fecha desconocida';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const getTitle = (): string => {
    if (!currentContent) return '';
    return currentContent.title;
  };

  const getReleaseDate = (): string => {
    if (!currentContent) return '';
    return currentContent.release_date;
  };

  const getRuntime = (): number | number[] => {
    if (!detailData) return 0;
    if (currentContent?.type === 'movie' && 'runtime' in detailData) {
      return (detailData as MovieDetail).runtime;
    } else if (currentContent?.type === 'tv' && 'episode_run_time' in detailData) {
      return (detailData as TVShowDetail).episode_run_time;
    }
    return 0;
  };

  const handleClose = () => {
    // Animación de salida
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 50,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
      // Reset estado al cerrar
      setCurrentContent(null);
      setDetailData(null);
      setTrailerKey(null);
      setRelatedContent([]);
    });
  };

  if (!currentContent && !movie) return null;

  // Estilos dinámicos basados en el tamaño de pantalla actual
  const dynamicStyles = StyleSheet.create({
    background: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.95)',
      justifyContent: isSmallScreen ? 'flex-start' : 'center',
      alignItems: 'center',
    } as any,
    backgroundTouchable: {
      flex: 1,
      width: '100%',
      justifyContent: isSmallScreen ? 'flex-start' : 'center',
      alignItems: 'center',
    } as any,
    content: {
      backgroundColor: '#181818',
      width: isSmallScreen ? '100%' : width * 0.95,
      maxWidth: isSmallScreen ? width : 900,
      height: isSmallScreen ? '100%' : undefined,
      maxHeight: isSmallScreen ? height : height * 0.95,
      borderRadius: isSmallScreen ? 0 : 12,
      overflow: 'hidden',
    } as any,
    closeButton: {
      position: 'absolute',
      top: isSmallScreen ? 10 : 15,
      right: isSmallScreen ? 10 : 15,
      backgroundColor: 'rgba(20, 20, 20, 0.9)',
      borderRadius: 25,
      width: isSmallScreen ? 40 : 45,
      height: isSmallScreen ? 40 : 45,
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 10000,
    } as any,
    videoContainer: {
      width: '100%',
      height: isSmallScreen ? width * 0.56 : 400,
      backgroundColor: '#000',
      justifyContent: 'center',
      alignItems: 'center',
    } as any,
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
    >
      <Animated.View style={[dynamicStyles.background, { opacity: fadeAnim }]}>
        <TouchableOpacity
          style={dynamicStyles.backgroundTouchable}
          activeOpacity={1}
          onPress={handleClose}
        >
          <Animated.View
            style={[
              dynamicStyles.content,
              {
                transform: [{ translateY: slideAnim }],
                opacity: fadeAnim,
              },
            ]}
            onStartShouldSetResponder={() => true}
          >
            {/* Botón cerrar */}
            <TouchableOpacity style={dynamicStyles.closeButton} onPress={handleClose}>
              <Ionicons name="close" size={isSmallScreen ? 22 : 25} color={colors.text} />
            </TouchableOpacity>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Video del trailer */}
              <View style={dynamicStyles.videoContainer}>
                {loading && (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={styles.loadingText}>Cargando trailer...</Text>
                  </View>
                )}

                {!loading && trailerKey && (
                  Platform.OS === 'web' ? (
                    // Para Web: usar iframe estándar
                    <iframe
                      style={{
                        width: '100%',
                        height: '100%',
                        border: 'none',
                      }}
                      src={`https://www.youtube.com/embed/${trailerKey}?autoplay=0&controls=1&modestbranding=1`}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  ) : (
                    // Para iOS/Android: usar WebView
                    <WebView
                      style={styles.video}
                      source={{
                        uri: `https://www.youtube.com/embed/${trailerKey}?autoplay=0&controls=1&modestbranding=1`,
                      }}
                      allowsFullscreenVideo
                      javaScriptEnabled
                      domStorageEnabled
                    />
                  )
                )}

                {!loading && !trailerKey && (
                  <View style={styles.noTrailerContainer}>
                    <Ionicons name="film-outline" size={50} color={colors.textGray} />
                    <Text style={styles.noTrailerText}>
                      No hay trailer disponible
                    </Text>
                  </View>
                )}
              </View>

              {/* Información del contenido */}
              <View style={styles.info}>
                <View style={styles.titleRow}>
                  <Text style={styles.title}>
                    {getTitle() || 'Sin título'}
                  </Text>
                  {currentContent && (
                    <View style={styles.typeBadge}>
                      <Text style={styles.typeText}>
                        {currentContent.type === 'movie' ? '🎬 Película' : '📺 Serie'}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Metadata en una línea */}
                {currentContent && (
                  <View style={styles.metadataRow}>
                    <View style={styles.ratingBadge}>
                      <Text style={styles.ratingText}>⭐ {currentContent.vote_average.toFixed(1)}</Text>
                    </View>
                    {getRuntime() !== 0 && (
                      <View style={styles.infoBadge}>
                        <Text style={styles.badgeText}>{formatRuntime(getRuntime())}</Text>
                      </View>
                    )}
                    <View style={styles.ageBadge}>
                      <Text style={styles.ageText}>{getAgeRating()}</Text>
                    </View>
                  </View>
                )}

                {/* Información adicional de series */}
                {currentContent?.type === 'tv' && detailData && 'number_of_seasons' in detailData && (
                  <View style={styles.infoRow}>
                    <Ionicons name="list-outline" size={18} color={colors.textGray} />
                    <Text style={styles.infoLabel}>Temporadas:</Text>
                    <Text style={styles.infoValue}>
                      {(detailData as TVShowDetail).number_of_seasons} temporadas, {(detailData as TVShowDetail).number_of_episodes} episodios
                    </Text>
                  </View>
                )}

                {/* Fecha de estreno */}
                {getReleaseDate() && (
                  <View style={styles.infoRow}>
                    <Ionicons name="calendar-outline" size={18} color={colors.textGray} />
                    <Text style={styles.infoLabel}>
                      {currentContent?.type === 'movie' ? 'Estreno:' : 'Primera emisión:'}
                    </Text>
                    <Text style={styles.infoValue}>{formatDate(getReleaseDate())}</Text>
                  </View>
                )}

                {/* Géneros */}
                {detailData?.genres && detailData.genres.length > 0 && (
                  <View style={styles.infoRow}>
                    <Ionicons name="pricetags-outline" size={18} color={colors.textGray} />
                    <Text style={styles.infoLabel}>Géneros:</Text>
                    <Text style={styles.infoValue}>
                      {detailData.genres.map(g => g.name).join(', ')}
                    </Text>
                  </View>
                )}

                {/* Descripción */}
                <View style={styles.overviewSection}>
                  <Text style={styles.overviewTitle}>Sinopsis</Text>
                  <Text style={styles.overview}>
                    {currentContent?.overview || 'Sin descripción disponible'}
                  </Text>
                </View>

                {/* Contenido relacionado */}
                <View style={styles.similarSection}>
                  <Text style={styles.similarTitle}>
                    {currentContent?.type === 'movie' ? 'Películas Relacionadas' : 'Series Relacionadas'}
                  </Text>
                  
                  {loadingRelated ? (
                    <View style={styles.similarLoading}>
                      <ActivityIndicator size="small" color={colors.primary} />
                    </View>
                  ) : relatedContent.length > 0 ? (
                    <ScrollView 
                      horizontal 
                      showsHorizontalScrollIndicator={false}
                      style={styles.similarScroll}
                    >
                      {relatedContent.map((item) => {
                        const isMovie = 'title' in item;
                        const title = isMovie ? (item as Movie).title : (item as TVShow).name;
                        
                        return (
                          <TouchableOpacity
                            key={item.id}
                            style={styles.similarCard}
                            onPress={() => handleRelatedContentPress(item)}
                          >
                            <Image
                              source={{ uri: getImageUrl(item.poster_path, 'w500') }}
                              style={styles.similarPoster}
                              resizeMode="cover"
                            />
                            <View style={styles.similarInfo}>
                              <Text style={styles.similarMovieTitle} numberOfLines={2}>
                                {title}
                              </Text>
                              <View style={styles.similarRating}>
                                <Ionicons name="star" size={12} color="#ffd700" />
                                <Text style={styles.similarRatingText}>
                                  {item.vote_average.toFixed(1)}
                                </Text>
                              </View>
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  ) : (
                    <Text style={styles.noSimilarText}>
                      No hay contenido relacionado disponible
                    </Text>
                  )}
                </View>
              </View>
            </ScrollView>
          </Animated.View>
        </TouchableOpacity>
      </Animated.View>
    </Modal>
  );
}

// Estilos estáticos que no dependen del tamaño de pantalla
const styles = StyleSheet.create({
  info: {
    padding: 24,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    gap: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
    flex: 1,
  },
  typeBadge: {
    backgroundColor: 'rgba(229, 9, 20, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(229, 9, 20, 0.4)',
  },
  typeText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '600',
  },
  metadataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    flexWrap: 'wrap',
    gap: 10,
  },
  ratingBadge: {
    backgroundColor: '#ffd700',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 5,
  },
  ratingText: {
    color: '#000',
    fontSize: 14,
    fontWeight: 'bold',
  },
  infoBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  badgeText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  ageBadge: {
    backgroundColor: 'rgba(229, 9, 20, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  ageText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: 'bold',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 8,
  },
  infoLabel: {
    fontSize: 15,
    color: colors.textGray,
    fontWeight: '600',
    minWidth: 70,
  },
  infoValue: {
    fontSize: 15,
    color: colors.text,
    flex: 1,
    flexWrap: 'wrap',
  },
  overviewSection: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  overviewTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 10,
  },
  overview: {
    fontSize: 15,
    color: '#b3b3b3',
    lineHeight: 24,
  },
  video: {
    width: '100%',
    height: '100%',
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: colors.text,
    fontSize: 16,
    marginTop: spacing.md,
  },
  noTrailerContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  noTrailerText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    marginTop: spacing.md,
  },
  similarSection: {
    marginTop: 30,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  similarTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 16,
  },
  similarLoading: {
    paddingVertical: 30,
    alignItems: 'center',
  },
  similarScroll: {
    marginHorizontal: -5,
  },
  similarCard: {
    width: 140,
    marginHorizontal: 6,
    marginBottom: 10,
  },
  similarPoster: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    backgroundColor: '#2a2a2a',
  },
  similarInfo: {
    marginTop: 8,
  },
  similarMovieTitle: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '600',
    marginBottom: 4,
    lineHeight: 16,
  },
  similarRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  similarRatingText: {
    fontSize: 12,
    color: colors.textGray,
    fontWeight: '500',
  },
  noSimilarText: {
    fontSize: 14,
    color: colors.textGray,
    textAlign: 'center',
    paddingVertical: 20,
  },
});

