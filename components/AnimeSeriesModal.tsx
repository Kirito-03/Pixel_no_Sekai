import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Dimensions,
  Animated,
  FlatList,
  Modal,
  useWindowDimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import { ContentItem, MovieDetail, TVShowDetail, AnimeDetail } from '../types';
import { getImageUrl, getMovieDetails, getTVShowDetails } from '../services/api';
import { getAnimeDetails, getSimilarAnime, getAnimeImageUrl, getAnimeTitle, getAnimeYear, getAnimeScore } from '../services/anilistService';
import { useProfile } from '../contexts/ProfileContext';
import { useMyList } from '../contexts/MyListContext';

interface AnimeSeriesModalProps {
  content: ContentItem | null;
  visible: boolean;
  onClose: () => void;
}

export default function AnimeSeriesModal({
  content,
  visible,
  onClose,
}: AnimeSeriesModalProps) {
  const [currentContent, setCurrentContent] = useState<ContentItem | null>(null);
  const [detailData, setDetailData] = useState<MovieDetail | TVShowDetail | AnimeDetail | null>(null);
  const [trailerKey, setTrailerKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [relatedContent, setRelatedContent] = useState<(MovieDetail | TVShowDetail)[]>([]);
  const [loadingRelated, setLoadingRelated] = useState(false);
  const [showTrailer, setShowTrailer] = useState(false);
  const [trailerDelay, setTrailerDelay] = useState(false);
  const [trailerFinished, setTrailerFinished] = useState(false);
  
  const { currentProfile } = useProfile();
  const { isInMyList, toggleMyList } = useMyList();
  
  const { width, height } = useWindowDimensions();
  const isSmallScreen = width < 768;
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(height)).current;

  // Verificar si el contenido actual está en Mi Lista
  const currentInMyList = currentContent ? isInMyList(currentContent.id, currentContent.type) : false;

  useEffect(() => {
    if (content) {
      setCurrentContent(content);
    }
  }, [content]);

  useEffect(() => {
    if (visible && currentContent) {
      // Animación de entrada estilo Netflix
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start();
      
      // Cargar detalles del contenido
      loadContentDetails();
      loadRelatedContent();
      
      // Delay de 3 segundos para mostrar el trailer en el fondo
      const trailerTimer = setTimeout(() => {
        if (trailerKey && !trailerFinished) {
          setTrailerDelay(true);
          // El trailer se reproducirá hasta el final natural del video
          // No limitamos artificialmente el tiempo
        }
      }, 3000);
      
      return () => {
        clearTimeout(trailerTimer);
        // Solo resetear si el modal se cierra completamente
        if (!visible) {
          setTrailerDelay(false);
          setTrailerFinished(false);
        }
      };
    } else {
      // Reset animaciones y estado
      fadeAnim.setValue(0);
      slideAnim.setValue(height);
      setShowTrailer(false);
      setTrailerDelay(false);
      setTrailerFinished(false);
    }
  }, [visible, currentContent, trailerKey]);

  const loadContentDetails = async () => {
    if (!currentContent) return;
    
    console.log('Loading content details for:', currentContent);
    setLoading(true);
    try {
      let details;
      if (currentContent.type === 'movie') {
        details = await getMovieDetails(currentContent.id);
      } else if (currentContent.type === 'tv') {
        details = await getTVShowDetails(currentContent.id);
      } else if (currentContent.type === 'anime') {
        // Para anime, usar la API de AniList
        console.log('Loading anime details for ID:', currentContent.id);
        details = await getAnimeDetails(currentContent.id);
        console.log('Anime details loaded:', details);
      } else {
        // Fallback
        details = await getMovieDetails(currentContent.id);
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
        try {
          [similar, recommended] = await Promise.all([
            getMovieDetails(currentContent.id),
            getMovieDetails(currentContent.id),
          ]);
        } catch (error) {
          console.log('Error loading movie related content, using fallback');
          similar = await getMovieDetails(currentContent.id);
        }
      } else if (currentContent.type === 'tv') {
        try {
          [similar, recommended] = await Promise.all([
            getTVShowDetails(currentContent.id),
            getTVShowDetails(currentContent.id),
          ]);
        } catch (error) {
          console.log('Error loading TV related content, using fallback');
          similar = await getTVShowDetails(currentContent.id);
        }
      } else if (currentContent.type === 'anime') {
        // Para anime, usar la API de AniList
        try {
          similar = await getSimilarAnime(currentContent.id);
          recommended = await getSimilarAnime(currentContent.id);
        } catch (error) {
          console.log('Error loading anime related content');
          similar = [];
          recommended = [];
        }
      } else {
        // Fallback
        similar = await getMovieDetails(currentContent.id);
        recommended = [];
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

  const handleToggleList = async () => {
    if (!currentContent || !currentProfile) return;
    
    try {
      await toggleMyList(currentContent.id, currentContent.type);
    } catch (error) {
      console.error('Error toggling my list:', error);
    }
  };

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: height,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  };

  const getTitle = () => {
    if (detailData) {
      if ('title' in detailData && typeof detailData.title === 'object') {
        // AnimeDetail con título de AniList
        return getAnimeTitle(detailData.title as any) || currentContent?.title || 'Sin título';
      }
      return detailData.title || detailData.name || currentContent?.title || 'Sin título';
    }
    return currentContent?.title || 'Sin título';
  };

  const getReleaseDate = () => {
    if (detailData) {
      if ('startDate' in detailData && detailData.startDate) {
        // AnimeDetail con startDate de AniList
        const { year, month, day } = detailData.startDate as any;
        if (year) {
          return `${year}-${month?.toString().padStart(2, '0') || '01'}-${day?.toString().padStart(2, '0') || '01'}`;
        }
      }
      return detailData.release_date || detailData.first_air_date || '';
    }
    return currentContent?.release_date || '';
  };

  const getRuntime = () => {
    if (detailData) {
      if ('duration' in detailData && detailData.duration) {
        // AnimeDetail con duration de AniList
        return detailData.duration;
      }
      return detailData.runtime || 0;
    }
    return 0;
  };

  const getAgeRating = () => {
    if (detailData) {
      return detailData.adult ? 'R' : 'PG';
    }
    return 'PG';
  };

  const formatRuntime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}min` : `${mins}min`;
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'No disponible';
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (!visible || !currentContent) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
    >
      <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
        <StatusBar style="light" translucent />
        
        <TouchableOpacity 
          style={styles.backgroundTouchable}
          activeOpacity={1}
          onPress={handleClose}
        >
          <View style={styles.content}>
          {/* Botón cerrar estilo Netflix */}
          <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
            <Ionicons name="close" size={28} color="#FFFFFF" />
          </TouchableOpacity>

          <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollView}>
            {/* Hero Section con backdrop */}
            <View style={styles.heroSection}>
              {/* Imagen de fondo o trailer */}
              {trailerDelay && trailerKey && !trailerFinished ? (
                <View style={styles.trailerBackground}>
                  {Platform.OS === 'web' ? (
                    <iframe
                      style={{
                        width: '100%',
                        height: '100%',
                        border: 'none',
                        position: 'absolute',
                        top: 0,
                        left: 0,
                      }}
                      src={`https://www.youtube.com/embed/${trailerKey}?autoplay=1&controls=0&modestbranding=1&loop=0&playlist=${trailerKey}&rel=0&showinfo=0`}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      onLoad={() => {
                        // Cuando el iframe carga, configuramos un listener para el final del video
                        setTimeout(() => {
                          setTrailerDelay(false);
                          setTrailerFinished(true);
                          // Mostrar imagen de fondo cuando termine el trailer
                        }, 120000); // 2 minutos máximo como fallback
                      }}
                    />
                  ) : (
                    <WebView
                      style={styles.trailerBackgroundVideo}
                      source={{
                        uri: `https://www.youtube.com/embed/${trailerKey}?autoplay=1&controls=0&modestbranding=1&loop=0&playlist=${trailerKey}&rel=0&showinfo=0`,
                      }}
                      allowsFullscreenVideo
                      javaScriptEnabled
                      domStorageEnabled
                      mediaPlaybackRequiresUserAction={false}
                      scalesPageToFit={true}
                      onLoadEnd={() => {
                        // Fallback para móvil: después de 2 minutos vuelve a imagen
                        setTimeout(() => {
                          setTrailerDelay(false);
                          setTrailerFinished(true);
                          // Mostrar imagen de fondo cuando termine el trailer
                        }, 120000);
                      }}
                    />
                  )}
                </View>
              ) : (
                <>
                  {currentContent?.backdrop_path && (
                    <Image
                      source={{ 
                        uri: currentContent.type === 'anime' 
                          ? getAnimeImageUrl(currentContent.backdrop_path) 
                          : getImageUrl(currentContent.backdrop_path, 'original') 
                      }}
                      style={styles.backdropImage}
                      resizeMode="cover"
                    />
                  )}
                  <View style={styles.backdropOverlay} />
                </>
              )}
              
              {/* Contenido sobre el backdrop - se oculta durante el trailer */}
              {!trailerDelay && (
                <View style={styles.heroContent}>
                  <View style={[styles.heroInfo, { maxWidth: isSmallScreen ? '90%' : '85%' }]}>
                    <Text style={[styles.heroTitle, { fontSize: isSmallScreen ? 20 : 24 }]}>{getTitle()}</Text>
                    
                    {/* Metadata en línea horizontal */}
                    <View style={styles.heroMetadata}>
                      <Text style={styles.heroYear}>
                        {getReleaseDate() ? new Date(getReleaseDate()).getFullYear() : ''}
                      </Text>
                      <Text style={styles.heroSeparator}>•</Text>
                      <Text style={styles.heroRuntime}>
                        {getRuntime() !== 0 ? formatRuntime(getRuntime()) : ''}
                      </Text>
                      <Text style={styles.heroSeparator}>•</Text>
                      <Text style={styles.heroAgeRating}>{getAgeRating()}</Text>
                      <Text style={styles.heroSeparator}>•</Text>
                      <Text style={styles.heroRating}>
                        ⭐ {currentContent?.vote_average.toFixed(1)}
                      </Text>
                    </View>

                    {/* Botones de acción estilo Netflix */}
                    <View style={styles.actionButtons}>
                      <TouchableOpacity style={styles.playButton}>
                        <Ionicons name="play" size={20} color="#000" />
                        <Text style={styles.playButtonText}>Ver ahora</Text>
                      </TouchableOpacity>
                      
                      <TouchableOpacity 
                        style={styles.myListButton}
                        onPress={handleToggleList}
                      >
                        <Ionicons 
                          name={currentInMyList ? "checkmark" : "add"} 
                          size={20} 
                          color="#FFFFFF" 
                        />
                        <Text style={styles.myListButtonText}>
                          {currentInMyList ? "En mi lista" : "Mi lista"}
                        </Text>
                      </TouchableOpacity>

                      {/* Botón de trailer invisible */}
                      <TouchableOpacity 
                        style={[styles.trailerButton, { opacity: 0 }]}
                        onPress={() => setTrailerDelay(!trailerDelay)}
                      >
                        <Ionicons name={trailerDelay ? "pause-circle-outline" : "play-circle-outline"} size={20} color="#FFFFFF" />
                        <Text style={styles.trailerButtonText}>
                          {trailerDelay ? "Pausar Trailer" : "Ver Trailer"}
                        </Text>
                      </TouchableOpacity>
                    </View>

                    {/* Descripción después de los botones */}
                    <Text style={styles.heroOverview} numberOfLines={6}>
                      {currentContent?.overview || 'Sin descripción disponible'}
                    </Text>
                  </View>
                </View>
              )}
            </View>

            {/* Información detallada - Solo lo esencial como Netflix */}
            <View style={styles.detailsSection}>
              {/* Géneros */}
              {detailData?.genres && detailData.genres.length > 0 && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Géneros:</Text>
                  <Text style={styles.detailValue}>
                    {detailData.genres.map(g => g.name).join(', ')}
                  </Text>
                </View>
              )}

              {/* Información específica según el tipo */}
              {currentContent?.type === 'tv' && detailData && 'number_of_seasons' in detailData && (
                <View style={styles.seasonInfoContainer}>
                  <View style={styles.seasonHeader}>
                    <Text style={styles.seasonTitle}>Temporadas</Text>
                    <Text style={styles.seasonCount}>
                      {(detailData as TVShowDetail).number_of_seasons} temporada{(detailData as TVShowDetail).number_of_seasons !== 1 ? 's' : ''}
                    </Text>
                  </View>
                  
                  {/* Temporadas como Netflix */}
                  {Array.from({ length: Math.min((detailData as TVShowDetail).number_of_seasons, 3) }, (_, i) => (
                    <View key={i} style={styles.seasonCard}>
                      <View style={styles.seasonCardContent}>
                        <View style={styles.seasonNumber}>
                          <Text style={styles.seasonNumberText}>{i + 1}</Text>
                        </View>
                        <View style={styles.seasonDetails}>
                          <Text style={styles.seasonCardTitle}>Temporada {i + 1}</Text>
                          <Text style={styles.seasonCardEpisodes}>
                            {(detailData as TVShowDetail).number_of_episodes || 'N/A'} episodios
                          </Text>
                        </View>
                        <View style={styles.seasonPlayButton}>
                          <Ionicons name="play-circle" size={24} color="#E50914" />
                        </View>
                      </View>
                    </View>
                  ))}
                  
                  {(detailData as TVShowDetail).number_of_seasons > 3 && (
                    <TouchableOpacity style={styles.viewAllSeasons}>
                      <Text style={styles.viewAllText}>
                        Ver todas las {(detailData as TVShowDetail).number_of_seasons} temporadas
                      </Text>
                      <Ionicons name="chevron-down" size={16} color="#E50914" />
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {/* Información de anime */}
              {currentContent?.type === 'anime' && detailData && 'episodes' in detailData && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Episodios:</Text>
                  <Text style={styles.detailValue}>
                    {(detailData as AnimeDetail).episodes || 'En emisión'}
                  </Text>
                </View>
              )}

              {/* Estado del anime */}
              {currentContent?.type === 'anime' && detailData && 'status' in detailData && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Estado:</Text>
                  <Text style={styles.detailValue}>
                    {(detailData as AnimeDetail).status || 'Desconocido'}
                  </Text>
                </View>
              )}

              {/* Formato del anime */}
              {currentContent?.type === 'anime' && detailData && 'format' in detailData && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Formato:</Text>
                  <Text style={styles.detailValue}>
                    {(detailData as AnimeDetail).format || 'Desconocido'}
                  </Text>
                </View>
              )}

              {/* Fecha de estreno */}
              {getReleaseDate() && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>
                    {currentContent?.type === 'movie' ? 'Estreno:' : 
                     currentContent?.type === 'tv' ? 'Primera emisión:' : 
                     currentContent?.type === 'anime' ? 'Estreno:' : 'Estreno:'}
                  </Text>
                  <Text style={styles.detailValue}>{formatDate(getReleaseDate())}</Text>
                </View>
              )}
            </View>

            {/* Contenido relacionado */}
            <View style={styles.relatedSection}>
              <Text style={styles.relatedTitle}>
                {currentContent?.type === 'movie' ? 'Más películas similares' :
                 currentContent?.type === 'tv' ? 'Más series similares' :
                 currentContent?.type === 'anime' ? 'Más anime similar' :
                 'Más títulos similares'}
              </Text>
                
              {loadingRelated ? (
                <View style={styles.relatedLoading}>
                  <ActivityIndicator size="small" color="#E50914" />
                </View>
              ) : relatedContent.length > 0 ? (
                <FlatList
                  data={relatedContent}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  keyExtractor={(item) => `${item.id}-${item.title || item.name}`}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.relatedCard}
                      onPress={() => {
                        const contentItem: ContentItem = {
                          id: item.id,
                          type: currentContent?.type || 'movie',
                          title: item.title || item.name || '',
                          overview: item.overview || '',
                          poster_path: item.poster_path || '',
                          backdrop_path: item.backdrop_path || '',
                          release_date: item.release_date || item.first_air_date || '',
                          vote_average: item.vote_average || 0,
                          source: 'tmdb',
                        };
                        setCurrentContent(contentItem);
                        setTrailerDelay(false);
                        setTrailerFinished(false);
                        loadContentDetails();
                        loadRelatedContent();
                      }}
                    >
                      <Image
                        source={{ uri: getImageUrl(item.poster_path, 'w500') }}
                        style={styles.relatedPoster}
                        resizeMode="cover"
                      />
                    </TouchableOpacity>
                  )}
                  contentContainerStyle={{ paddingHorizontal: 20 }}
                />
              ) : (
                <View style={styles.noRelatedContainer}>
                  <Text style={styles.noRelatedText}>
                    No hay contenido relacionado disponible
                  </Text>
                </View>
              )}
            </View>
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000000',
    zIndex: 1000,
  },
  backgroundTouchable: {
    flex: 1,
    width: '100%',
  },
  content: {
    flex: 1,
    backgroundColor: '#000000',
    width: '100%',
    height: '100%',
    marginTop: 0,
    marginBottom: 0,
    paddingTop: 0,
    paddingBottom: 0,
  },
  closeButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  scrollView: {
    flex: 1,
    height: '100%',
  },
  heroSection: {
    height: '120%',
    position: 'relative',
    justifyContent: 'flex-end',
    paddingBottom: 0,
  },
  trailerBackground: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  trailerBackgroundVideo: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
  },
  backdropImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  backdropOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  heroContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingBottom: 20,
    zIndex: 10,
  },
  heroInfo: {
    maxWidth: '85%',
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  heroMetadata: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  heroYear: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  heroSeparator: {
    color: '#FFFFFF',
    fontSize: 16,
    marginHorizontal: 8,
  },
  heroRuntime: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  heroAgeRating: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  heroRating: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  heroOverview: {
    color: '#FFFFFF',
    fontSize: 16,
    lineHeight: 26,
    marginTop: 0,
    marginBottom: 16,
    textShadowColor: 'rgba(0, 0, 0, 0.9)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    fontWeight: '400',
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 12,
    marginBottom: 16,
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 6,
    gap: 8,
  },
  playButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '600',
  },
  myListButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(109, 109, 110, 0.7)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 6,
    gap: 8,
  },
  myListButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  trailerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(109, 109, 110, 0.7)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 6,
    gap: 8,
  },
  trailerButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  detailsSection: {
    padding: 20,
    backgroundColor: '#141414',
    marginTop: 0,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  detailLabel: {
    color: '#999999',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
    minWidth: 100,
  },
  detailValue: {
    color: '#FFFFFF',
    fontSize: 16,
    flex: 1,
  },
  relatedSection: {
    backgroundColor: '#141414',
    paddingVertical: 20,
  },
  relatedTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  relatedLoading: {
    justifyContent: 'center',
    alignItems: 'center',
    height: 200,
  },
  relatedCard: {
    marginRight: 12,
    borderRadius: 8,
    overflow: 'hidden',
  },
  relatedPoster: {
    width: 120,
    height: 180,
  },
  noRelatedContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    height: 200,
    paddingHorizontal: 20,
  },
  noRelatedText: {
    color: '#999999',
    fontSize: 16,
    textAlign: 'center',
  },
  // Estilos para temporadas estilo Netflix
  seasonInfoContainer: {
    marginTop: 20,
    marginBottom: 20,
  },
  seasonHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  seasonTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  seasonCount: {
    fontSize: 16,
    color: '#999999',
  },
  seasonCard: {
    backgroundColor: '#2A2A2A',
    borderRadius: 8,
    marginBottom: 12,
    overflow: 'hidden',
  },
  seasonCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  seasonNumber: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E50914',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  seasonNumberText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  seasonDetails: {
    flex: 1,
  },
  seasonCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  seasonCardEpisodes: {
    fontSize: 14,
    color: '#999999',
  },
  seasonPlayButton: {
    marginLeft: 16,
  },
  viewAllSeasons: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(229, 9, 20, 0.1)',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E50914',
    marginTop: 8,
  },
  viewAllText: {
    color: '#E50914',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
});
