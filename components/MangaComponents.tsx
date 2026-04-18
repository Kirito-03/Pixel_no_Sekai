import React, { useRef } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { MangaItem } from '../data/mockManga';

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `Act. ${d.getDate()} abr`;
}

const STATUS_COLORS: Record<string, string> = {
  'En emisión': '#00C853',
  'Finalizado': '#E50914',
};

// ─────────────────────────────────────────────
//  MANGA CARD — Grid vertical tipo poster
// ─────────────────────────────────────────────
interface MangaCardProps {
  item: MangaItem;
  onPress: () => void;
}

export function MangaCard({ item, onPress }: MangaCardProps) {
  const scale = useRef(new Animated.Value(1)).current;
  const isWeb = Platform.OS === 'web';

  const onIn = () =>
    Animated.spring(scale, { toValue: 1.05, useNativeDriver: true, friction: 5 }).start();
  const onOut = () =>
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 5 }).start();

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={onPress}
      onPressIn={onIn}
      onPressOut={onOut}
      style={[styles.cardOuter, isWeb ? ({ cursor: 'pointer' } as any) : null]}
    >
      <Animated.View style={[styles.card, { transform: [{ scale }] }]}>
        {/* Imagen poster */}
        <View style={styles.posterBox}>
          <Image source={{ uri: item.image }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />

          {/* Overlay bottom */}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.5)']}
            style={StyleSheet.absoluteFillObject}
            pointerEvents="none"
          />

          {/* Badge estado */}
          <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[item.status] }]}>
            <Text style={styles.statusText}>{item.status}</Text>
          </View>

          {/* Rating */}
          <View style={styles.ratingBadge}>
            <Ionicons name="star" size={10} color="#FFD700" />
            <Text style={styles.ratingText}>{item.rating.toFixed(1)}</Text>
          </View>
        </View>

        {/* Info */}
        <View style={styles.cardInfo}>
          <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
          <View style={styles.cardMeta}>
            <Ionicons name="book-outline" size={11} color="rgba(255,255,255,0.45)" />
            <Text style={styles.cardMetaText}>{item.chapters} capítulos</Text>
          </View>
          {item.updatedAt && (
            <View style={styles.cardMeta}>
              <Ionicons name="time-outline" size={11} color="rgba(255,255,255,0.45)" />
              <Text style={styles.cardMetaText}>{formatDate(item.updatedAt)}</Text>
            </View>
          )}
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
}

// ─────────────────────────────────────────────
//  MANGA RANKING ITEM — Popular esta semana
// ─────────────────────────────────────────────
interface MangaRankingItemProps {
  item: MangaItem & { rank: number };
  onPress: () => void;
}

export function MangaRankingItem({ item, onPress }: MangaRankingItemProps) {
  const isTop = item.rank === 1;
  const scale = useRef(new Animated.Value(1)).current;

  const onIn = () =>
    Animated.spring(scale, { toValue: 1.02, useNativeDriver: true, friction: 6 }).start();
  const onOut = () =>
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 6 }).start();

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={onPress}
      onPressIn={onIn}
      onPressOut={onOut}
      style={styles.rankOuter}
    >
      <Animated.View style={[styles.rankCard, isTop && styles.rankCardTop, { transform: [{ scale }] }]}>
        {/* Thumbnail */}
        <Image source={{ uri: item.image }} style={styles.rankThumb} resizeMode="cover" />

        {/* Info */}
        <View style={styles.rankInfo}>
          <Text style={styles.rankTitle} numberOfLines={1}>{item.title}</Text>
          <View style={styles.rankRow}>
            <Ionicons name="star" size={12} color="#FFD700" />
            <Text style={styles.rankRating}>{item.rating.toFixed(1)}</Text>
          </View>
          <Text style={styles.rankChapters}>{item.chapters} capítulos disponibles</Text>
          <View style={[styles.rankStatusPill, { backgroundColor: STATUS_COLORS[item.status] + '33' }]}>
            <Text style={[styles.rankStatusText, { color: STATUS_COLORS[item.status] }]}>
              {item.status}
            </Text>
          </View>
        </View>

        {/* Número ranking */}
        <Text style={[styles.rankNumber, isTop && styles.rankNumberTop]}>
          #{item.rank}
        </Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

// ─────────────────────────────────────────────
//  FILTER CHIPS
// ─────────────────────────────────────────────
export type MangaFilter = 'Todos' | 'En emisión' | 'Finalizado';

interface FilterChipsProps {
  active: MangaFilter;
  onChange: (f: MangaFilter) => void;
}

const FILTERS: MangaFilter[] = ['Todos', 'En emisión', 'Finalizado'];

export function MangaFilterChips({ active, onChange }: FilterChipsProps) {
  return (
    <View style={styles.chipsRow}>
      {FILTERS.map(f => (
        <TouchableOpacity
          key={f}
          style={[styles.chip, active === f && styles.chipActive]}
          onPress={() => onChange(f)}
          activeOpacity={0.8}
        >
          <Text style={[styles.chipText, active === f && styles.chipTextActive]}>{f}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ─────────────────────────────────────────────
//  STYLES
// ─────────────────────────────────────────────
const styles = StyleSheet.create({
  /* CARD */
  cardOuter: { flex: 1, minWidth: 140, maxWidth: 200 },
  card: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#161616',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  posterBox: {
    height: 240,
    backgroundColor: '#1a1a1a',
  },
  statusBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  statusText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  ratingBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  ratingText: {
    color: '#FFD700',
    fontSize: 11,
    fontWeight: '700',
  },
  cardInfo: {
    padding: 12,
    gap: 4,
  },
  cardTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cardMetaText: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 11,
  },

  /* RANKING */
  rankOuter: { flex: 1, minWidth: 260 },
  rankCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161616',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
    marginBottom: 10,
  },
  rankCardTop: {
    borderColor: 'rgba(229,9,20,0.3)',
    backgroundColor: '#1a0a0a',
  },
  rankThumb: {
    width: 72,
    height: 90,
  },
  rankInfo: {
    flex: 1,
    padding: 12,
    gap: 4,
  },
  rankTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rankRating: {
    color: '#FFD700',
    fontSize: 12,
    fontWeight: '700',
  },
  rankChapters: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 12,
  },
  rankStatusPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 20,
    marginTop: 2,
  },
  rankStatusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  rankNumber: {
    fontSize: 28,
    fontWeight: '900',
    color: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 16,
  },
  rankNumberTop: {
    color: '#E50914',
  },

  /* FILTER CHIPS */
  chipsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  chip: {
    paddingHorizontal: 18,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#1E1E1E',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  chipActive: {
    backgroundColor: '#E50914',
    borderColor: '#E50914',
  },
  chipText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    fontWeight: '600',
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
});
