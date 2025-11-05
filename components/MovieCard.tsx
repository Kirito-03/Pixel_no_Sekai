/**
 * Tarjeta de contenido (película/serie/anime).
 *
 * ¿Para qué es?
 * - Mostrar el póster del item con feedback al presionar y marcar si está en "Mi Lista".
 * - Reutilizable en grillas y filas (MovieRow), con tamaños responsivos.
 *
 * ¿Cómo funciona?
 * - Soporta fuentes TMDB y AniList: para TMDB usa getImageUrl; para AniList usa URL directa.
 * - Determina tipo e id para consultar MyListContext y mostrar el badge si corresponde.
 * - Aplica una animación de escala al press (spring) para mejorar la UX.
 */
import React, { useRef } from 'react';
import { 
  TouchableOpacity, 
  Image, 
  StyleSheet, 
  useWindowDimensions, 
  Animated,
  View,
} from 'react-native';
import { Movie, TVShow, ContentItem } from '../types';
import { getImageUrl } from '../services/api';
import { Ionicons } from '@expo/vector-icons';
import { useMyList } from '../contexts/MyListContext';

interface Props {
  movie: Movie | TVShow | ContentItem;
  onPress: () => void;
}

export default function MovieCard({ movie, onPress }: Props) {
  const { width } = useWindowDimensions();
  const isSmallScreen = width < 768;
  // Aumentamos el tamaño de las tarjetas para que se vean mejor
  const CARD_WIDTH = isSmallScreen ? width * 0.32 : 130;
  const CARD_HEIGHT = CARD_WIDTH * 1.5; // Relación de aspecto 2:3 para posters
  const { isInMyList } = useMyList();
  
  // Función para obtener la URL de la imagen según la fuente
  const getImageSource = () => {
    // Si es ContentItem (unificado)
    if ('source' in movie) {
      if (movie.source === 'anilist') {
        // Para AniList, usar la URL directa
        return movie.poster_path;
      } else {
        // Para TMDB, usar la función getImageUrl
        return getImageUrl(movie.poster_path, 'w500');
      }
    }
    // Si es Movie/TVShow (legacy), usar TMDB
    return getImageUrl(movie.poster_path, 'w500');
  };

  // Resolver id y tipo para el estado de Mi Lista
  const getIdAndType = () => {
    let id: number | string | undefined;
    let type: 'movie' | 'tv' | 'anime' = 'movie';
    if ('id' in movie) id = movie.id as any;
    if ('type' in movie) {
      type = (movie as any).type;
    } else {
      // Heurística: si tiene first_air_date -> tv; si no, movie
      type = (movie as any).first_air_date ? 'tv' : 'movie';
    }
    return { id, type };
  };

  const { id, type } = getIdAndType();
  const inMyList = id != null ? isInMyList(Number(id), type) : false;

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
          source={{ uri: getImageSource() }}
          style={dynamicStyles.image}
          resizeMode="cover"
        />
        {inMyList && (
          <View
            style={{
              position: 'absolute',
              top: 6,
              right: 6,
              backgroundColor: 'rgba(0,0,0,0.6)',
              borderRadius: 12,
              paddingHorizontal: 6,
              paddingVertical: 4,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <Ionicons name="checkmark" color="#00E676" size={14} />
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

