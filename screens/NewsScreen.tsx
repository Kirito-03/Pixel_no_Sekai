import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { MOCK_NEWS, MOCK_TRENDING } from '../data/mockNews';
import { NewsHero, NewsCard, TrendingItem } from '../components/NewsComponents';
import Header from '../components/Header';
import { useTabNavigation } from '../hooks/useTabNavigation';

export default function NewsScreen() {
  const { width } = useWindowDimensions();
  const isSmallScreen = width < 768;
  const isWeb = Platform.OS === 'web';
  const navigation = useNavigation<any>();
  const { navigateByLabel } = useTabNavigation();
  const [blackHeader, setBlackHeader] = useState(true);

  // Separar hero del resto
  const hero = MOCK_NEWS.find(n => n.featured) ?? MOCK_NEWS[0];
  const grid = MOCK_NEWS.filter(n => n.id !== hero.id);

  // En web 3 columnas, mobile 1 columna
  const columns = isSmallScreen ? 1 : 3;

  // Chunks para el grid
  const chunks: typeof grid[] = [];
  for (let i = 0; i < grid.length; i += columns) {
    chunks.push(grid.slice(i, i + columns));
  }

  return (
    <View style={styles.container}>
      {/* Header flotante compartido — activeNav=Noticias */}
      <Header
        black={blackHeader}
        activeSection="Noticias"
        onNavPress={navigateByLabel}
        onSearchPress={() => navigateByLabel('Buscar')}
        onProfilePress={() => navigateByLabel('Perfil')}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ── PAGE HEADER ── */}
        <SafeAreaView>
          <View style={styles.pageHeader}>
            <Text style={styles.pageTitle}>Noticias</Text>
            <Text style={styles.pageSubtitle}>Las últimas novedades del mundo del anime</Text>
          </View>
        </SafeAreaView>

        {/* ── HERO ── */}
        <NewsHero item={hero} onPress={() => {}} />

        {/* ── GRID SECTION ── */}
        <View style={styles.section}>
          {chunks.map((chunk, ci) => (
            <View key={ci} style={styles.gridRow}>
              {chunk.map(item => (
                <NewsCard key={item.id} item={item} onPress={() => {}} />
              ))}
              {/* Relleno si falta columna */}
              {chunk.length < columns &&
                Array.from({ length: columns - chunk.length }).map((_, i) => (
                  <View key={`pad-${i}`} style={{ flex: 1 }} />
                ))}
            </View>
          ))}
        </View>

        {/* ── TENDENCIAS ── */}
        <View style={styles.section}>
          {/* Título de sección con ícono */}
          <View style={styles.sectionHeader}>
            <Ionicons name="trending-up" size={20} color="#E50914" />
            <Text style={styles.sectionTitle}>Tendencias</Text>
          </View>

          {/* Lista en dos columnas en web */}
          <View style={isSmallScreen ? styles.trendingCol : styles.trendingGrid}>
            {MOCK_TRENDING.map(item => (
              <View
                key={item.id}
                style={isSmallScreen ? { width: '100%' } : styles.trendingCell}
              >
                <TrendingItem
                  rank={item.rank}
                  title={item.title}
                  description={item.description}
                />
              </View>
            ))}
          </View>
        </View>

        {/* Espacio final */}
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
    paddingTop: 80, // espacio para el header flotante
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
    gap: 14,
    marginBottom: 14,
  },

  /* TRENDING */
  trendingCol: {
    flexDirection: 'column',
  },
  trendingGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  trendingCell: {
    flex: 1,
    minWidth: 280,
  },
});
