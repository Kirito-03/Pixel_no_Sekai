import React, { useRef, useState } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  StyleSheet, 
  TouchableOpacity, 
  useWindowDimensions,
  Animated 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Movie } from '../types';
import MovieCard from './MovieCard';
import { colors, spacing } from '../theme';

interface Props {
  title: string;
  movies: Movie[];
  onMoviePress: (id: number) => void;
}

export default function MovieRow({ title, movies, onMoviePress }: Props) {
  const { width } = useWindowDimensions();
  const isSmallScreen = width < 768;
  const SCROLL_AMOUNT = width * 0.7;
  
  const flatListRef = useRef<FlatList>(null);
  const [scrollX, setScrollX] = useState(0);

  const handleLeftArrow = () => {
    const newPosition = Math.max(0, scrollX - SCROLL_AMOUNT);
    flatListRef.current?.scrollToOffset({ 
      offset: newPosition, 
      animated: true 
    });
    setScrollX(newPosition);
  };

  const handleRightArrow = () => {
    const newPosition = scrollX + SCROLL_AMOUNT;
    flatListRef.current?.scrollToOffset({ 
      offset: newPosition, 
      animated: true 
    });
    setScrollX(newPosition);
  };

  const handleScroll = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    setScrollX(offsetX);
  };

  const dynamicStyles = {
    container: {
      marginBottom: isSmallScreen ? spacing.md : spacing.lg,
    },
    title: {
      fontSize: isSmallScreen ? 16 : 20,
      fontWeight: 'bold' as const,
      color: colors.text,
      marginBottom: isSmallScreen ? spacing.sm : spacing.md,
      marginLeft: isSmallScreen ? spacing.sm : spacing.md,
    },
    listContainer: {
      position: 'relative' as const,
    },
    list: {
      paddingHorizontal: isSmallScreen ? spacing.sm : spacing.md,
    },
    arrow: {
      position: 'absolute' as const,
      top: 0,
      bottom: 0,
      width: isSmallScreen ? 0 : 40,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
      zIndex: 99,
      opacity: isSmallScreen ? 0 : 1,
    },
    leftArrow: {
      left: 0,
    },
    rightArrow: {
      right: 0,
    },
  };

  return (
    <View style={dynamicStyles.container}>
      <Text style={dynamicStyles.title}>{title}</Text>
      
      <View style={dynamicStyles.listContainer}>
        {/* Flecha izquierda */}
        {scrollX > 0 && !isSmallScreen && (
          <TouchableOpacity 
            style={[dynamicStyles.arrow, dynamicStyles.leftArrow]}
            onPress={handleLeftArrow}
            activeOpacity={0.8}
          >
            <Ionicons name="chevron-back" size={40} color={colors.text} />
          </TouchableOpacity>
        )}

        {/* Lista de películas */}
        <FlatList
          ref={flatListRef}
          data={movies}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <MovieCard movie={item} onPress={() => onMoviePress(item.id)} />
          )}
          contentContainerStyle={dynamicStyles.list}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          snapToInterval={width * 0.3 + 8}
          decelerationRate="fast"
        />

        {/* Flecha derecha */}
        {movies.length > 3 && !isSmallScreen && (
          <TouchableOpacity 
            style={[dynamicStyles.arrow, dynamicStyles.rightArrow]}
            onPress={handleRightArrow}
            activeOpacity={0.8}
          >
            <Ionicons name="chevron-forward" size={40} color={colors.text} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

