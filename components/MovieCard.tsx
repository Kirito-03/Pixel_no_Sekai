import React, { useRef } from 'react';
import { 
  TouchableOpacity, 
  Image, 
  StyleSheet, 
  useWindowDimensions, 
  Animated 
} from 'react-native';
import { Movie } from '../types';
import { getImageUrl } from '../services/api';

interface Props {
  movie: Movie;
  onPress: () => void;
}

export default function MovieCard({ movie, onPress }: Props) {
  const { width } = useWindowDimensions();
  const isSmallScreen = width < 768;
  // Aumentamos el tamaño de las tarjetas para que se vean mejor
  const CARD_WIDTH = isSmallScreen ? width * 0.32 : 130;
  const CARD_HEIGHT = CARD_WIDTH * 1.5; // Relación de aspecto 2:3 para posters
  
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 1.05,
      useNativeDriver: true,
      friction: 3,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      friction: 3,
    }).start();
  };

  const dynamicStyles = {
    card: {
      width: CARD_WIDTH,
      height: CARD_HEIGHT,
      marginRight: isSmallScreen ? 8 : 10,
      cursor: 'pointer' as const,
    },
    imageContainer: {
      width: CARD_WIDTH,
      height: CARD_HEIGHT,
      borderRadius: isSmallScreen ? 4 : 6,
      overflow: 'hidden' as const,
      backgroundColor: '#1a1a1a',
    },
    image: {
      width: CARD_WIDTH,
      height: CARD_HEIGHT,
    },
  };

  return (
    <Animated.View
      style={[
        dynamicStyles.card,
        {
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <TouchableOpacity 
        style={dynamicStyles.imageContainer} 
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.9}
      >
        <Image
          source={{ uri: getImageUrl(movie.poster_path, 'w500') }}
          style={dynamicStyles.image}
          resizeMode="cover"
        />
      </TouchableOpacity>
    </Animated.View>
  );
}

