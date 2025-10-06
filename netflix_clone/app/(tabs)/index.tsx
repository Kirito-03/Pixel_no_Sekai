import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Image,
  ActivityIndicator,
  Animated,
  Modal,
  Linking,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/ui/icon-symbol';

const { width, height } = Dimensions.get('window');

// Configuración TMDb
const TMDB_API_KEY = '00fca6c0171d4276ab9b941575081d28';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';
const TMDB_IMAGE_ORIGINAL = 'https://image.tmdb.org/t/p/original';

interface Movie {
  id: number;
  title?: string;
  name?: string;
  poster_path: string;
  backdrop_path: string;
  vote_average: number;
  overview?: string;
  media_type?: string;
  release_date?: string;
  first_air_date?: string;
  progress?: number;
}

interface MovieDetails extends Movie {
  genres: { id: number; name: string }[];
  runtime?: number;
  number_of_seasons?: number;
  status?: string;
  certification?: string;
}

interface Cast {
  id: number;
  name: string;
  character: string;
  profile_path: string;
}

interface Episode {
  id: number;
  name: string;
  episode_number: number;
  season_number: number;
  still_path: string;
  overview: string;
  runtime: number;
}

interface Anime {
  id: number;
  title: {
    english: string;
    romaji: string;
  };
  coverImage: {
    large: string;
    extraLarge: string;
  };
  bannerImage: string;
  averageScore: number;
}

export default function HomeScreen() {
  const [featured, setFeatured] = useState<Movie | null>(null);
  const [trending, setTrending] = useState<Movie[]>([]);
  const [popular, setPopular] = useState<Movie[]>([]);
  const [topRated, setTopRated] = useState<Movie[]>([]);
  const [tvShows, setTvShows] = useState<Movie[]>([]);
  const [anime, setAnime] = useState<Anime[]>([]);
  const [loading, setLoading] = useState(true);
  const [headerOpacity] = useState(new Animated.Value(0));
  const scrollY = useRef(new Animated.Value(0)).current;
  
  // Modal de detalles
  const [selectedMovie, setSelectedMovie] = useState<MovieDetails | null>(null);
  const [trailerKey, setTrailerKey] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [cast, setCast] = useState<Cast[]>([]);
  const [similarMovies, setSimilarMovies] = useState<Movie[]>([]);
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [certification, setCertification] = useState<string>('');
  const [continueWatching, setContinueWatching] = useState<Movie[]>([]);

  useEffect(() => {
    loadContent();
  }, []);

  useEffect(() => {
    const listener = scrollY.addListener(({ value }) => {
      const opacity = Math.min(value / 300, 1);
      headerOpacity.setValue(opacity);
    });
    return () => scrollY.removeListener(listener);
  }, []);

  const loadContent = async () => {
    try {
      await Promise.all([
        fetchTMDbTrending(),
        fetchTMDbPopular(),
        fetchTMDbTopRated(),
        fetchTMDbTVShows(),
        fetchAnime(),
      ]);
    } catch (error) {
      console.error('Error loading content:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTMDbTrending = async () => {
    try {
      const response = await fetch(
        `${TMDB_BASE_URL}/trending/all/week?api_key=${TMDB_API_KEY}&language=es-ES`
      );
      const data = await response.json();
      setTrending(data.results.slice(0, 15));
      setFeatured(data.results[Math.floor(Math.random() * 5)]);
    } catch (error) {
      console.error('Error fetching trending:', error);
    }
  };

  const fetchTMDbPopular = async () => {
    try {
      const response = await fetch(
        `${TMDB_BASE_URL}/movie/popular?api_key=${TMDB_API_KEY}&language=es-ES`
      );
      const data = await response.json();
      setPopular(data.results.slice(0, 15));
    } catch (error) {
      console.error('Error fetching popular:', error);
    }
  };

  const fetchTMDbTopRated = async () => {
    try {
      const response = await fetch(
        `${TMDB_BASE_URL}/movie/top_rated?api_key=${TMDB_API_KEY}&language=es-ES`
      );
      const data = await response.json();
      setTopRated(data.results.slice(0, 15));
    } catch (error) {
      console.error('Error fetching top rated:', error);
    }
  };

  const fetchTMDbTVShows = async () => {
    try {
      const response = await fetch(
        `${TMDB_BASE_URL}/tv/popular?api_key=${TMDB_API_KEY}&language=es-ES`
      );
      const data = await response.json();
      setTvShows(data.results.slice(0, 15));
    } catch (error) {
      console.error('Error fetching TV shows:', error);
    }
  };

  const fetchAnime = async () => {
    const query = `
      query {
        Page(page: 1, perPage: 15) {
          media(type: ANIME, sort: POPULARITY_DESC) {
            id
            title {
              english
              romaji
            }
            coverImage {
              large
              extraLarge
            }
            bannerImage
            averageScore
          }
        }
      }
    `;

    try {
      const response = await fetch('https://graphql.anilist.co', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });
      const data = await response.json();
      setAnime(data.data.Page.media);
    } catch (error) {
      console.error('Error fetching anime:', error);
    }
  };

  // Obtener detalles de película/serie
  const fetchMovieDetails = async (movieId: number, mediaType: string) => {
    setLoadingDetails(true);
    try {
      const type = mediaType === 'tv' ? 'tv' : 'movie';
      
      // Obtener detalles
      const detailsResponse = await fetch(
        `${TMDB_BASE_URL}/${type}/${movieId}?api_key=${TMDB_API_KEY}&language=es-ES`
      );
      const details = await detailsResponse.json();
      
      // Obtener videos (trailers)
      const videosResponse = await fetch(
        `${TMDB_BASE_URL}/${type}/${movieId}/videos?api_key=${TMDB_API_KEY}&language=es-ES`
      );
      const videosData = await videosResponse.json();
      
      // Obtener reparto
      const creditsResponse = await fetch(
        `${TMDB_BASE_URL}/${type}/${movieId}/credits?api_key=${TMDB_API_KEY}`
      );
      const creditsData = await creditsResponse.json();
      
      // Obtener contenido similar
      const similarResponse = await fetch(
        `${TMDB_BASE_URL}/${type}/${movieId}/similar?api_key=${TMDB_API_KEY}&language=es-ES`
      );
      const similarData = await similarResponse.json();
      
      // Obtener calificación por edad
      const releasesResponse = await fetch(
        `${TMDB_BASE_URL}/${type}/${movieId}/${type === 'movie' ? 'release_dates' : 'content_ratings'}?api_key=${TMDB_API_KEY}`
      );
      const releasesData = await releasesResponse.json();
      
      // Buscar trailer
      const trailer = videosData.results.find((v: any) => 
        v.type === 'Trailer' && v.site === 'YouTube'
      );
      
      // Obtener certificación de edad
      let cert = '';
      if (type === 'movie') {
        const usRelease = releasesData.results?.find((r: any) => r.iso_3166_1 === 'US');
        cert = usRelease?.release_dates?.[0]?.certification || '';
      } else {
        const usRating = releasesData.results?.find((r: any) => r.iso_3166_1 === 'US');
        cert = usRating?.rating || '';
      }
      
      // Si es serie, obtener episodios de la temporada 1
      if (type === 'tv') {
        const seasonResponse = await fetch(
          `${TMDB_BASE_URL}/tv/${movieId}/season/1?api_key=${TMDB_API_KEY}&language=es-ES`
        );
        const seasonData = await seasonResponse.json();
        setEpisodes(seasonData.episodes || []);
      }
      
      setSelectedMovie(details);
      setTrailerKey(trailer?.key || null);
      setCast(creditsData.cast?.slice(0, 10) || []);
      setSimilarMovies(similarData.results?.slice(0, 10) || []);
      setCertification(cert);
      setModalVisible(true);
    } catch (error) {
      console.error('Error fetching movie details:', error);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleMoviePress = (item: Movie) => {
    const mediaType = item.media_type || 'movie';
    fetchMovieDetails(item.id, mediaType);
  };

  const openTrailer = () => {
    if (trailerKey) {
      Linking.openURL(`https://www.youtube.com/watch?v=${trailerKey}`);
    }
  };

  const renderMovieItem = ({ item, index }: { item: Movie; index: number }) => (
    <TouchableOpacity 
      style={styles.movieCard} 
      activeOpacity={0.8}
      onPress={() => handleMoviePress(item)}
      onLongPress={() => {
        // Preview con vibración
        if (Platform.OS === 'ios') {
          // Haptic feedback
        }
      }}
    >
      <Image
        source={{ uri: `${TMDB_IMAGE_BASE}${item.poster_path}` }}
        style={styles.moviePoster}
        resizeMode="cover"
      />
      {index < 10 && (
        <Text style={styles.rankingNumber}>{index + 1}</Text>
      )}
      {/* Progress bar para continuar viendo */}
      {item.progress && (
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${item.progress}%` }]} />
        </View>
      )}
    </TouchableOpacity>
  );

  const renderAnimeItem = ({ item }: { item: Anime }) => (
    <TouchableOpacity style={styles.movieCard} activeOpacity={0.8}>
      <Image
        source={{ uri: item.coverImage.extraLarge || item.coverImage.large }}
        style={styles.moviePoster}
        resizeMode="cover"
      />
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingLogo}>N</Text>
        <ActivityIndicator size="large" color="#E50914" style={{ marginTop: 20 }} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header flotante */}
      <Animated.View style={[styles.headerContainer, { opacity: headerOpacity }]}>
        <LinearGradient
          colors={['rgba(0,0,0,0.9)', 'rgba(0,0,0,0.7)', 'transparent']}
          style={styles.headerGradient}
        >
          <SafeAreaView edges={['top']}>
            <View style={styles.header}>
              <Text style={styles.logo}>PIXEL</Text>
              <View style={styles.headerButtons}>
                <TouchableOpacity>
                  <IconSymbol name="tv" size={24} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity>
                  <IconSymbol name="person.circle" size={24} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
          </SafeAreaView>
        </LinearGradient>
      </Animated.View>

      <Animated.ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
      >
        {/* Banner destacado */}
        {featured && (
          <TouchableOpacity 
            activeOpacity={1}
            onPress={() => handleMoviePress(featured)}
          >
            <View style={styles.featuredContainer}>
              <Image
                source={{ uri: `${TMDB_IMAGE_ORIGINAL}${featured.backdrop_path}` }}
                style={styles.featuredImage}
                resizeMode="cover"
              />
              
              <LinearGradient
                colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.8)', '#000']}
                style={styles.featuredGradient}
              />
              
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.5)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={styles.featuredTopGradient}
              />

              <SafeAreaView edges={['top']} style={styles.featuredSafeArea}>
                <View style={styles.featuredHeader}>
                  <Text style={styles.logoText}>PIXEL</Text>
                </View>
              </SafeAreaView>

              <View style={styles.featuredContent}>
                <View style={styles.featuredBadges}>
                  <View style={styles.topTenBadge}>
                    <Text style={styles.topTenText}>TOP</Text>
                    <Text style={styles.topTenNumber}>10</Text>
                  </View>
                  <Text style={styles.featuredType}>
                    {featured.media_type === 'tv' ? 'SERIE' : 'PELÍCULA'}
                  </Text>
                </View>

                <Text style={styles.featuredTitle} numberOfLines={2}>
                  {featured.title || featured.name}
                </Text>

                <View style={styles.featuredButtons}>
                  <TouchableOpacity style={styles.playButton} activeOpacity={0.8}>
                    <IconSymbol name="play.fill" size={20} color="#000" />
                    <Text style={styles.playText}>Reproducir</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.featuredActions}>
                  <TouchableOpacity style={styles.actionButton}>
                    <IconSymbol name="plus" size={24} color="#fff" />
                    <Text style={styles.actionText}>Mi lista</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.actionButton}
                    onPress={() => handleMoviePress(featured)}
                  >
                    <IconSymbol name="info.circle" size={24} color="#fff" />
                    <Text style={styles.actionText}>Info</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        )}

        {/* Categorías */}
        <View style={styles.categoriesContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <TouchableOpacity style={styles.categoryChip}>
              <Text style={styles.categoryText}>Series</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.categoryChip}>
              <Text style={styles.categoryText}>Películas</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.categoryChip}>
              <Text style={styles.categoryText}>Categorías</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Top 10 */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <IconSymbol name="flame.fill" size={20} color="#E50914" style={{ marginRight: 8 }} />
            <Text style={styles.sectionTitle}>Top 10 en Perú hoy</Text>
          </View>
          <FlatList
            data={trending.slice(0, 10)}
            renderItem={renderMovieItem}
            keyExtractor={(item) => `top10-${item.id}`}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.movieList}
          />
        </View>

        {/* Tendencias */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <IconSymbol name="chart.line.uptrend.xyaxis" size={20} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.sectionTitle}>Tendencias ahora</Text>
          </View>
          <FlatList
            data={trending}
            renderItem={renderMovieItem}
            keyExtractor={(item) => `trending-${item.id}`}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.movieList}
          />
        </View>

        {/* Solo en Netflix */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Solo en Pixel</Text>
            <TouchableOpacity>
              <Text style={styles.exploreAll}>Ver todo ›</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={popular}
            renderItem={renderMovieItem}
            keyExtractor={(item) => `netflix-${item.id}`}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.movieList}
          />
        </View>

        {/* Series */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <IconSymbol name="tv" size={20} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.sectionTitle}>Series populares</Text>
          </View>
          <FlatList
            data={tvShows}
            renderItem={renderMovieItem}
            keyExtractor={(item) => `tv-${item.id}`}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.movieList}
          />
        </View>

        {/* Top Rated */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <IconSymbol name="star.fill" size={20} color="#FFD700" style={{ marginRight: 8 }} />
            <Text style={styles.sectionTitle}>Aclamadas por la crítica</Text>
          </View>
          <FlatList
            data={topRated}
            renderItem={renderMovieItem}
            keyExtractor={(item) => `rated-${item.id}`}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.movieList}
          />
        </View>

        {/* Anime */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Anime de temporada</Text>
          </View>
          <FlatList
            data={anime}
            renderItem={renderAnimeItem}
            keyExtractor={(item) => `anime-${item.id}`}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.movieList}
          />
        </View>

        {/* Continuar viendo */}
        {continueWatching.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <IconSymbol name="play.circle" size={20} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.sectionTitle}>Continuar viendo</Text>
            </View>
            <FlatList
              data={continueWatching}
              renderItem={renderMovieItem}
              keyExtractor={(item) => `continue-${item.id}`}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.movieList}
            />
          </View>
        )}

        <View style={{ height: 60 }} />
      </Animated.ScrollView>

      {/* Modal de detalles */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <TouchableOpacity 
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setModalVisible(false)}
          />
          
          <View style={styles.modalContent}>
            {loadingDetails ? (
              <ActivityIndicator size="large" color="#E50914" />
            ) : selectedMovie ? (
              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Imagen de fondo */}
                <View style={styles.modalHeader}>
                  <Image
                    source={{ uri: `${TMDB_IMAGE_ORIGINAL}${selectedMovie.backdrop_path}` }}
                    style={styles.modalImage}
                    resizeMode="cover"
                  />
                  <LinearGradient
                    colors={['transparent', 'rgba(20,20,20,0.8)', '#141414']}
                    style={styles.modalGradient}
                  />
                  
                  <TouchableOpacity 
                    style={styles.closeButton}
                    onPress={() => setModalVisible(false)}
                  >
                    <IconSymbol name="xmark" size={24} color="#fff" />
                  </TouchableOpacity>
                </View>

                <View style={styles.modalBody}>
                  <Text style={styles.modalTitle}>
                    {selectedMovie.title || selectedMovie.name}
                  </Text>

                  {/* Calificación por edad */}
                  {certification && (
                    <View style={styles.certificationBadge}>
                      <Text style={styles.certificationText}>{certification}</Text>
                    </View>
                  )}

                  {/* Botones principales */}
                  <TouchableOpacity style={styles.modalPlayButton}>
                    <IconSymbol name="play.fill" size={24} color="#000" />
                    <Text style={styles.modalPlayText}>Reproducir</Text>
                  </TouchableOpacity>

                  {/* Botón descargar */}
                  <TouchableOpacity style={styles.modalDownloadButton}>
                    <IconSymbol name="arrow.down.circle" size={20} color="#fff" />
                    <Text style={styles.modalDownloadText}>Descargar</Text>
                  </TouchableOpacity>

                  {trailerKey && (
                    <TouchableOpacity 
                      style={styles.modalTrailerButton}
                      onPress={openTrailer}
                    >
                      <IconSymbol name="play.rectangle" size={20} color="#fff" />
                      <Text style={styles.modalTrailerText}>Ver tráiler</Text>
                    </TouchableOpacity>
                  )}

                  {/* Info */}
                  <View style={styles.modalInfo}>
                    <Text style={styles.modalMatch}>
                      {Math.round(selectedMovie.vote_average * 10)}% de coincidencia
                    </Text>
                    <Text style={styles.modalYear}>
                      {selectedMovie.release_date?.substring(0, 4) || 
                       selectedMovie.first_air_date?.substring(0, 4)}
                    </Text>
                    {selectedMovie.runtime && (
                      <Text style={styles.modalDuration}>
                        {Math.floor(selectedMovie.runtime / 60)}h {selectedMovie.runtime % 60}min
                      </Text>
                    )}
                  </View>

                  {/* Descripción */}
                  <Text style={styles.modalDescription}>
                    {selectedMovie.overview || 'Sin descripción disponible.'}
                  </Text>

                  {/* Reparto */}
                  {cast.length > 0 && (
                    <View style={styles.castSection}>
                      <Text style={styles.castTitle}>Reparto</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        {cast.map((actor) => (
                          <View key={actor.id} style={styles.castItem}>
                            <Image
                              source={{ 
                                uri: actor.profile_path 
                                  ? `${TMDB_IMAGE_BASE}${actor.profile_path}`
                                  : 'https://via.placeholder.com/100x150/333/999?text=N/A'
                              }}
                              style={styles.castImage}
                            />
                            <Text style={styles.castName} numberOfLines={1}>
                              {actor.name}
                            </Text>
                          </View>
                        ))}
                      </ScrollView>
                    </View>
                  )}

                  {/* Temporadas y episodios (solo series) */}
                  {selectedMovie.number_of_seasons && (
                    <View style={styles.seasonsSection}>
                      <Text style={styles.seasonsTitle}>Episodios</Text>
                      
                      {/* Selector de temporada */}
                      <View style={styles.seasonSelector}>
                        <Text style={styles.seasonSelectorLabel}>Temporada {selectedSeason}</Text>
                        <IconSymbol name="chevron.down" size={16} color="#fff" />
                      </View>

                      {/* Lista de episodios */}
                      {episodes.map((episode) => (
                        <TouchableOpacity key={episode.id} style={styles.episodeItem}>
                          <Image
                            source={{ uri: `${TMDB_IMAGE_BASE}${episode.still_path}` }}
                            style={styles.episodeThumbnail}
                          />
                          <View style={styles.episodeInfo}>
                            <View style={styles.episodeHeader}>
                              <Text style={styles.episodeNumber}>{episode.episode_number}</Text>
                              <Text style={styles.episodeTitle} numberOfLines={1}>
                                {episode.name}
                              </Text>
                            </View>
                            <Text style={styles.episodeDescription} numberOfLines={2}>
                              {episode.overview || 'Sin descripción'}
                            </Text>
                            <Text style={styles.episodeDuration}>{episode.runtime} min</Text>
                          </View>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}

                  {/* Géneros */}
                  {selectedMovie.genres && (
                    <View style={styles.modalGenres}>
                      <Text style={styles.modalGenresLabel}>Géneros: </Text>
                      <Text style={styles.modalGenresText}>
                        {selectedMovie.genres.map(g => g.name).join(', ')}
                      </Text>
                    </View>
                  )}

                  {/* Contenido similar */}
                  {similarMovies.length > 0 && (
                    <View style={styles.similarSection}>
                      <Text style={styles.similarTitle}>Más como esto</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        {similarMovies.map((movie) => (
                          <TouchableOpacity
                            key={movie.id}
                            style={styles.similarItem}
                            onPress={() => {
                              setModalVisible(false);
                              setTimeout(() => handleMoviePress(movie), 300);
                            }}
                          >
                            <Image
                              source={{ uri: `${TMDB_IMAGE_BASE}${movie.poster_path}` }}
                              style={styles.similarPoster}
                            />
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}

                  {/* Acciones */}
                  <View style={styles.modalActions}>
                    <TouchableOpacity style={styles.modalAction}>
                      <IconSymbol name="plus.circle" size={28} color="#fff" />
                      <Text style={styles.modalActionText}>Mi lista</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.modalAction}>
                      <IconSymbol name="hand.thumbsup" size={28} color="#fff" />
                      <Text style={styles.modalActionText}>Me gusta</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.modalAction}>
                      <IconSymbol name="paperplane" size={28} color="#fff" />
                      <Text style={styles.modalActionText}>Compartir</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </ScrollView>
            ) : null}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  loadingLogo: {
    fontSize: 80,
    fontWeight: 'bold',
    color: '#E50914',
  },
  headerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },
  headerGradient: {
    paddingBottom: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  logo: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#E50914',
    letterSpacing: 2,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 20,
  },
  scrollView: {
    flex: 1,
  },
  featuredContainer: {
    height: height * 0.75,
    marginBottom: 0,
  },
  featuredImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  featuredGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '60%',
  },
  featuredTopGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 100,
  },
  featuredSafeArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  featuredHeader: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  logoText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#E50914',
    letterSpacing: 2,
  },
  featuredContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingBottom: 40,
    alignItems: 'center',
  },
  featuredBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  topTenBadge: {
    backgroundColor: '#E50914',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  topTenText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  topTenNumber: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  featuredType: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  featuredTitle: {
    color: '#fff',
    fontSize: 36,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  featuredButtons: {
    width: '100%',
    marginBottom: 12,
  },
  playButton: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingVertical: 14,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  playText: {
    color: '#000',
    fontSize: 18,
    fontWeight: 'bold',
  },
  featuredActions: {
    flexDirection: 'row',
    gap: 32,
    marginTop: 8,
  },
  actionButton: {
    alignItems: 'center',
    gap: 4,
  },
  actionText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  categoriesContainer: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  categoryChip: {
    backgroundColor: '#222',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
    marginRight: 8,
  },
  categoryText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  section: {
    marginTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    flex: 1,
  },
  exploreAll: {
    color: '#54b9c5',
    fontSize: 14,
    fontWeight: '600',
  },
  movieList: {
    paddingHorizontal: 16,
  },
  movieCard: {
    width: 120,
    marginRight: 8,
    position: 'relative',
  },
  moviePoster: {
    width: '100%',
    height: 180,
    borderRadius: 4,
  },
  progressBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#E50914',
  },
  rankingNumber: {
    position: 'absolute',
    bottom: -10,
    left: -6,
    fontSize: 60,
    fontWeight: '900',
    color: '#1a1a1a',
    textShadowColor: '#e5e5e5',
    textShadowOffset: { width: -2, height: 0 },
    textShadowRadius: 0,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica-Bold' : 'sans-serif-black',
  },
  certificationBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  certificationText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  modalDownloadButton: {
    flexDirection: 'row',
    backgroundColor: '#2a2a2a',
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 12,
  },
  modalDownloadText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  castSection: {
    marginTop: 24,
    marginBottom: 24,
  },
  castTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  castItem: {
    width: 80,
    marginRight: 12,
  },
  castImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 8,
    backgroundColor: '#333',
  },
  castName: {
    color: '#fff',
    fontSize: 12,
    textAlign: 'center',
  },
  seasonsSection: {
    marginTop: 24,
    marginBottom: 24,
  },
  seasonsTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  seasonSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#2a2a2a',
    padding: 12,
    borderRadius: 4,
    marginBottom: 16,
  },
  seasonSelectorLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  episodeItem: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 12,
  },
  episodeThumbnail: {
    width: 120,
    height: 70,
    borderRadius: 4,
    backgroundColor: '#333',
  },
  episodeInfo: {
    flex: 1,
  },
  episodeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  episodeNumber: {
    color: '#999',
    fontSize: 14,
    fontWeight: 'bold',
  },
  episodeTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  episodeDescription: {
    color: '#999',
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 4,
  },
  episodeDuration: {
    color: '#666',
    fontSize: 11,
  },
  similarSection: {
    marginTop: 24,
    marginBottom: 24,
  },
  similarTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  similarItem: {
    width: 100,
    marginRight: 8,
  },
  similarPoster: {
    width: '100%',
    height: 150,
    borderRadius: 4,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  modalContent: {
    backgroundColor: '#141414',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: height * 0.9,
  },
  modalHeader: {
    height: 250,
    position: 'relative',
  },
  modalImage: {
    width: '100%',
    height: '100%',
  },
  modalGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBody: {
    padding: 20,
  },
  modalTitle: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  modalPlayButton: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 12,
  },
  modalPlayText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalTrailerButton: {
    flexDirection: 'row',
    backgroundColor: '#333',
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 20,
  },
  modalTrailerText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  modalMatch: {
    color: '#46d369',
    fontSize: 14,
    fontWeight: 'bold',
  },
  modalYear: {
    color: '#999',
    fontSize: 14,
  },
  modalDuration: {
    color: '#999',
    fontSize: 14,
  },
  modalDescription: {
    color: '#fff',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 20,
  },
  modalGenres: {
    flexDirection: 'row',
    marginBottom: 24,
    flexWrap: 'wrap',
  },
  modalGenresLabel: {
    color: '#777',
    fontSize: 14,
  },
  modalGenresText: {
    color: '#fff',
    fontSize: 14,
    flex: 1,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  modalAction: {
    alignItems: 'center',
    gap: 8,
  },
  modalActionText: {
    color: '#999',
    fontSize: 12,
  },
});