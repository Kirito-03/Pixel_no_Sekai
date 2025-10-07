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
  const CARD_WIDTH = isSmallScreen ? width * 0.28 : 150;
  
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      friction: 3,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.9,
      useNativeDriver: true,
      friction: 3,
    }).start();
  };

  const dynamicStyles = {
    card: {
      width: CARD_WIDTH,
      marginRight: isSmallScreen ? 6 : 8,
      cursor: 'pointer' as const,
    },
    image: {
      width: CARD_WIDTH,
      height: CARD_WIDTH * 1.5,
      borderRadius: isSmallScreen ? 3 : 4,
    },
  };

  return (
    <TouchableOpacity 
      style={dynamicStyles.card} 
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={1}
    >
      <Animated.Image
        source={{ uri: getImageUrl(movie.poster_path, 'w500') }}
        style={[
          dynamicStyles.image,
          {
            transform: [{ scale: scaleAnim }],
          },
        ]}
        resizeMode="cover"
      />
    </TouchableOpacity>
  );
}

