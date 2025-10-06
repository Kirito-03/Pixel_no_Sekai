import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Keyboard,
  ScrollView,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/ui/icon-symbol';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const TMDB_API_KEY = '00fca6c0171d4276ab9b941575081d28';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';
const ANILIST_API_URL = 'https://graphql.anilist.co';

interface SearchResult {
  id: number;
  title?: string;
  name?: string;
  poster_path?: string;
  backdrop_path?: string;
  media_type?: string;
  vote_average?: number;
  overview?: string;
}

interface AnimeResult {
  id: number;
  title: {
    romaji: string;
    english: string;
  };
  coverImage: {
    large: string;
    extraLarge: string;
  };
  averageScore?: number;
}

interface PopularItem {
  id: number;
  title?: string;
  name?: string;
  poster_path: string;
  backdrop_path: string;
  media_type?: string;
}

export default function BuscarScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [animeResults, setAnimeResults] = useState<AnimeResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [popularContent, setPopularContent] = useState<PopularItem[]>([]);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'movie' | 'tv' | 'anime'>('all');
  
  const searchTimeout = useRef<number | null>(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const suggestions = [
    'Acción y aventura',
    'Comedias románticas',
    'Dramas coreanos',
    'Películas de terror',
    'Anime shonen',
    'Documentales de naturaleza',
    'Thrillers psicológicos',
    'Ciencia ficción',
  ];

  useEffect(() => {
    loadPopularContent();
    loadSearchHistory();
  }, []);

  const loadSearchHistory = async () => {
    try {
      const history = await AsyncStorage.getItem('search_history');
      if (history) {
        setSearchHistory(JSON.parse(history));
      }
    } catch (error) {
      console.error('Error loading history:', error);
    }
  };

  const saveToHistory = async (query: string) => {
    try {
      const newHistory = [query, ...searchHistory.filter(item => item !== query)].slice(0, 10);
      setSearchHistory(newHistory);
      await AsyncStorage.setItem('search_history', JSON.stringify(newHistory));
    } catch (error) {
      console.error('Error saving history:', error);
    }
  };

  const loadPopularContent = async () => {
    try {
      const response = await axios.get(
        `${TMDB_BASE_URL}/trending/all/week`,
        {
          params: {
            api_key: TMDB_API_KEY,
            language: 'es-ES',
          },
        }
      );
      setPopularContent(response.data.results.slice(0, 21));
    } catch (error) {
      console.error('Error loading popular content:', error);
    }
  };

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    
    // Limpiar timeout anterior
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }
    
    if (text.trim().length > 2) {
      setLoading(true);
      // Debounce: esperar 500ms después de que el usuario deje de escribir
      searchTimeout.current = setTimeout(async () => {
        try {
          await Promise.all([
            searchTMDb(text),
            searchAnime(text),
          ]);
        } catch (error) {
          console.error('Error searching:', error);
        } finally {
          setLoading(false);
        }
      }, 500);
    } else {
      setResults([]);
      setAnimeResults([]);
      setLoading(false);
    }
  };

  const searchTMDb = async (query: string) => {
    try {
      const response = await axios.get(
        `${TMDB_BASE_URL}/search/multi`,
        {
          params: {
            api_key: TMDB_API_KEY,
            language: 'es-ES',
            query: query,
            include_adult: false,
          },
        }
      );
      setResults(response.data.results.filter((item: SearchResult) => 
        item.poster_path && (item.media_type === 'movie' || item.media_type === 'tv')
      ));
    } catch (error) {
      console.error('Error searching TMDb:', error);
    }
  };

  const searchAnime = async (query: string) => {
    const graphqlQuery = `
      query ($search: String) {
        Page(page: 1, perPage: 15) {
          media(type: ANIME, search: $search) {
            id
            title {
              romaji
              english
            }
            coverImage {
              large
              extraLarge
            }
            averageScore
          }
        }
      }
    `;

    try {
      const response = await axios.post(ANILIST_API_URL, {
        query: graphqlQuery,
        variables: { search: query },
      });
      setAnimeResults(response.data.data.Page.media);
    } catch (error) {
      console.error('Error searching anime:', error);
    }
  };

  const handleSearchSubmit = () => {
    if (searchQuery.trim().length > 0) {
      saveToHistory(searchQuery);
      Keyboard.dismiss();
    }
  };

  const clearSearch = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setSearchQuery('');
      setResults([]);
      setAnimeResults([]);
      setSelectedFilter('all');
      fadeAnim.setValue(1);
      Keyboard.dismiss();
    });
  };

  const clearHistory = async () => {
    try {
      await AsyncStorage.removeItem('search_history');
      setSearchHistory([]);
    } catch (error) {
      console.error('Error clearing history:', error);
    }
  };

  const getImageUrl = (path: string) => {
    return path ? `${TMDB_IMAGE_BASE}${path}` : 'https://via.placeholder.com/500x750';
  };

  const getFilteredResults = () => {
    if (selectedFilter === 'all') {
      return { movies: results, anime: animeResults };
    } else if (selectedFilter === 'movie') {
      return { movies: results.filter(r => r.media_type === 'movie'), anime: [] };
    } else if (selectedFilter === 'tv') {
      return { movies: results.filter(r => r.media_type === 'tv'), anime: [] };
    } else {
      return { movies: [], anime: animeResults };
    }
  };

  const filteredData = getFilteredResults();
  const hasResults = filteredData.movies.length > 0 || filteredData.anime.length > 0;

  const renderSkeletonLoader = () => (
    <View style={styles.skeletonContainer}>
      {[1, 2, 3, 4, 5].map(i => (
        <View key={i} style={styles.skeletonItem}>
          <View style={styles.skeletonImage} />
          <View style={styles.skeletonInfo}>
            <View style={styles.skeletonLine} />
            <View style={[styles.skeletonLine, { width: '60%', marginTop: 8 }]} />
          </View>
        </View>
      ))}
    </View>
  );

  const renderSearchResult = (item: SearchResult) => (
    <TouchableOpacity 
      key={`tmdb-${item.id}`} 
      style={styles.searchResultItem} 
      activeOpacity={0.8}
    >
      <Image
        source={{ uri: getImageUrl(item.poster_path || item.backdrop_path || '') }}
        style={styles.searchResultImage}
        resizeMode="cover"
      />
      <View style={styles.searchResultInfo}>
        <Text style={styles.searchResultTitle} numberOfLines={2}>
          {item.title || item.name}
        </Text>
        <View style={styles.metaContainer}>
          <Text style={styles.searchResultType}>
            {item.media_type === 'movie' ? 'Película' : 'Serie'}
          </Text>
          {item.vote_average && item.vote_average > 0 && (
            <View style={styles.ratingContainer}>
              <IconSymbol name="star.fill" size={12} color="#FFD700" />
              <Text style={styles.ratingText}>
                {(item.vote_average * 10).toFixed(0)}%
              </Text>
            </View>
          )}
        </View>
      </View>
      <IconSymbol name="play.circle.fill" size={32} color="#fff" />
    </TouchableOpacity>
  );

  const renderAnimeResult = (item: AnimeResult) => (
    <TouchableOpacity 
      key={`anime-${item.id}`} 
      style={styles.searchResultItem} 
      activeOpacity={0.8}
    >
      <Image
        source={{ uri: item.coverImage.extraLarge || item.coverImage.large }}
        style={styles.searchResultImage}
        resizeMode="cover"
      />
      <View style={styles.searchResultInfo}>
        <Text style={styles.searchResultTitle} numberOfLines={2}>
          {item.title.english || item.title.romaji}
        </Text>
        <View style={styles.metaContainer}>
          <Text style={styles.searchResultType}>Anime</Text>
          {item.averageScore && (
            <View style={styles.ratingContainer}>
              <IconSymbol name="star.fill" size={12} color="#FFD700" />
              <Text style={styles.ratingText}>{item.averageScore}%</Text>
            </View>
          )}
        </View>
      </View>
      <IconSymbol name="play.circle.fill" size={32} color="#fff" />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header con búsqueda */}
      <View style={styles.header}>
        <View style={styles.searchContainer}>
          <IconSymbol name="magnifyingglass" size={20} color="#999" />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar series, películas, anime..."
            placeholderTextColor="#666"
            value={searchQuery}
            onChangeText={handleSearch}
            onSubmitEditing={handleSearchSubmit}
            autoCapitalize="none"
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={clearSearch}>
              <IconSymbol name="xmark.circle.fill" size={20} color="#666" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filtros */}
      {searchQuery.length > 0 && (
        <View style={styles.filtersContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <TouchableOpacity 
              style={[styles.filterChip, selectedFilter === 'all' && styles.filterChipActive]}
              onPress={() => setSelectedFilter('all')}
            >
              <Text style={[styles.filterText, selectedFilter === 'all' && styles.filterTextActive]}>
                Todo
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.filterChip, selectedFilter === 'movie' && styles.filterChipActive]}
              onPress={() => setSelectedFilter('movie')}
            >
              <Text style={[styles.filterText, selectedFilter === 'movie' && styles.filterTextActive]}>
                Películas
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.filterChip, selectedFilter === 'tv' && styles.filterChipActive]}
              onPress={() => setSelectedFilter('tv')}
            >
              <Text style={[styles.filterText, selectedFilter === 'tv' && styles.filterTextActive]}>
                Series
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.filterChip, selectedFilter === 'anime' && styles.filterChipActive]}
              onPress={() => setSelectedFilter('anime')}
            >
              <Text style={[styles.filterText, selectedFilter === 'anime' && styles.filterTextActive]}>
                Anime
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      )}

      {loading ? (
        renderSkeletonLoader()
      ) : searchQuery.length > 0 ? (
        hasResults ? (
          <Animated.ScrollView 
            showsVerticalScrollIndicator={false}
            style={{ opacity: fadeAnim }}
          >
            {/* Resultados de TMDb */}
            {filteredData.movies.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  {selectedFilter === 'movie' ? 'Películas' : selectedFilter === 'tv' ? 'Series' : 'Películas y Series'}
                </Text>
                {filteredData.movies.map(renderSearchResult)}
              </View>
            )}

            {/* Resultados de Anime */}
            {filteredData.anime.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Anime</Text>
                {filteredData.anime.map(renderAnimeResult)}
              </View>
            )}
            <View style={{ height: 60 }} />
          </Animated.ScrollView>
        ) : (
          <View style={styles.emptyContainer}>
            <IconSymbol name="film" size={64} color="#333" />
            <Text style={styles.emptyText}>No se encontraron resultados</Text>
            <Text style={styles.emptySubtext}>
              Intenta con otros términos de búsqueda
            </Text>
          </View>
        )
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Búsquedas recientes */}
          {searchHistory.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>Búsquedas recientes</Text>
                <TouchableOpacity onPress={clearHistory}>
                  <Text style={styles.clearText}>Limpiar</Text>
                </TouchableOpacity>
              </View>
              {searchHistory.map((item, index) => (
                <TouchableOpacity 
                  key={`history-${index}`}
                  style={styles.historyItem}
                  onPress={() => handleSearch(item)}
                  activeOpacity={0.8}
                >
                  <IconSymbol name="clock" size={20} color="#999" />
                  <Text style={styles.historyText}>{item}</Text>
                  <TouchableOpacity
                    onPress={() => setSearchHistory(prev => prev.filter(h => h !== item))}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <IconSymbol name="xmark" size={16} color="#666" />
                  </TouchableOpacity>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Sugerencias */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Explorar por categoría</Text>
            {suggestions.map((suggestion, index) => (
              <TouchableOpacity
                key={index}
                style={styles.suggestionItem}
                onPress={() => handleSearch(suggestion)}
                activeOpacity={0.8}
              >
                <IconSymbol name="sparkles" size={18} color="#E50914" />
                <Text style={styles.suggestionText}>{suggestion}</Text>
                <IconSymbol name="arrow.up.forward" size={16} color="#666" />
              </TouchableOpacity>
            ))}
          </View>

          {/* Búsquedas populares */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Búsquedas populares</Text>
            <View style={styles.popularGrid}>
              {popularContent.map((item) => (
                <TouchableOpacity 
                  key={`popular-${item.id}`} 
                  style={styles.popularCard} 
                  activeOpacity={0.8}
                >
                  <Image
                    source={{ uri: getImageUrl(item.backdrop_path) }}
                    style={styles.popularImage}
                    resizeMode="cover"
                  />
                  <View style={styles.popularOverlay}>
                    <Text style={styles.popularTitle} numberOfLines={1}>
                      {item.title || item.name}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <View style={{ height: 60 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
  },
  filtersContainer: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  filterChip: {
    backgroundColor: '#2a2a2a',
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 16,
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: '#fff',
  },
  filterText: {
    color: '#999',
    fontSize: 14,
    fontWeight: '500',
  },
  filterTextActive: {
    color: '#000',
    fontWeight: '600',
  },
  skeletonContainer: {
    paddingHorizontal: 16,
    marginTop: 16,
  },
  skeletonItem: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 12,
  },
  skeletonImage: {
    width: 100,
    height: 56,
    backgroundColor: '#2a2a2a',
    borderRadius: 4,
  },
  skeletonInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  skeletonLine: {
    height: 12,
    backgroundColor: '#2a2a2a',
    borderRadius: 4,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  clearText: {
    color: '#54b9c5',
    fontSize: 14,
    fontWeight: '600',
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    backgroundColor: '#1a1a1a',
    borderRadius: 4,
    padding: 8,
    gap: 12,
  },
  searchResultImage: {
    width: 100,
    height: 56,
    borderRadius: 4,
    backgroundColor: '#333',
  },
  searchResultInfo: {
    flex: 1,
  },
  searchResultTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 6,
  },
  metaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  searchResultType: {
    color: '#999',
    fontSize: 13,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    color: '#FFD700',
    fontSize: 12,
    fontWeight: '600',
  },
  popularGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  popularCard: {
    width: '31%',
    aspectRatio: 16 / 9,
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: '#1a1a1a',
    marginBottom: 8,
  },
  popularImage: {
    width: '100%',
    height: '100%',
  },
  popularOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'flex-end',
    padding: 8,
  },
  popularTitle: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  historyText: {
    flex: 1,
    color: '#999',
    fontSize: 15,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  suggestionText: {
    flex: 1,
    color: '#fff',
    fontSize: 15,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    color: '#666',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
});