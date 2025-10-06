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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/ui/icon-symbol';
import axios from 'axios';

const { width, height } = Dimensions.get('window');

// Configuración TMDb
const TMDB_API_KEY = '00fca6c0171d4276ab9b941575081d28';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';

// Configuración AniList
const ANILIST_API_URL = 'https://graphql.anilist.co';

interface Movie {
  id: number;
  title?: string;
  name?: string;
  poster_path: string;
  backdrop_path: string;
  vote_average: number;
  media_type?: string;
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
}

interface Genre {
  id: number;
  name: string;
}

export default function ExploreScreen() {
  const [loading, setLoading] = useState(true);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [selectedGenre, setSelectedGenre] = useState<number | null>(null);
  const [moviesByGenre, setMoviesByGenre] = useState<{ [key: number]: Movie[] }>({});
  const [trendingMovies, setTrendingMovies] = useState<Movie[]>([]);
  const [trendingSeries, setTrendingSeries] = useState<Movie[]>([]);
  const [trendingAnime, setTrendingAnime] = useState<Anime[]>([]);
  const [popularAnime, setPopularAnime] = useState<Anime[]>([]);
  const [headerOpacity] = useState(new Animated.Value(1));
  const scrollY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadContent();
  }, []);

  useEffect(() => {
    const listener = scrollY.addListener(({ value }) => {
      const opacity = Math.max(1 - value / 200, 0);
      headerOpacity.setValue(opacity);
    });
    return () => scrollY.removeListener(listener);
  }, []);

  const loadContent = async () => {
    try {
      await Promise.all([
        fetchGenres(),
        fetchTrendingMovies(),
        fetchTrendingSeries(),
        fetchTrendingAnime(),
        fetchPopularAnime(),
      ]);
    } catch (error) {
      console.error('Error loading content:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchGenres = async () => {
    try {
      const response = await axios.get(
        `${TMDB_BASE_URL}/genre/movie/list`,
        {
          params: {
            api_key: TMDB_API_KEY,
            language: 'es-ES',
          },
        }
      );
      setGenres(response.data.genres);
      
      // Cargar películas para cada género
      const genreMovies: { [key: number]: Movie[] } = {};
      for (const genre of response.data.genres.slice(0, 8)) {
        const moviesResponse = await axios.get(
          `${TMDB_BASE_URL}/discover/movie`,
          {
            params: {
              api_key: TMDB_API_KEY,
              language: 'es-ES',
              with_genres: genre.id,
              sort_by: 'popularity.desc',
            },
          }
        );
        genreMovies[genre.id] = moviesResponse.data.results.slice(0, 15);
      }
      setMoviesByGenre(genreMovies);
    } catch (error) {
      console.error('Error fetching genres:', error);
    }
  };

  const fetchTrendingMovies = async () => {
    try {
      const response = await axios.get(
        `${TMDB_BASE_URL}/trending/movie/week`,
        {
          params: {
            api_key: TMDB_API_KEY,
            language: 'es-ES',
          },
        }
      );
      setTrendingMovies(response.data.results.slice(0, 15));
    } catch (error) {
      console.error('Error fetching trending movies:', error);
    }
  };

  const fetchTrendingSeries = async () => {
    try {
      const response = await axios.get(
        `${TMDB_BASE_URL}/trending/tv/week`,
        {
          params: {
            api_key: TMDB_API_KEY,
            language: 'es-ES',
          },
        }
      );
      setTrendingSeries(response.data.results.slice(0, 15));
    } catch (error) {
      console.error('Error fetching trending series:', error);
    }
  };

  const fetchTrendingAnime = async () => {
    const query = `
      query {
        Page(page: 1, perPage: 15) {
          media(type: ANIME, sort: TRENDING_DESC) {
            id
            title {
              romaji
              english
            }
            coverImage {
              large
              extraLarge
            }
          }
        }
      }
    `;

    try {
      const response = await axios.post(ANILIST_API_URL, { query });
      setTrendingAnime(response.data.data.Page.media);
    } catch (error) {
      console.error('Error fetching trending anime:', error);
    }
  };

  const fetchPopularAnime = async () => {
    const query = `
      query {
        Page(page: 1, perPage: 15) {
          media(type: ANIME, sort: POPULARITY_DESC) {
            id
            title {
              romaji
              english
            }
            coverImage {
              large
              extraLarge
            }
          }
        }
      }
    `;

    try {
      const response = await axios.post(ANILIST_API_URL, { query });
      setPopularAnime(response.data.data.Page.media);
    } catch (error) {
      console.error('Error fetching popular anime:', error);
    }
  };

  const getImageUrl = (path: string) => {
    return path ? `${TMDB_IMAGE_BASE}${path}` : 'https://via.placeholder.com/500x750';
  };

  const renderMovieItem = ({ item }: { item: Movie }) => (
    <TouchableOpacity style={styles.movieCard} activeOpacity={0.8}>
      <Image
        source={{ uri: getImageUrl(item.poster_path) }}
        style={styles.moviePoster}
        resizeMode="cover"
      />
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

  const renderGenreChip = ({ item }: { item: Genre }) => (
    <TouchableOpacity
      style={[
        styles.genreChip,
        selectedGenre === item.id && styles.genreChipActive,
      ]}
      onPress={() => setSelectedGenre(selectedGenre === item.id ? null : item.id)}
    >
      <Text
        style={[
          styles.genreText,
          selectedGenre === item.id && styles.genreTextActive,
        ]}
      >
        {item.name}
      </Text>
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
      {/* Header */}
      <Animated.View style={[styles.headerContainer, { opacity: headerOpacity }]}>
        <LinearGradient
          colors={['rgba(0,0,0,0.9)', 'rgba(0,0,0,0.7)', 'transparent']}
          style={styles.headerGradient}
        >
          <SafeAreaView edges={['top']}>
            <View style={styles.header}>
              <Text style={styles.logo}>Explorar</Text>
              <View style={styles.headerButtons}>
                <TouchableOpacity>
                  <IconSymbol name="magnifyingglass" size={24} color="#fff" />
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
        <SafeAreaView edges={['top']}>
          <View style={styles.topPadding} />

          {/* Filtros de género */}
          <View style={styles.genresContainer}>
            <FlatList
              data={genres}
              renderItem={renderGenreChip}
              keyExtractor={(item) => item.id.toString()}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.genresList}
            />
          </View>

          {/* Películas en tendencia */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <IconSymbol name="film" size={20} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.sectionTitle}>Películas en tendencia</Text>
            </View>
            <FlatList
              data={trendingMovies}
              renderItem={renderMovieItem}
              keyExtractor={(item) => `trending-movie-${item.id}`}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.movieList}
            />
          </View>

          {/* Series en tendencia */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <IconSymbol name="tv" size={20} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.sectionTitle}>Series en tendencia</Text>
            </View>
            <FlatList
              data={trendingSeries}
              renderItem={renderMovieItem}
              keyExtractor={(item) => `trending-tv-${item.id}`}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.movieList}
            />
          </View>

          {/* Anime en tendencia */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Anime en tendencia</Text>
            </View>
            <FlatList
              data={trendingAnime}
              renderItem={renderAnimeItem}
              keyExtractor={(item) => `trending-anime-${item.id}`}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.movieList}
            />
          </View>

          {/* Anime popular */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Anime popular</Text>
            </View>
            <FlatList
              data={popularAnime}
              renderItem={renderAnimeItem}
              keyExtractor={(item) => `popular-anime-${item.id}`}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.movieList}
            />
          </View>

          {/* Películas por género */}
          {genres.slice(0, 8).map((genre) => (
            moviesByGenre[genre.id] && (
              <View key={genre.id} style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>{genre.name}</Text>
                  <TouchableOpacity>
                    <Text style={styles.exploreAll}>Ver todo ›</Text>
                  </TouchableOpacity>
                </View>
                <FlatList
                  data={moviesByGenre[genre.id]}
                  renderItem={renderMovieItem}
                  keyExtractor={(item) => `${genre.id}-${item.id}`}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.movieList}
                />
              </View>
            )
          ))}

          <View style={{ height: 60 }} />
        </SafeAreaView>
      </Animated.ScrollView>
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
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 20,
  },
  scrollView: {
    flex: 1,
  },
  topPadding: {
    height: 60,
  },
  genresContainer: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  genresList: {
    paddingHorizontal: 16,
  },
  genreChip: {
    backgroundColor: '#222',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
    marginRight: 8,
  },
  genreChipActive: {
    backgroundColor: '#fff',
  },
  genreText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  genreTextActive: {
    color: '#000',
  },
  section: {
    marginTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  },
  moviePoster: {
    width: '100%',
    height: 180,
    borderRadius: 4,
  },
});