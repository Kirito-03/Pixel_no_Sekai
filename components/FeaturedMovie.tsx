import React, { useState } from 'react';
import { View, Image, Text, TouchableOpacity, StyleSheet, useWindowDimensions, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { MovieDetail, AnimeDetail } from '../types';
import { getImageUrl } from '../services/api';
import { getAnimeImageUrl, getAnimeTitle, getAnimeYear, getAnimeScore } from '../services/anilistService';
import { colors, spacing } from '../theme';
import { useProfile } from '../contexts/ProfileContext';
import { useMyList } from '../contexts/MyListContext';

const stripHtml = (html?: string) => html ? html.replace(/<[^>]*>/g, '') : '';

interface Props {
  movie: MovieDetail | AnimeDetail;
  onWatch: () => void;
  onAddList?: () => void;
}

export default function FeaturedMovie({ movie, onWatch, onAddList }: Props) {
  const { width, height } = useWindowDimensions();
  const isSmallScreen = width < 768;
  const { currentProfile } = useProfile();
  const { isInMyList, toggleMyList, addToMyList } = useMyList();
  const [isToggling, setIsToggling] = useState(false);

  const isAnime = !('release_date' in movie);
  const releaseYear = isAnime ? getAnimeYear((movie as AnimeDetail).startDate) : (movie.release_date ? new Date(movie.release_date).getFullYear() : '');
  const genres = isAnime ? ((movie as AnimeDetail).genres?.join(', ') || '') : (movie.genres ? movie.genres.map(g => g.name).join(', ') : '');
  const voteAverage = isAnime ? getAnimeScore((movie as AnimeDetail).averageScore).toFixed(1) : (movie.vote_average ? movie.vote_average.toFixed(1) : '0');
  const inMyList = isInMyList(movie.id, isAnime ? 'anime' : 'movie');

  const handleMyListPress = async () => {
    // Si el padre provee un handler específico, usarlo (para compatibilidad)
    if (onAddList) {
      return onAddList();
    }
    if (!currentProfile) {
      Alert.alert('Perfil requerido', 'Selecciona un perfil para usar Mi Lista.');
      return;
    }
    if (isToggling) return;
    setIsToggling(true);
    try {
      await toggleMyList(movie.id, isAnime ? 'anime' : 'movie');
    } catch (err) {
      console.error('FeaturedMovie: Error al actualizar Mi Lista', err);
      Alert.alert('Error', 'No se pudo actualizar Mi Lista.');
    } finally {
      setIsToggling(false);
    }
  };

  const dynamicStyles = {
    container: {
      width,
      height: isSmallScreen ? height * 0.75 : height * 0.95,
      marginTop: 0,
    },
    image: {
      width: '100%' as const,
      height: '100%' as const,
      position: 'absolute' as const,
    },
    gradientVertical: {
      width: '100%' as const,
      height: '100%' as const,
    },
    gradientHorizontal: {
      width: '100%' as const,
      height: '100%' as const,
      justifyContent: isSmallScreen ? ('flex-end' as const) : ('center' as const),
    },
    content: {
      paddingLeft: isSmallScreen ? 16 : 30,
      paddingRight: isSmallScreen ? 16 : 30,
      paddingBottom: isSmallScreen ? 60 : 100,
      paddingTop: isSmallScreen ? 40 : 70,
    },
    title: {
      fontSize: isSmallScreen ? 28 : 40,
      fontWeight: 'bold' as const,
      color: colors.text,
      marginBottom: isSmallScreen ? 8 : spacing.md,
    },
    info: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      marginTop: isSmallScreen ? 10 : 15,
      flexWrap: 'wrap' as const,
    },
    points: {
      fontSize: isSmallScreen ? 14 : 18,
      fontWeight: 'bold' as const,
      color: '#46d369',
      marginRight: isSmallScreen ? 10 : 15,
    },
    year: {
      fontSize: isSmallScreen ? 14 : 18,
      fontWeight: 'bold' as const,
      color: colors.text,
      marginRight: isSmallScreen ? 10 : 15,
    },
    seasons: {
      fontSize: isSmallScreen ? 14 : 18,
      fontWeight: 'bold' as const,
      color: colors.text,
      marginRight: isSmallScreen ? 10 : 15,
    },
    description: {
      marginTop: isSmallScreen ? 10 : 15,
      fontSize: isSmallScreen ? 13 : 17,
      color: '#999',
      lineHeight: isSmallScreen ? 20 : 24,
      maxWidth: '100%' as any,
    },
    buttons: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'flex-start' as const,
      marginTop: isSmallScreen ? 12 : 15,
      flexWrap: 'nowrap' as const,
    },
    watchButton: {
      backgroundColor: '#fff',
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      paddingVertical: isSmallScreen ? 10 : 15,
      paddingHorizontal: isSmallScreen ? 20 : 25,
      borderRadius: 5,
      marginRight: 10,
      marginBottom: isSmallScreen ? 8 : 0,
    },
    watchButtonText: {
      color: '#000',
      fontSize: isSmallScreen ? 16 : 20,
      fontWeight: 'bold' as const,
      marginLeft: 8,
    },
    myListButton: {
      backgroundColor: '#333',
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      paddingVertical: isSmallScreen ? 10 : 15,
      paddingHorizontal: isSmallScreen ? 20 : 25,
      borderRadius: 5,
      marginLeft: 10,
    },
    myListButtonText: {
      color: '#fff',
      fontSize: isSmallScreen ? 16 : 20,
      fontWeight: 'bold' as const,
      marginLeft: 8,
    },
    genres: {
      marginTop: isSmallScreen ? 10 : 15,
      fontSize: isSmallScreen ? 14 : 18,
      color: '#999',
    },
    genresBold: {
      fontWeight: 'bold' as const,
    },
  };

  return (
    <View style={dynamicStyles.container}>
      <Image
        source={{ uri: isAnime ? getAnimeImageUrl((movie as AnimeDetail).bannerImage || (movie as AnimeDetail).coverImage?.large) : getImageUrl(movie.backdrop_path, 'original') }}
        style={dynamicStyles.image}
      />
      
      {/* Gradiente vertical (de arriba hacia abajo) */}
      <LinearGradient
        colors={['transparent', 'rgba(17, 17, 17, 0.9)', '#111']}
        locations={[0, 0.7, 1]}
        style={dynamicStyles.gradientVertical}
      >
        {/* Gradiente horizontal (de izquierda a derecha) */}
        <LinearGradient
          colors={['rgba(17, 17, 17, 0.9)', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          locations={[0.3, 0.7]}
          style={dynamicStyles.gradientHorizontal}
        >
          <View style={dynamicStyles.content}>
            {/* Título */}
            <Text style={dynamicStyles.title}>{isAnime ? getAnimeTitle((movie as AnimeDetail).title) : movie.title}</Text>
            
            {/* Info: Puntos, Año, Duración */}
            <View style={dynamicStyles.info}>
              <Text style={dynamicStyles.points}>{voteAverage} puntos</Text>
              <Text style={dynamicStyles.year}>{releaseYear}</Text>
              {!isAnime && (movie as MovieDetail).runtime && (
                <Text style={dynamicStyles.seasons}>{(movie as MovieDetail).runtime} min</Text>
              )}
            </View>
            
            {/* Descripción */}
            <Text style={dynamicStyles.description} numberOfLines={5}>
              {isAnime ? stripHtml((movie as any).description) : stripHtml((movie as any).overview)}
            </Text>
            
            {/* Botones */}
            <View style={dynamicStyles.buttons}>
              <TouchableOpacity style={dynamicStyles.watchButton} onPress={onWatch}>
                <Ionicons name="play" size={16} color="#000" />
                <Text style={dynamicStyles.watchButtonText}>Ver ahora</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={[dynamicStyles.myListButton, isToggling && { opacity: 0.6 }]} onPress={handleMyListPress}>
                <Ionicons name={inMyList ? 'checkmark' : 'add'} size={16} color="#fff" />
                <Text style={dynamicStyles.myListButtonText}>
                  {isToggling ? 'Procesando...' : (inMyList ? 'En mi lista' : 'Mi lista')}
                </Text>
              </TouchableOpacity>
            </View>
            
            {/* Géneros */}
            {genres && (
              <Text style={dynamicStyles.genres}>
                <Text style={dynamicStyles.genresBold}>Gêneros: </Text>
                {genres}
              </Text>
            )}
          </View>
        </LinearGradient>
      </LinearGradient>
    </View>
  );
}

