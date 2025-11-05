/**
 * Carrusel de películas destacadas estilo Netflix.
 *
 * ¿Para qué es?
 * - Mostrar slides a pantalla completa con una película destacada y autoplay.
 * - Indicar la posición actual con puntos (dots).
 *
 * ¿Cómo funciona?
 * - Usa FlatList horizontal con pagingEnabled y snapping.
 * - Autoplay avanza cada 6s si hay más de una película.
 * - onViewableItemsChanged actualiza el índice actual para los indicadores.
 */
import React, { useEffect, useRef, useState } from 'react';
import { View, FlatList, StyleSheet, useWindowDimensions } from 'react-native';
import FeaturedMovie from './FeaturedMovie';
import { MovieDetail } from '../types';
import { colors } from '../theme';

interface Props {
  movies: MovieDetail[];
  onWatch: (movie: MovieDetail) => void;
}

/**
 * Carrusel de películas destacadas estilo Netflix.
 * - Usa FeaturedMovie para cada slide a pantalla completa.
 * - Paginación horizontal con snapping y autoplay.
 * - Indicadores (dots) de la slide actual.
 */
export default function FeaturedCarousel({ movies, onWatch }: Props) {
  const { width } = useWindowDimensions();
  const listRef = useRef<FlatList<MovieDetail>>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Autoplay: avanza cada 6s si hay más de 1 película
  useEffect(() => {
    if (!movies || movies.length <= 1) return; // sin autoplay para 0/1 items
    const interval = setInterval(() => {
      setCurrentIndex((prev) => {
        const next = (prev + 1) % movies.length;
        listRef.current?.scrollToIndex({ index: next, animated: true });
        return next;
      });
    }, 6000);
    return () => clearInterval(interval);
  }, [movies]);

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

      {/* Indicadores tipo dots */}
      <View style={styles.dotsContainer}>
        {movies.map((_, idx) => (
          <View key={idx} style={[styles.dot, idx === currentIndex ? styles.dotActive : styles.dotInactive]} />
        ))}
      </View>
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
});