  import React, { useEffect, useRef, useState } from 'react';
import { View, FlatList, StyleSheet, useWindowDimensions, Animated, Platform, PanResponder } from 'react-native';
import FeaturedMovie from './FeaturedMovie';
import { MovieDetail, AnimeDetail } from '../types';
import { colors } from '../theme';

interface Props {
  movies: (MovieDetail | AnimeDetail)[];
  onWatch: (movie: MovieDetail | AnimeDetail) => void;
}

/**
 * Carrusel de películas destacadas estilo Netflix.
 * - Usa FeaturedMovie para cada slide a pantalla completa.
 * - Paginación horizontal con snapping y autoplay.
 * - Indicadores (dots) de la slide actual.
 */
export default function FeaturedCarousel({ movies, onWatch }: Props) {
  const { width } = useWindowDimensions();
  const listRef = useRef<FlatList<MovieDetail | AnimeDetail>>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current; // Opacidad para Android fade

  // Gestor de gestos para Android (Swipe)
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Solo capturar si el movimiento horizontal es significativo
        return Math.abs(gestureState.dx) > 20;
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx > 50) {
          // Swipe Right -> Anterior
          setCurrentIndex((prev) => (prev - 1 + movies.length) % movies.length);
        } else if (gestureState.dx < -50) {
          // Swipe Left -> Siguiente
          setCurrentIndex((prev) => (prev + 1) % movies.length);
        }
      },
    })
  ).current;

  // Efecto de Fade al cambiar índice (Solo Android)
  useEffect(() => {
    if (Platform.OS === 'android') {
      fadeAnim.setValue(0);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500, // Duración del fade
        useNativeDriver: true,
      }).start();
    }
  }, [currentIndex, fadeAnim]);


  // Autoplay: avanza cada 6s si hay más de 1 película
  useEffect(() => {
    if (!movies || movies.length <= 1) return; // sin autoplay para 0/1 items

    // Reset progress
    progressAnim.setValue(0);

    // Animate progress bar (Solo si no es Android o si el usuario quiere mantener lógica interna)
    // Aunque ocultamos la barra en Android, el timer sigue contando para cambiar la imagen
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: 6000,
      useNativeDriver: false,
    }).start();

    const interval = setInterval(() => {
      setCurrentIndex((prev) => {
        const next = (prev + 1) % movies.length;
        if (Platform.OS !== 'android') {
          listRef.current?.scrollToIndex({ index: next, animated: true });
        }
        return next;
      });
    }, 6000);

    return () => clearInterval(interval);
  }, [movies, currentIndex]);

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: any[] }) => {
    if (viewableItems && viewableItems.length > 0) {
      const idx = viewableItems[0].index ?? 0;
      if (typeof idx === 'number') setCurrentIndex(idx);
    }
  }).current;

  const viewabilityConfig = {
    itemVisiblePercentThreshold: 50,
  };

  if (!movies || movies.length === 0) return null;

  if (movies.length === 1) {
    const only = movies[0];
    return (
      <FeaturedMovie
        movie={only}
        onWatch={() => onWatch(only)}
      />
    );
  }

  return (
    <View style={[styles.container, { width }]}>
      {Platform.OS === 'android' ? (
        // --- VISTA ANDROID (FADE) ---
        <View {...panResponder.panHandlers} style={{ flex: 1 }}>
          <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
            <FeaturedMovie
              movie={movies[currentIndex]}
              onWatch={() => onWatch(movies[currentIndex])}
            />
          </Animated.View>
        </View>
      ) : (
        // --- VISTA WEB/iOS (SLIDE ORIGINAL) ---
        <FlatList
          ref={listRef}
          data={movies}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <FeaturedMovie movie={item} onWatch={() => onWatch(item)} />
          )}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          initialScrollIndex={0}
        />
      )}

      {/* Indicadores tipo dots con animación */}
      <View style={styles.dotsContainer}>
        {movies.map((_, idx) => {
          const isActive = idx === currentIndex;
          return (
            <Animated.View
              key={idx}
              style={[
                styles.dot,
                isActive ? styles.dotActive : styles.dotInactive,
                isActive && {
                  transform: [{
                    scale: 1.2,
                  }],
                },
              ]}
            />
          );
        })}
      </View>

      {/* Progress bar del autoplay (Oculto en Android) */}
      {movies.length > 1 && Platform.OS !== 'android' && (
        <View style={styles.progressBarContainer}>
          <Animated.View
            style={[
              styles.progressBar,
              {
                width: progressAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', '100%'],
                }),
              },
            ]}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
  },
  dotsContainer: {
    position: 'absolute',
    bottom: 30,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  dotActive: {
    backgroundColor: colors.primary,
  },
  dotInactive: {
    backgroundColor: '#666',
  },
  progressBarContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  progressBar: {
    height: '100%',
    backgroundColor: colors.primary,
  },
});