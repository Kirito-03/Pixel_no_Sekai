import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Header from '../components/Header';
import { MangaCard, MangaRankingItem, MangaFilterChips, MangaFilter } from '../components/MangaComponents';
import { MOCK_MANGA, MOCK_MANGA_POPULAR } from '../data/mockManga';
import { useTabNavigation } from '../hooks/useTabNavigation';

export default function MangaScreen() {
  const { width } = useWindowDimensions();
  const isSmallScreen = width < 768;
  const navigation = useNavigation<any>();
  const { navigateByLabel } = useTabNavigation();

  const [activeFilter, setActiveFilter] = useState<MangaFilter>('Todos');

  // Filtrado local sin recargar
  const filtered = useMemo(() => {
    if (activeFilter === 'Todos') return MOCK_MANGA;
    return MOCK_MANGA.filter(m => m.status === activeFilter);
  }, [activeFilter]);

  // Grid: chunks según columnas
  const columns = isSmallScreen ? 2 : 6;
  const chunks: typeof filtered[] = [];
  for (let i = 0; i < filtered.length; i += columns) {
    chunks.push(filtered.slice(i, i + columns));
  }

  return (
    <View style={styles.container}>
      {/* Header flotante */}
      <Header
        black
        activeSection="Manga"
        onNavPress={navigateByLabel}
        onSearchPress={() => navigateByLabel('Buscar')}
        onProfilePress={() => navigateByLabel('Perfil')}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ── PAGE HEADER ── */}
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>Manga</Text>
          <Text style={styles.pageSubtitle}>Lee tus manga favoritos en línea</Text>
        </View>

        {/* ── FILTROS ── */}
        <View style={styles.section}>
          <MangaFilterChips active={activeFilter} onChange={setActiveFilter} />

          {/* ── GRID DE CARDS ── */}
          {filtered.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="book-outline" size={48} color="rgba(255,255,255,0.15)" />
              <Text style={styles.emptyText}>No hay manga en esta categoría</Text>
            </View>
          ) : (
            chunks.map((chunk, ci) => (
              <View key={ci} style={styles.gridRow}>
                {chunk.map(item => (
                  <MangaCard key={item.id} item={item} onPress={() => {}} />
                ))}
                {/* Relleno si la fila no está completa */}
                {chunk.length < columns &&
                  Array.from({ length: columns - chunk.length }).map((_, i) => (
                    <View key={`pad-${i}`} style={{ flex: 1 }} />
                  ))}
              </View>
            ))
          )}
        </View>

        {/* ── MÁS POPULARES ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="flame" size={20} color="#E50914" />
            <Text style={styles.sectionTitle}>Más populares esta semana</Text>
          </View>

          {/* 3 columnas en web, 1 en mobile */}
          <View style={isSmallScreen ? styles.rankingCol : styles.rankingGrid}>
            {MOCK_MANGA_POPULAR.map(item => (
              <View
                key={item.id}
                style={isSmallScreen ? { width: '100%' } : styles.rankingCell}
              >
                <MangaRankingItem item={item} onPress={() => {}} />
              </View>
            ))}
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  scrollContent: {
    paddingTop: 80,
  },

  /* PAGE HEADER */
  pageHeader: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
  },
  pageTitle: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  pageSubtitle: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 14,
  },

  /* SECTION */
  section: {
    paddingHorizontal: 20,
    marginBottom: 36,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.2,
  },

  /* GRID */
  gridRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },

  /* EMPTY */
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyText: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 14,
  },

  /* RANKING */
  rankingCol: { flexDirection: 'column' },
  rankingGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  rankingCell: {
    flex: 1,
    minWidth: 260,
  },
});
