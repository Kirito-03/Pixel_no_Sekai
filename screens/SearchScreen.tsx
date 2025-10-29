import React, { useState } from 'react';
import { View, TextInput, FlatList, StyleSheet, Text } from 'react-native';
import { searchAllContent, getMovieDetails } from '../services/api';
import MovieCard from '../components/MovieCard';
import MovieModal from '../components/MovieModal';
import { colors, spacing } from '../theme';
import { MovieDetail, ContentItem } from '../types';

export default function SearchScreen() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ContentItem[]>([]);
  const [selectedContent, setSelectedContent] = useState<ContentItem | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (text: string) => {
    setQuery(text);
    if (text.length > 2) {
      setLoading(true);
      try {
        const allContent = await searchAllContent(text);
        setResults(allContent);
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
      <TextInput
        style={styles.input}
        placeholder="Buscar películas..."
        placeholderTextColor={colors.textGray}
        value={query}
        onChangeText={handleSearch}
      />
      <FlatList
        data={results}
        numColumns={3}
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
  input: {
    backgroundColor: colors.card,
    color: colors.text,
    padding: spacing.md,
    margin: spacing.md,
    borderRadius: 8,
    fontSize: 16,
  },
  list: {
    padding: spacing.sm,
  },
  empty: {
    color: colors.textGray,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
});

