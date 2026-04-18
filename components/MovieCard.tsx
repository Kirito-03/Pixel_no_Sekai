import React, { useRef, useState } from 'react';
import {
  TouchableOpacity,
  Image,
  StyleSheet,
  useWindowDimensions,
  Animated,
  View,
  Text,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Movie, TVShow, ContentItem } from '../types';
import { getImageUrl } from '../services/api';
import { Ionicons } from '@expo/vector-icons';
import { useMyList } from '../contexts/MyListContext';
import { shadows, colors, badgeStyles } from '../theme';

interface Props {
  movie: Movie | TVShow | ContentItem;
  onPress: () => void;
}

export default function MovieCard({ movie, onPress }: Props) {
  const { width } = useWindowDimensions();
  const isSmallScreen = width < 768;
  const isWeb = Platform.OS === 'web';
  const CARD_WIDTH = isSmallScreen ? width * 0.34 : 155;
  const CARD_HEIGHT = CARD_WIDTH * 1.5;
  const { isInMyList } = useMyList();

  // Hover state (web only)
  const [hovered, setHovered] = useState(false);

  const getImageSource = () => {
    if ('source' in movie) {
      if (movie.source === 'anilist') return movie.poster_path;
      return getImageUrl(movie.poster_path, 'w500');
    }
    return getImageUrl(movie.poster_path, 'w500');
  };

  const getIdAndType = () => {
    let id: number | string | undefined;
    let type: 'movie' | 'tv' | 'anime' = 'movie';
    if ('id' in movie) id = movie.id as any;
    if ('type' in movie) {
      type = (movie as any).type;
    } else {
      type = (movie as any).first_air_date ? 'tv' : 'movie';
    }
    return { id, type };
  };

  const { id, type } = getIdAndType();
  const inMyList = id != null ? isInMyList(Number(id), type) : false;

  const getStatusBadge = () => {
    if (!('status' in movie) || !(movie as any).status) return null;
    const status = ((movie as any).status || '').toLowerCase();
    if (status.includes('airing') || status.includes('releasing') || status === 'emisión') return badgeStyles.airing;
    if (status.includes('finished') || status.includes('completed') || status === 'finalizado') return badgeStyles.finished;
    if (status.includes('upcoming') || status.includes('not_yet') || status === 'próximo') return badgeStyles.upcoming;
    return null;
  };
  const statusBadge = getStatusBadge();

  const getTitle = (): string => {
    if ('title' in movie && typeof movie.title === 'string') return movie.title;
    if ('name' in movie && typeof (movie as any).name === 'string') return (movie as any).name;
    return '';
  };

  const getRating = (): string => {
    const v = (movie as any).vote_average;
    return typeof v === 'number' && v > 0 ? v.toFixed(1) : '';
  };

  const getYear = (): string => {
    const d = (movie as any).release_date || (movie as any).first_air_date || '';
    if (!d) return '';
    const y = new Date(d).getFullYear();
    return isNaN(y) ? '' : String(y);
  };

  const getStatusLabel = (): string => {
    if (!statusBadge) return '';
    return statusBadge.label;
  };

  // Scale animation (press)
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const shadowAnim = useRef(new Animated.Value(0)).current;

  const handlePressIn = () => {
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1.04, useNativeDriver: false, friction: 3 }),
      Animated.spring(shadowAnim, { toValue: 1, useNativeDriver: false, friction: 3 }),
    ]).start();
  };

  const handlePressOut = () => {
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: false, friction: 3 }),
      Animated.spring(shadowAnim, { toValue: 0, useNativeDriver: false, friction: 3 }),
    ]).start();
  };

  const animatedShadowRadius = shadowAnim.interpolate({ inputRange: [0, 1], outputRange: [2, 18] });
  const animatedShadowOpacity = shadowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.05, 0.35] });

  // Web hover handlers
  const webHoverProps = isWeb ? {
    onMouseEnter: () => setHovered(true),
    onMouseLeave: () => setHovered(false),
  } : {};

  return (
    <Animated.View
      style={[
        {
          width: CARD_WIDTH,
          height: CARD_HEIGHT,
          marginRight: isSmallScreen ? 10 : 12,
          borderRadius: 10,
          transform: [{ scale: hovered ? 1.07 : 1 }],
          shadowColor: hovered ? colors.primary : '#000',
          shadowRadius: hovered ? 20 : animatedShadowRadius,
          shadowOpacity: hovered ? 0.5 : animatedShadowOpacity,
          shadowOffset: { width: 0, height: 4 },
          elevation: hovered ? 12 : 2,
          zIndex: hovered ? 10 : 1,
        },
        isWeb ? {
          cursor: 'pointer',
          transition: 'transform 0.22s ease, box-shadow 0.22s ease',
        } as any : null,
      ]}
      {...webHoverProps}
    >
      <TouchableOpacity
        style={{
          width: CARD_WIDTH,
          height: CARD_HEIGHT,
          borderRadius: 10,
          overflow: 'hidden',
          backgroundColor: '#1a1a1a',
        }}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.9}
      >
        <Image
          source={{ uri: getImageSource() }}
          style={{ width: CARD_WIDTH, height: CARD_HEIGHT }}
          resizeMode="cover"
        />

        {/* ── Overlay base (siempre visible, sutil) ── */}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.65)']}
          style={styles.cardOverlay}
          pointerEvents="none"
        >
          {!hovered && (
            <Text style={styles.cardTitle} numberOfLines={2}>{getTitle()}</Text>
          )}
        </LinearGradient>

        {/* ── Hover overlay (web) ── */}
        {isWeb && hovered && (
          <View style={StyleSheet.absoluteFill}>
            <LinearGradient
              colors={['rgba(0,0,0,0.15)', 'rgba(0,0,0,0.55)', 'rgba(0,0,0,0.92)']}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            />
            <View style={styles.hoverContent}>
              {/* Rating + año */}
              <View style={styles.hoverMeta}>
                {getRating() ? (
                  <View style={styles.hoverRatingBadge}>
                    <Ionicons name="star" size={10} color="#FFD700" />
                    <Text style={styles.hoverRating}>{getRating()}</Text>
                  </View>
                ) : null}
                {getYear() ? <Text style={styles.hoverYear}>{getYear()}</Text> : null}
                {getStatusLabel() ? (
                  <View style={[styles.hoverStatusPill, { backgroundColor: statusBadge?.backgroundColor || '#555' }]}>
                    <Text style={styles.hoverStatusText}>{getStatusLabel()}</Text>
                  </View>
                ) : null}
              </View>

              {/* Título */}
              <Text style={styles.hoverTitle} numberOfLines={2}>{getTitle()}</Text>

              {/* Botón Ver */}
              <TouchableOpacity style={styles.hoverPlayBtn} onPress={onPress}>
                <Ionicons name="play" size={13} color="#fff" />
                <Text style={styles.hoverPlayText}>Ver</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Badge estado — top-left */}
        {statusBadge && !hovered && (
          <View style={[styles.badge, { backgroundColor: statusBadge.backgroundColor }]}>
            <Text style={styles.badgeText}>{statusBadge.label}</Text>
          </View>
        )}

        {/* Indicador Mi Lista — top-right */}
        {inMyList && (
          <View style={styles.myListIndicator}>
            <Ionicons name="checkmark-circle" color="#00E676" size={16} />
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  cardOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 8,
    paddingBottom: 10,
    paddingTop: 40,
    justifyContent: 'flex-end',
  },
  cardTitle: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
  },
  badge: {
    position: 'absolute',
    top: 8,
    left: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  myListIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 10,
    padding: 2,
  },

  /* ── HOVER STYLES ── */
  hoverContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 10,
    gap: 5,
  },
  hoverMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flexWrap: 'wrap',
  },
  hoverRatingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  hoverRating: {
    color: '#FFD700',
    fontSize: 10,
    fontWeight: '700',
  },
  hoverYear: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 10,
  },
  hoverStatusPill: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 3,
  },
  hoverStatusText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700',
  },
  hoverTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 16,
  },
  hoverPlayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#E50914',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 5,
    marginTop: 2,
  },
  hoverPlayText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
});
