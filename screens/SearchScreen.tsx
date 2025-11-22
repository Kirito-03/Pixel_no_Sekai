import React, { useRef, useState, useEffect } from 'react';
import { View, TextInput, FlatList, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { searchAllContent, getMovieDetails } from '../services/api';
import MovieCard from '../components/MovieCard';
import MovieModal from '../components/MovieModal';
import { colors, spacing } from '../theme';
import { MovieDetail, ContentItem } from '../types';
import { useProfile } from '../contexts/ProfileContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function SearchScreen() {
  const { adultContentEnabled, currentProfile } = useProfile();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ContentItem[]>([]);
  const [suggestions, setSuggestions] = useState<ContentItem[]>([]);
  const [selectedContent, setSelectedContent] = useState<ContentItem | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [recentQueries, setRecentQueries] = useState<string[]>([]);
  const typingTimer = useRef<any>(null);
  const latestQueryRef = useRef<string>('');

  useEffect(() => {
    // Cargar últimas búsquedas por perfil
    const loadRecent = async () => {
      try {
        const profileId = currentProfile?.id;
        if (!profileId) {
          setRecentQueries([]);
          return;
        }
        const stored = await AsyncStorage.getItem(`recentSearches:${profileId}`);
        if (stored) {
          const arr = JSON.parse(stored);
          if (Array.isArray(arr)) setRecentQueries(arr.slice(0, 5));
          else setRecentQueries([]);
        } else {
          setRecentQueries([]);
        }
      } catch (err) {
        console.warn('No se pudieron cargar las últimas búsquedas');
        setRecentQueries([]);
      }
    };
    loadRecent();
  }, [currentProfile?.id]);

  const recordRecentSearch = async (text: string) => {
    const q = (text || '').trim();
    const profileId = currentProfile?.id;
    if (!profileId || q.length === 0) return;
    try {
      const stored = await AsyncStorage.getItem(`recentSearches:${profileId}`);
      const list: string[] = stored ? JSON.parse(stored) : [];
      // De-duplicar por minúsculas conservando la última ocurrencia
      const lower = q.toLowerCase();
      const filtered = list.filter(item => item.toLowerCase() !== lower);
      const updated = [q, ...filtered].slice(0, 5);
      setRecentQueries(updated);
      await AsyncStorage.setItem(`recentSearches:${profileId}`, JSON.stringify(updated));
    } catch (err) {
      console.warn('No se pudo guardar la búsqueda reciente');
    }
  };

  const clearSearch = () => {
    setQuery('');
    latestQueryRef.current = '';
    setSuggestions([]);
    setResults([]);
    if (typingTimer.current) {
      clearTimeout(typingTimer.current);
      typingTimer.current = null;
    }
  };

  const fetchSuggestions = async (text: string) => {
    // Evitar consultas excesivas: exigir mínimo 2 caracteres
    if (!text || text.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    try {
      // Buscar y limitar a 8 sugerencias para evitar ruido
      const localQuery = text;
      const normalizedQuery = localQuery.trim().toLowerCase();
      const all = await searchAllContent(normalizedQuery);
      // Mantener títulos únicos por tipo para variedad
      const seen = new Set<string>();
      const unique = all.filter((item) => {
        const titleKey = (item.title || '').toString().toLowerCase();
        const key = `${titleKey}-${item.type}`;
        if (seen.has(key)) return false;
        seen.add(key);
        // Filtrar +18 en anime si está deshabilitado
        if (item.type === 'anime' && !adultContentEnabled && item.isAdult) return false;
        return true;
      }).slice(0, 8);
      // Evitar sobrescribir resultados si el usuario ya cambió el texto
      if (latestQueryRef.current === localQuery) {
        setSuggestions(unique);
      }
    } catch (error) {
      console.error('Error fetching suggestions:', error);
      setSuggestions([]);
    }
  };

  const handleSearch = async (text: string) => {
    setQuery(text);
    latestQueryRef.current = text;
    // programar sugerencias en cada cambio de texto
    if (typingTimer.current) clearTimeout(typingTimer.current);
    // Reducir presión sobre AniList y evitar 429: aumentar debounce
    typingTimer.current = setTimeout(() => fetchSuggestions(text), 500);

    if (text.length > 2) {
      setLoading(true);
      try {
        const localQuery = text;
        const normalizedQuery = localQuery.trim().toLowerCase();
        const allContent = await searchAllContent(normalizedQuery);
        const filtered = allContent.filter(item => {
          if (item.type === 'anime' && !adultContentEnabled && item.isAdult) return false;
          return true;
        });
        if (latestQueryRef.current === localQuery) {
          setResults(filtered);
        }
      } catch (error) {
        console.error('Error searching content:', error);
        setResults([]);
      } finally {
        setLoading(false);
      }
    } else {
      setResults([]);
    }
  };

  const handleSuggestionPress = (item: ContentItem) => {
    const text = item.title;
    setQuery(text);
    setSuggestions([]);
    handleSearch(text);
    recordRecentSearch(text);
  };

  const handleMoviePress = (id: number) => {
    // Buscar el item en los resultados actuales
    const contentItem = results.find(item => item.id === id);
    if (contentItem) {
      setSelectedContent(contentItem);
      setModalVisible(true);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.inputWrapper}>
        <TextInput
          style={styles.input}
        placeholder="Buscar anime..."
          placeholderTextColor={colors.textGray}
          value={query}
          onChangeText={handleSearch}
          onSubmitEditing={({ nativeEvent }) => recordRecentSearch(nativeEvent.text)}
        />
        {query.length > 0 && (
          <TouchableOpacity
            accessibilityLabel="Limpiar búsqueda"
            style={styles.clearButton}
            onPress={clearSearch}
          >
            <Text style={styles.clearText}>×</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Sugerencias bajo el campo de búsqueda */}
      {suggestions.length > 0 && (
        <View style={styles.suggestionsContainer}>
          <FlatList
            data={suggestions}
            keyExtractor={(item) => `${item.source}-${item.type}-${item.id}`}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.suggestionRow} onPress={() => handleSuggestionPress(item)}>
                <Text style={styles.suggestionText}>{item.title}</Text>
                <Text style={styles.suggestionType}>{item.type.toUpperCase()}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      {/* Últimas búsquedas */}
      {recentQueries.length > 0 && (
        <View style={styles.recentContainer}>
          <Text style={styles.recentTitle}>Últimas búsquedas</Text>
          {recentQueries.map((text, idx) => (
            <TouchableOpacity
              key={`${text}-${idx}`}
              style={styles.recentRow}
              onPress={() => {
                setQuery(text);
                setSuggestions([]);
                handleSearch(text);
                recordRecentSearch(text);
              }}
            >
              <Text style={styles.recentText}>{text}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
      <FlatList
        data={results}
        numColumns={3}
        columnWrapperStyle={styles.columns}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <MovieCard movie={item} onPress={() => handleMoviePress(item.id)} />
        )}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.empty}>
            {query ? 'No se encontraron resultados' : 'Busca tus películas favoritas'}
          </Text>
        }
      />
      
      <MovieModal
        content={selectedContent}
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  inputWrapper: {
    position: 'relative',
    margin: spacing.md,
  },
  input: {
    backgroundColor: colors.card,
    color: colors.text,
    padding: spacing.md,
    borderRadius: 8,
    fontSize: 16,
  },
  clearButton: {
    position: 'absolute',
    right: spacing.md,
    top: '50%',
    transform: [{ translateY: -12 }],
    height: 24,
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3a3a3a',
    borderRadius: 12,
  },
  clearText: {
    color: colors.text,
    fontSize: 16,
    lineHeight: 16,
    textAlign: 'center',
  },
  suggestionsContainer: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    backgroundColor: colors.card,
    borderRadius: 8,
    overflow: 'hidden',
  },
  recentContainer: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    backgroundColor: colors.card,
    borderRadius: 8,
    paddingVertical: spacing.sm,
  },
  recentTitle: {
    color: colors.textGray,
    fontSize: 13,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.xs,
  },
  suggestionRow: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#333',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  recentRow: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#333',
  },
  suggestionText: {
    color: colors.text,
    fontSize: 14,
  },
  suggestionType: {
    color: colors.textGray,
    fontSize: 12,
  },
  recentText: {
    color: colors.text,
    fontSize: 14,
  },
  list: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg,
  },
  columns: {
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  empty: {
    color: colors.textGray,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
});

