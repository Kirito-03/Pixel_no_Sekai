import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/ui/icon-symbol';

interface SearchResult {
  id: string;
  title: string;
  category: string;
  image: string;
}

// Datos de ejemplo para resultados de búsqueda
const MOCK_RESULTS: SearchResult[] = [
  { id: '1', title: 'Stranger Things', category: 'Serie', image: '📺' },
  { id: '2', title: 'Breaking Bad', category: 'Serie', image: '🧪' },
  { id: '3', title: 'The Crown', category: 'Serie', image: '👑' },
  { id: '4', title: 'Black Mirror', category: 'Serie', image: '📱' },
  { id: '5', title: 'Narcos', category: 'Serie', image: '💰' },
  { id: '6', title: 'The Witcher', category: 'Serie', image: '⚔️' },
];

export default function BuscarScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    
    if (text.trim().length > 0) {
      // Filtrar resultados basados en la búsqueda
      const filtered = MOCK_RESULTS.filter(item =>
        item.title.toLowerCase().includes(text.toLowerCase())
      );
      setResults(filtered);
    } else {
      setResults([]);
    }
  };

  const renderItem = ({ item }: { item: SearchResult }) => (
    <TouchableOpacity style={styles.resultItem}>
      <View style={styles.itemImage}>
        <Text style={styles.emoji}>{item.image}</Text>
      </View>
      <View style={styles.itemInfo}>
        <Text style={styles.itemTitle}>{item.title}</Text>
        <Text style={styles.itemCategory}>{item.category}</Text>
      </View>
      <IconSymbol name="chevron.right" size={20} color="#666" />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Buscar</Text>
      </View>

      {/* Barra de búsqueda */}
      <View style={styles.searchContainer}>
        <IconSymbol name="magnifyingglass" size={20} color="#888" />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar series, películas..."
          placeholderTextColor="#888"
          value={searchQuery}
          onChangeText={handleSearch}
          autoCapitalize="none"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => handleSearch('')}>
            <IconSymbol name="xmark.circle.fill" size={20} color="#888" />
          </TouchableOpacity>
        )}
      </View>

      {/* Resultados */}
      {results.length > 0 ? (
        <FlatList
          data={results}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.resultsList}
        />
      ) : searchQuery.length > 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No se encontraron resultados</Text>
          <Text style={styles.emptySubtext}>
            Intenta buscar con otros términos
          </Text>
        </View>
      ) : (
        <View style={styles.emptyContainer}>
          <IconSymbol name="magnifyingglass" size={64} color="#333" />
          <Text style={styles.emptyText}>Busca tu contenido favorito</Text>
          <Text style={styles.emptySubtext}>
            Series, películas, documentales y más
          </Text>
        </View>
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
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#222',
    marginHorizontal: 20,
    marginBottom: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
  },
  resultsList: {
    paddingHorizontal: 20,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
    gap: 16,
  },
  itemImage: {
    width: 60,
    height: 60,
    backgroundColor: '#333',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emoji: {
    fontSize: 32,
  },
  itemInfo: {
    flex: 1,
  },
  itemTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  itemCategory: {
    color: '#888',
    fontSize: 14,
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
    color: '#888',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
});