import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  Platform,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Header from '../components/Header';
import { MangaCard, MangaRankingItem, MangaFilterChips, MangaFilter, MangaItemUI } from '../components/MangaComponents';
import { useTabNavigation } from '../hooks/useTabNavigation';
import { mangaApi, Manga } from '../services/mangaApi';

export default function MangaScreen() {
  const { width } = useWindowDimensions();
  const isSmallScreen = width < 768;
  const navigation = useNavigation<any>();
  const { navigateByLabel } = useTabNavigation();

  const [activeFilter, setActiveFilter] = useState<MangaFilter>('Todos');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Manga[]>([]);
  const [popular, setPopular] = useState<Array<Manga & { rank: number }>>([]);

  const stableRating = (id: string) => {
    let h = 0;
    for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
    const base = 7.8 + (h % 180) / 100;
    return Math.max(7.8, Math.min(9.8, base));
  };

  const toUI = (m: Manga): MangaItemUI => ({
    id: m.id,
    title: m.title,
    image: m.cover_url || '',
    status: m.status,
    rating: stableRating(m.id),
    chapters: Number(m.chapter_count || 0),
    updatedAt: m.updated_at || new Date().toISOString(),
  });

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      try {
        const status = activeFilter === 'Todos' ? undefined : activeFilter;
        const q = search.trim();
        const list = await mangaApi.list({
          page: 1,
          limit: isSmallScreen ? 24 : 48,
          status,
          search: q || undefined,
          order: 'updated',
        });
        const pop = await mangaApi.popular({ limit: 3 });
        if (cancelled) return;
        setItems((list.items || list.data || []) as any);
        setPopular((pop.items || []) as any);
      } catch {
        if (cancelled) return;
        setItems([]);
        setPopular([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    const t = setTimeout(run, 260);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [activeFilter, search, isSmallScreen]);

  // Grid: chunks según columnas
  const columns = isSmallScreen ? 2 : 6;
  const mapped = useMemo(() => items.map(toUI), [items]);
  const chunks: typeof mapped[] = [];
  for (let i = 0; i < mapped.length; i += columns) {
    chunks.push(mapped.slice(i, i + columns));
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
          <View style={styles.searchBox}>
            <Ionicons name="search" size={18} color="rgba(255,255,255,0.45)" />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Buscar manga..."
              placeholderTextColor="rgba(255,255,255,0.35)"
              style={styles.searchInput}
              autoCorrect={false}
              autoCapitalize="none"
            />
            {search.trim() ? (
              <Ionicons name="close-circle" size={18} color="rgba(255,255,255,0.35)" onPress={() => setSearch('')} />
            ) : null}
          </View>
          <MangaFilterChips active={activeFilter} onChange={setActiveFilter} />

          {/* ── GRID DE CARDS ── */}
          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color="#E50914" />
            </View>
          ) : mapped.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="book-outline" size={48} color="rgba(255,255,255,0.15)" />
              <Text style={styles.emptyText}>No hay manga en esta categoría</Text>
            </View>
          ) : (
            chunks.map((chunk, ci) => (
              <View key={ci} style={styles.gridRow}>
                {chunk.map(item => (
                  <MangaCard key={item.id} item={item} onPress={() => navigation.navigate('MangaDetail', { id: item.id })} />
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
            {popular.map(item => (
              <View
                key={item.id}
                style={isSmallScreen ? { width: '100%' } : styles.rankingCell}
              >
                <MangaRankingItem item={{ ...toUI(item), rank: item.rank }} onPress={() => navigation.navigate('MangaDetail', { id: item.id })} />
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
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    paddingVertical: 0,
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
  loadingBox: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
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
