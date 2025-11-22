import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Dimensions,
  Animated,
  FlatList,
  Modal,
  useWindowDimensions,
  RefreshControl,
  Alert,
  Pressable,
  Linking,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import { ContentItem, MovieDetail, TVShowDetail, AnimeDetail, Anime, StreamingInfo, AnimeEpisode, AnimeSeason } from '../types';
import { getImageUrl, getMovieDetails, getTVShowDetails, animeToContentItem, tmdbToContentItem, searchMovies, searchTVShows } from '../services/api';
import { getAnimeDetails, getSimilarAnime, getAnimeImageUrl, getAnimeTitle, getAnimeYear, getAnimeScore, getAnimeByGenre } from '../services/anilistService';
import { createMockStreamingInfo, getAnimeStreamingInfo } from '../services/animeStreamingService';
import { debugM3U, resetM3UCache } from '../services/m3uParser';
import databaseService from '../services/databaseService';
import { useProfile } from '../contexts/ProfileContext';
import { useMyList } from '../contexts/MyListContext';
import EpisodePlayer from './EpisodePlayer';

interface AnimeSeriesModalProps {
  content: ContentItem | null;
  visible: boolean;
  onClose: () => void;
  onPlayEpisode?: (episode: AnimeEpisode, season: AnimeSeason) => void;
}

export default function AnimeSeriesModal({
  content,
  visible,
  onClose,
  onPlayEpisode,
}: AnimeSeriesModalProps) {
  const [currentContent, setCurrentContent] = useState<ContentItem | null>(null);
  const [detailData, setDetailData] = useState<MovieDetail | TVShowDetail | AnimeDetail | null>(null);
  const [trailerKey, setTrailerKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  // Lista de contenido relacionado en formato unificado
  const [relatedContent, setRelatedContent] = useState<ContentItem[]>([]);
  const [loadingRelated, setLoadingRelated] = useState(false);
  const [showTrailer, setShowTrailer] = useState(false);
  const [trailerDelay, setTrailerDelay] = useState(false);
  const [trailerFinished, setTrailerFinished] = useState(false);
  
  // Streaming states
  const [streamingInfo, setStreamingInfo] = useState<StreamingInfo | null>(null);
  const [loadingStreaming, setLoadingStreaming] = useState(false);
  const [showEpisodePlayer, setShowEpisodePlayer] = useState(false);
  const [selectedEpisode, setSelectedEpisode] = useState<AnimeEpisode | null>(null);
  const [selectedSeason, setSelectedSeason] = useState<AnimeSeason | null>(null);
  const [currentEpisodeIndex, setCurrentEpisodeIndex] = useState(0);
  const [showSeasonPicker, setShowSeasonPicker] = useState(false);
  const [isTogglingMyList, setIsTogglingMyList] = useState(false);
  const [isTogglingDownloads, setIsTogglingDownloads] = useState(false);
  const [currentInDownloads, setCurrentInDownloads] = useState(false);
  
  // Logs de depuración eliminados para mantener el código limpio y sin emojis
  
  const { currentProfile } = useProfile();
  const { isInMyList, toggleMyList } = useMyList();
  
  const { width, height } = useWindowDimensions();
  const isSmallScreen = width < 768;
  const [refreshing, setRefreshing] = useState(false);
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(height)).current;

  // Verificar si el contenido actual está en Mi Lista
  // Normalizar el tipo según la fuente para la verificación de Mi Lista
  const normalizedTypeForCurrentContent: 'movie' | 'tv' | 'anime' = currentContent
    ? (currentContent.source === 'anilist'
        ? 'anime'
        : currentContent.source === 'tmdb'
          ? (currentContent.type === 'tv' ? 'tv' : 'movie')
          : currentContent.type)
    : 'movie';
  const currentInMyList = currentContent ? isInMyList(currentContent.id, normalizedTypeForCurrentContent) : false;

  useEffect(() => {
    if (content) {
      setCurrentContent(content);
    }
  }, [content]);

  useEffect(() => {
    if (visible && currentContent) {
      // Animación de entrada estilo Netflix
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start();
      
      // Cargar detalles del contenido
      loadContentDetails();
      loadRelatedContent();
      
      if (currentContent.type === 'anime') {
        console.log('Loading streaming info for anime');
        loadStreamingInfo();
      }

      // Verificar estado de Descargas al abrir
      if (currentProfile && currentContent) {
        databaseService.isInDownloads(currentProfile.id, currentContent.id, 'anime')
          .then(setCurrentInDownloads)
          .catch(() => setCurrentInDownloads(false));
      }
      
      return () => {
        if (!visible) {
          setTrailerDelay(false);
          setTrailerFinished(false);
        }
      };
    } else {
      // Reset animaciones y estado
      fadeAnim.setValue(0);
      slideAnim.setValue(height);
      setShowTrailer(false);
      setTrailerDelay(false);
      setTrailerFinished(false);
    }
  }, [visible, currentContent, trailerKey]);

  useEffect(() => {
    if (!visible) return;
    if (!currentContent) return;
    if (currentContent.type !== 'anime') return;
    if (!detailData) return;
    loadStreamingInfo();
  }, [detailData, visible, currentContent]);

  const loadContentDetails = async () => {
    if (!currentContent) return;
    
    console.log('Loading content details for:', currentContent);
    setLoading(true);
    try {
      let details;
      if (currentContent.type === 'movie') {
        details = await getMovieDetails(currentContent.id);
      } else if (currentContent.type === 'tv') {
        details = await getTVShowDetails(currentContent.id);
      } else if (currentContent.type === 'anime') {
        console.log('Loading anime details for ID:', currentContent.id);
        details = await getAnimeDetails(currentContent.id);
        console.log('Anime details loaded:', details);
      } else {
        details = await getMovieDetails(currentContent.id);
      }
      
      setDetailData(details);
      
      // Extraer trailer
      let trailer = null as any;
      let anyVideo = null as any;
      
      if (currentContent.type === 'anime' && 'trailer' in details && (details as AnimeDetail).trailer) {
        const t = (details as AnimeDetail).trailer;
        if (t && t.site && t.site.toLowerCase() === 'youtube' && t.id) {
          setTrailerKey(String(t.id));
        } else {
          setTrailerKey(null);
        }
      } else if ('videos' in details && (details as any).videos) {
        trailer = (details as any).videos.results.find(
          (video: any) => video.type === 'Trailer' && video.site === 'YouTube'
        );
        
        anyVideo = (details as any).videos.results.find(
          (video: any) => video.site === 'YouTube'
        );
        
        if (trailer) {
          setTrailerKey(trailer.key);
        } else if (anyVideo) {
          setTrailerKey(anyVideo.key);
        } else {
          setTrailerKey(null);
        }
      } else {
        setTrailerKey(null);
      }
    } catch (error) {
      console.error('Error loading content details:', error);
      setTrailerKey(null);
    } finally {
      setLoading(false);
    }
  };

  const loadStreamingInfo = async () => {
    if (!currentContent || currentContent.type !== 'anime') return;
    
    console.log('Starting to load streaming info for:', currentContent.title);
    
    // DEBUG: Verificar funcionamiento del M3U
    await debugM3U();
    
    setLoadingStreaming(true);
    try {
      const info = await getAnimeStreamingInfo(String(currentContent.id), currentContent.title);
      if (info && info.seasons && info.seasons.length > 0) {
        let desc = '';
        const baseDesc = (detailData && 'description' in detailData
          ? (detailData as AnimeDetail).description || ''
          : currentContent.overview || '');
        const isSpanish = (text: string) => {
          const t = (text || '').toLowerCase();
          if (!t) return false;
          const marks = ['á','é','í','ó','ú','ñ'];
          const words = [' el ',' la ',' los ',' las ',' de ',' del ',' y ',' que ',' para ',' con '];
          const mCount = marks.reduce((c, m) => c + (t.includes(m) ? 1 : 0), 0);
          const wCount = words.reduce((c, w) => c + (t.includes(w) ? 1 : 0), 0);
          return mCount + wCount >= 3;
        };
        if (isSpanish(baseDesc)) {
          desc = baseDesc;
        } else {
          const q = currentContent.title || '';
          let alt: any = null;
          if (isAnimeMovie()) {
            const res = await searchMovies(q).catch(() => []);
            alt = Array.isArray(res) && res.length ? res[0] : null;
          } else {
            const res = await searchTVShows(q).catch(() => []);
            alt = Array.isArray(res) && res.length ? res[0] : null;
          }
          desc = (alt?.overview || baseDesc || '').toString();
        }
        const streamingInfo: StreamingInfo = {
          animeId: info.animeId,
          title: info.title,
          description: desc || info.description || currentContent.overview || '',
          image: info.image || currentContent.poster_path || '',
          genres: detailData?.genres?.map((g: any) => typeof g === 'string' ? g : g.name) || info.genres || [],
          status: detailData && 'status' in detailData ? (detailData as any).status : info.status || 'UNKNOWN',
          totalEpisodes: info.totalEpisodes,
          seasons: info.seasons
        };
        setStreamingInfo(streamingInfo);
        setSelectedSeason(streamingInfo.seasons[0]);
        console.log('Streaming info loaded via unified service');
        return;
      }
      const realEpisodeCount = detailData && 'episodes' in detailData ? (detailData as any).episodes : 12;
      const mockData = createMockStreamingInfo(currentContent.title, realEpisodeCount);
      setStreamingInfo(mockData);
      if (mockData.seasons.length > 0) {
        setSelectedSeason(mockData.seasons[0]);
      }
      
    } catch (error) {
    console.error('Error loading streaming data:', error);
      
      // Crear datos mock básicos para mostrar la interfaz
      const realEpisodeCount = detailData && 'episodes' in detailData ? (detailData as any).episodes : 12;
      const mockData = createMockStreamingInfo(currentContent.title, realEpisodeCount);
      setStreamingInfo(mockData);
      if (mockData.seasons.length > 0) {
        setSelectedSeason(mockData.seasons[0]);
      }
    } finally {
      setLoadingStreaming(false);
    }
  };

  const handleRefresh = async () => {
    if (!currentContent) return;
    setRefreshing(true);
    try {
      resetM3UCache();
      await Promise.all([
        // recargar detalles básicos y similares si aplica
        loadContentDetails(),
        loadStreamingInfo(),
      ]);
    } catch (e) {
      // noop, ya hay logs dentro
    } finally {
      setRefreshing(false);
    }
  };

  const loadRelatedContent = async () => {
    if (!currentContent) return;
    
    setLoadingRelated(true);
    try {
      let similar: any[] = [];
      let recommended: any[] = [];
      
      if (currentContent.type === 'movie') {
        try {
          const movieDetails = await getMovieDetails(currentContent.id);
          similar = [movieDetails];
          recommended = [];
        } catch (error) {
          console.log('Error loading movie related content, using fallback');
          similar = [];
          recommended = [];
        }
      } else if (currentContent.type === 'tv') {
        try {
          const tvDetails = await getTVShowDetails(currentContent.id);
          similar = [tvDetails];
          recommended = [];
        } catch (error) {
          console.log('Error loading TV related content, using fallback');
          similar = [];
          recommended = [];
        }
      } else if (currentContent.type === 'anime') {
        try {
          console.log('Loading similar anime for ID:', currentContent.id);
          similar = await getSimilarAnime(currentContent.id);
          console.log('Similar anime loaded:', similar);
          
          if (isRealAnime()) {
            if (detailData && 'genres' in detailData && detailData.genres.length > 0) {
              const firstGenre = detailData.genres[0];
              const genreName = typeof firstGenre === 'string' ? firstGenre : firstGenre.name;
              const genreAnime = await getAnimeByGenre(genreName, 1, 5);
              recommended = genreAnime.filter(anime => anime.id !== currentContent.id);
            } else {
              recommended = [];
            }
          } else {
            if (detailData && 'genres' in detailData && detailData.genres.length > 0) {
              const firstGenre = detailData.genres[0];
              const genreName = typeof firstGenre === 'string' ? firstGenre : firstGenre.name;
              const genreAnime = await getAnimeByGenre(genreName, 1, 5);
              recommended = genreAnime.filter(anime => 
                anime.id !== currentContent.id && 
                anime.format === 'MOVIE'
              );
            } else {
              recommended = [];
            }
          }
        } catch (error) {
          console.log('Error loading anime related content:', error);
          similar = [];
          recommended = [];
        }
      } else {
        similar = [];
        recommended = [];
      }
      
      const combined = [...similar, ...recommended];
      const unique = combined.filter((item, index, self) => index === self.findIndex(t => t.id === item.id));

      // Mapear a ContentItem unificado según el tipo
      let mapped: ContentItem[] = [];
      if (currentContent.type === 'anime') {
        mapped = unique.map((anime: Anime) => animeToContentItem(anime));
      } else if (currentContent.type === 'movie') {
        mapped = unique.map((movie: any) => tmdbToContentItem(movie as any, 'movie'));
      } else if (currentContent.type === 'tv') {
        mapped = unique.map((show: any) => tmdbToContentItem(show as any, 'tv'));
      }

      setRelatedContent(mapped.slice(0, 20));
    } catch (error) {
      console.error('Error loading related content:', error);
      setRelatedContent([]);
    } finally {
      setLoadingRelated(false);
    }
  };

  // Episode handling functions
  const handlePlayEpisode = (episode: AnimeEpisode, season: AnimeSeason) => {
    console.log('Playing episode:', episode.title, 'from season:', season.title);
    console.log('Episode ID:', episode.id, 'Season ID:', season.id);
    
    if (onPlayEpisode) {
      console.log('Using external onPlayEpisode handler');
      onPlayEpisode(episode, season);
    } else {
      console.log('Using internal episode handling (fallback)');
      // Fallback para compatibilidad
      setSelectedEpisode(episode);
      setSelectedSeason(season);
      setCurrentEpisodeIndex(season.episodes.findIndex(ep => ep.id === episode.id));
      setShowEpisodePlayer(true);
    }
  };

  const handleNextEpisode = () => {
    if (!selectedSeason || currentEpisodeIndex >= selectedSeason.episodes.length - 1) return;
    
    const nextIndex = currentEpisodeIndex + 1;
    const nextEpisode = selectedSeason.episodes[nextIndex];
    setCurrentEpisodeIndex(nextIndex);
    setSelectedEpisode(nextEpisode);
  };

  const handlePreviousEpisode = () => {
    if (!selectedSeason || currentEpisodeIndex <= 0) return;
    
    const prevIndex = currentEpisodeIndex - 1;
    const prevEpisode = selectedSeason.episodes[prevIndex];
    setCurrentEpisodeIndex(prevIndex);
    setSelectedEpisode(prevEpisode);
  };

  const handleCloseEpisodePlayer = () => {
    console.log('Closing episode player');
    setShowEpisodePlayer(false);
    setSelectedEpisode(null);
    setSelectedSeason(null);
    setCurrentEpisodeIndex(0);
    console.log('Episode player closed and state cleared');
  };

  // Ver ahora: series -> primer episodio; películas -> abrir trailer si existe
  const handleWatchNow = () => {
    // Series de anime: reproducir primer episodio de la primera temporada
    if (
      currentContent?.type === 'anime' &&
      streamingInfo &&
      streamingInfo &&
      Array.isArray(streamingInfo.seasons) &&
      streamingInfo.seasons.length > 0
    ) {
      const firstSeason = streamingInfo.seasons[0];
      const firstEpisode = firstSeason?.episodes?.[0];
      if (firstEpisode) {
        handlePlayEpisode(firstEpisode, firstSeason);
        return;
      }
    }

    // Películas de anime: abrir trailer si está disponible
    if (currentContent?.type === 'anime' && isAnimeMovie()) {
      if (trailerKey) {
        openExternalTrailer(trailerKey);
        return;
      }
      Alert.alert('Sin trailer', 'No hay trailer disponible para esta película de anime.');
      return;
    }

    Alert.alert('Contenido no disponible', 'No hay episodios disponibles para reproducir.');
  };

  const handlePlayTrailer = () => {
    if (!trailerKey) {
      Alert.alert('Sin trailer', 'No hay trailer disponible para este título.');
      return;
    }
    setTrailerFinished(false);
    setTrailerDelay(true);
  };

  const handleCloseTrailer = () => {
    setTrailerDelay(false);
    setTrailerFinished(true);
  };

  const handleToggleList = async () => {
    if (!currentContent) return;
    if (!currentProfile) {
      Alert.alert('Perfil requerido', 'Selecciona un perfil para usar Mi Lista.');
      return;
    }

    if (isTogglingMyList) return;
    setIsTogglingMyList(true);
    try {
      // Normalizar el tipo según la fuente para evitar IDs inconsistentes (TMDB vs AniList)
      const normalizedType: 'movie' | 'tv' | 'anime' =
        currentContent.source === 'anilist' ? 'anime' :
        currentContent.source === 'tmdb' ? (currentContent.type === 'tv' ? 'tv' : 'movie') :
        currentContent.type;
      console.log('AnimeSeriesModal: toggleMyList with', { id: currentContent.id, type: currentContent.type, source: currentContent.source, normalizedType });
      await toggleMyList(currentContent.id, normalizedType);
    } catch (error) {
      console.error('Error toggling mi lista:', error);
      Alert.alert('Error', 'No se pudo actualizar Mi Lista. Verifica tu conexión al servidor.');
    } finally {
      setIsTogglingMyList(false);
    }
  };

  // Descargas
  const handleRemoveFromDownloads = async () => {
    if (!currentContent) return;
    if (!currentProfile) {
      Alert.alert('Perfil requerido', 'Selecciona un perfil para gestionar Descargas.');
      return;
    }
    if (isTogglingDownloads) return;
    setIsTogglingDownloads(true);
    try {
      await databaseService.removeFromDownloads(currentProfile.id, currentContent.id, 'anime');
      setCurrentInDownloads(false);
    } catch (error) {
      Alert.alert('Error', 'No se pudo quitar de Descargas.');
    } finally {
      setIsTogglingDownloads(false);
    }
  };

  const handleDownloadOptions = async () => {
    if (!currentContent) return;
    if (!currentProfile) {
      Alert.alert('Perfil requerido', 'Selecciona un perfil para gestionar Descargas.');
      return;
    }
    if (isTogglingDownloads) return;
    setIsTogglingDownloads(true);
    try {
      // Preferir temporada seleccionada; si no, agregar anime completo
      if (selectedSeason) {
        const episodes = selectedSeason.episodes.map(ep => ({ episode_number: ep.number, name: ep.title }));
        await databaseService.addAnimeSeasonToDownloads(
          currentProfile.id,
          currentContent.id,
          selectedSeason.season,
          episodes
        );
      } else if (streamingInfo && streamingInfo.seasons.length > 0) {
        const seasonsPayload = streamingInfo.seasons.map(s => ({
          season_number: s.season,
          episodes: s.episodes.map(ep => ({ episode_number: ep.number, name: ep.title }))
        }));
        await databaseService.addAnimeToDownloads(currentProfile.id, currentContent.id, seasonsPayload as any);
      } else {
        Alert.alert('Sin episodios', 'No hay información de temporadas/episodios para descargar.');
        return;
      }
      setCurrentInDownloads(true);
    } catch (error) {
      Alert.alert('Error', 'No se pudo agregar a Descargas.');
    } finally {
      setIsTogglingDownloads(false);
    }
  };

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: height,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  };

  // Fallback para Web: abrir el trailer directamente en YouTube si el iframe falla
  const openExternalTrailer = (key?: string | null) => {
    if (!key) return;
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      try {
        window.open(`https://www.youtube.com/watch?v=${key}`, '_blank');
      } catch (e) {
        
      }
    } else {
      try {
        Linking.openURL(`https://www.youtube.com/watch?v=${key}`);
      } catch (e) {
        
      }
    }
  };

  const getTitle = () => {
    if (detailData) {
      if ('title' in detailData && typeof detailData.title === 'object') {
        return getAnimeTitle(detailData.title as any) || currentContent?.title || 'Sin título';
      }
      if ('title' in detailData) {
        return detailData.title || currentContent?.title || 'Sin título';
      }
      if ('name' in detailData) {
        return detailData.name || currentContent?.title || 'Sin título';
      }
    }
    return currentContent?.title || 'Sin título';
  };

  const getReleaseDate = () => {
    if (detailData) {
      if ('startDate' in detailData && detailData.startDate) {
        const { year, month, day } = detailData.startDate as any;
        if (year) {
          return `${year}-${month?.toString().padStart(2, '0') || '01'}-${day?.toString().padStart(2, '0') || '01'}`;
        }
      }
      if ('release_date' in detailData) {
        return detailData.release_date || '';
      }
      if ('first_air_date' in detailData) {
        return detailData.first_air_date || '';
      }
    }
    return currentContent?.release_date || '';
  };

  const getRuntime = () => {
    if (detailData) {
      if ('duration' in detailData && detailData.duration) {
        return detailData.duration;
      }
      if ('runtime' in detailData) {
        return detailData.runtime || 0;
      }
    }
    return 0;
  };

  const getAgeRating = () => {
    if (detailData && 'adult' in detailData) {
      return detailData.adult ? 'R' : 'PG';
    }
    return 'PG';
  };

  // Función para determinar si es realmente un anime (no película)
  const isRealAnime = (): boolean => {
    if (!currentContent || currentContent.type !== 'anime') return false;
    
    if (!detailData) return false;
    
    if ('format' in detailData) {
      const format = (detailData as AnimeDetail).format;
      if (format === 'MOVIE') {
        console.log('Detected as anime movie, not series');
        return false;
      }
      return ['TV', 'OVA', 'ONA', 'SPECIAL', 'TV_SHORT'].includes(format);
    }
    
    if ('episodes' in detailData) {
      const episodes = (detailData as any).episodes;
      return episodes !== null && episodes !== undefined && episodes > 1;
    }
    
    return false;
  };

  // Detectar si es una PELÍCULA de anime (AniList format === 'MOVIE')
  const isAnimeMovie = (): boolean => {
    if (!currentContent || currentContent.type !== 'anime') return false;
    if (!detailData) return false;
    if ('format' in detailData) {
      return (detailData as AnimeDetail).format === 'MOVIE';
    }
    return false;
  };

  // Función para limpiar HTML de las descripciones
  const cleanDescription = (description: string): string => {
    if (!description) return '';
    
    return description
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .trim();
  };

  const formatRuntime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}min` : `${mins}min`;
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'No disponible';
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (!visible || !currentContent) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
    >
      <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
        <StatusBar style="light" translucent />
        
        <View style={styles.content}>
          {/* Botón cerrar estilo Netflix */}
          {!(trailerDelay && trailerKey && !trailerFinished) && (
            <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
              <Ionicons name="close" size={28} color="#FFFFFF" />
            </TouchableOpacity>
          )}

          <ScrollView 
            showsVerticalScrollIndicator={false} 
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            bounces={true}
            scrollEventThrottle={16}
            nestedScrollEnabled={true}
            keyboardShouldPersistTaps="handled"
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor="#E50914"
                colors={["#E50914"]}
              />
            }
          >
            {/* Hero Section con backdrop */}
            <View style={styles.heroSection}>
              {/* Imagen de fondo o trailer */}
              {trailerDelay && trailerKey && !trailerFinished ? (
                <View style={styles.trailerBackground}>
                  <TouchableOpacity style={styles.trailerCloseButton} onPress={handleCloseTrailer}>
                    <Ionicons name="close" size={20} color="#FFFFFF" />
                    <Text style={styles.trailerCloseText}>Cerrar</Text>
                  </TouchableOpacity>
                  {Platform.OS === 'web' ? (
                    <iframe
                      style={{
                        width: '100%',
                        height: '100%',
                        border: 'none',
                        position: 'absolute',
                        top: 0,
                        left: 0,
                      }}
                      src={`https://www.youtube-nocookie.com/embed/${trailerKey}?autoplay=1&controls=0&modestbranding=1&loop=0&playlist=${trailerKey}&rel=0&showinfo=0&mute=1&playsinline=1`}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      onError={() => {
                        setTrailerDelay(false);
                        setTrailerFinished(true);
                        openExternalTrailer(trailerKey);
                      }}
                      onLoad={() => {
                        setTimeout(() => {
                          setTrailerDelay(false);
                          setTrailerFinished(true);
                        }, 8000);
                      }}
                    />
                  ) : (
                    <WebView
                      style={styles.trailerBackgroundVideo}
                      source={{
                        uri: `https://www.youtube-nocookie.com/embed/${trailerKey}?autoplay=1&controls=0&modestbranding=1&loop=0&playlist=${trailerKey}&rel=0&showinfo=0&mute=1&playsinline=1`,
                      }}
                      allowsFullscreenVideo
                      javaScriptEnabled
                      domStorageEnabled
                      mediaPlaybackRequiresUserAction={false}
                      scalesPageToFit={true}
                      onError={() => {
                        setTrailerDelay(false);
                        setTrailerFinished(true);
                        openExternalTrailer(trailerKey);
                      }}
                      onLoadEnd={() => {
                        setTimeout(() => {
                          setTrailerDelay(false);
                          setTrailerFinished(true);
                        }, 120000);
                      }}
                    />
                  )}
                </View>
              ) : (
                <>
                  {currentContent?.backdrop_path && (
                    <Image
                      source={{ 
                        uri: currentContent.type === 'anime' 
                          ? getAnimeImageUrl(currentContent.backdrop_path) 
                          : getImageUrl(currentContent.backdrop_path, 'original') 
                      }}
                      style={styles.backdropImage}
                      resizeMode="cover"
                    />
                  )}
                  <View style={styles.backdropOverlay} />
                </>
              )}
              
              {/* Contenido sobre el backdrop - se oculta durante el trailer */}
              {!trailerDelay && (
                <View style={styles.heroContent}>
                  <View style={[styles.heroInfo, { maxWidth: isSmallScreen ? '90%' : '85%' }]}>
                    <Text style={[styles.heroTitle, { fontSize: isSmallScreen ? 20 : 24 }]}>{String(getTitle())}</Text>
                    
                    {/* Metadata en línea horizontal */}
                    <View style={styles.heroMetadata}>
                      {getReleaseDate() && (
                        <Text style={styles.heroYear}>
                          {new Date(getReleaseDate()).getFullYear()}
                        </Text>
                      )}
                      {getReleaseDate() && getRuntime() !== 0 && (
                        <Text style={styles.heroSeparator}>•</Text>
                      )}
                      {getRuntime() !== 0 && (
                        <Text style={styles.heroRuntime}>
                          {formatRuntime(getRuntime())}
                        </Text>
                      )}
                      {(getReleaseDate() || getRuntime() !== 0) && getAgeRating() && (
                        <Text style={styles.heroSeparator}>•</Text>
                      )}
                      {getAgeRating() && (
                        <Text style={styles.heroAgeRating}>{getAgeRating()}</Text>
                      )}
                      {(getReleaseDate() || getRuntime() !== 0 || getAgeRating()) && (
                        <Text style={styles.heroSeparator}>•</Text>
                      )}
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Ionicons name="star" size={16} color="#FFD700" />
                        <Text style={[styles.heroRating, { marginLeft: 4 }]}> {currentContent?.vote_average.toFixed(1)}</Text>
                      </View>
                    </View>

                    {/* Botón Ver ahora arriba (series y películas de anime) */}
                    {currentContent?.type === 'anime' && (isRealAnime() || isAnimeMovie()) && (
                      <View style={styles.actionButtons}>
                        <TouchableOpacity style={styles.playButton} onPress={handleWatchNow}>
                          <Ionicons name="play" size={20} color="#000" />
                          <Text style={styles.playButtonText}>Ver ahora</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.trailerButton} onPress={handlePlayTrailer} disabled={!trailerKey}>
                          <Ionicons name="play-circle" size={20} color="#FFFFFF" />
                          <Text style={styles.trailerButtonText}>Ver trailer</Text>
                        </TouchableOpacity>
                      </View>
                    )}

                    {/* Descripción después de los botones */}
                    <Text style={styles.heroOverview} numberOfLines={6}>
                      {cleanDescription(
                        currentContent?.type === 'anime' && detailData && 'description' in detailData
                          ? (detailData as AnimeDetail).description || currentContent?.overview || 'Sin descripción disponible'
                          : currentContent?.overview || 'Sin descripción disponible'
                      )}
                    </Text>
                  </View>
                </View>
              )}
            </View>

            {/* Información detallada - Solo lo esencial como Netflix */}
            <View style={styles.detailsSection}>
              {/* Estado del anime mejorado */}
              {currentContent?.type === 'anime' && detailData && 'status' in detailData && (
                <View style={styles.animeStatusContainer}>
                  <View style={styles.statusHeader}>
                    <Text style={styles.statusLabel}>Estado:</Text>
                    <View style={[
                      styles.statusBadge,
                      (detailData as AnimeDetail).status === 'RELEASING' && styles.statusBadgeAiring,
                      (detailData as AnimeDetail).status === 'FINISHED' && styles.statusBadgeFinished
                    ]}>
                      <Text style={[
                        styles.statusText,
                        (detailData as AnimeDetail).status === 'RELEASING' && styles.statusTextAiring,
                        (detailData as AnimeDetail).status === 'FINISHED' && styles.statusTextFinished
                      ]}>
                        {(detailData as AnimeDetail).status === 'RELEASING' ? 'En Emisión' :
                         (detailData as AnimeDetail).status === 'FINISHED' ? 'Completado' :
                         (detailData as AnimeDetail).status === 'NOT_YET_RELEASED' ? 'Próximamente' :
                         (detailData as AnimeDetail).status || 'Desconocido'}
                      </Text>
                    </View>
                  </View>
                </View>
              )}

              {/* Información compacta en una sola fila */}
              <View style={styles.compactInfoRow}>
                {/* Géneros */}
                {detailData?.genres && detailData.genres.length > 0 && (
                  <View style={styles.compactInfoItem}>
                    <Text style={styles.compactInfoLabel}>Géneros</Text>
                    <Text style={styles.compactInfoValue} numberOfLines={2}>
                      {detailData.genres.map(g => 
                        typeof g === 'string' ? g : g.name
                      ).slice(0, 3).join(', ')}
                    </Text>
                  </View>
                )}

                {/* Episodios para anime */}
                {currentContent?.type === 'anime' && detailData && 'episodes' in detailData && isRealAnime() && (
                  <View style={styles.compactInfoItem}>
                    <Text style={styles.compactInfoLabel}>Episodios</Text>
                    <Text style={styles.compactInfoValue}>
                      {(detailData as AnimeDetail).episodes || 'En emisión'}
                    </Text>
                  </View>
                )}

                {/* Formato del anime */}
                {currentContent?.type === 'anime' && detailData && 'format' in detailData && (
                  <View style={styles.compactInfoItem}>
                    <Text style={styles.compactInfoLabel}>Formato</Text>
                    <Text style={styles.compactInfoValue}>
                      {(detailData as AnimeDetail).format || 'Desconocido'}
                    </Text>
                  </View>
                )}
              </View>

              {/* Botones de acción específicos para películas eliminados para evitar duplicados */}

              {/* Streaming Episodes for Anime - mostrar si hay datos del M3U */}
              {currentContent?.type === 'anime' && streamingInfo && Array.isArray(streamingInfo.seasons) && streamingInfo.seasons.length > 0 && (
                <View style={styles.streamingSection}>
                  <View style={styles.streamingHeader}>
                    <Text style={styles.streamingTitle}>Episodios</Text>
                    {detailData && 'status' in detailData && (
                      <Text style={styles.streamingSubtitle}>
                        {(detailData as AnimeDetail).status === 'RELEASING' ? 'Nuevos episodios cada semana' :
                         (detailData as AnimeDetail).status === 'FINISHED' ? 'Serie completada' :
                         'Próximamente'}
                      </Text>
                    )}
                  </View>

                  {/* Botones de acción: Mi Lista y Descargas arriba de las temporadas */}
                  <View style={styles.actionButtons}>
                    <TouchableOpacity 
                      style={[styles.myListButton, isTogglingMyList && { opacity: 0.6 }]}
                      onPress={handleToggleList}
                      disabled={isTogglingMyList}
                    >
                      {isTogglingMyList ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Ionicons 
                          name={currentInMyList ? "checkmark" : "add"} 
                          size={20} 
                          color="#FFFFFF" 
                        />
                      )}
                      <Text style={styles.myListButtonText}>
                        {isTogglingMyList ? "Procesando..." : (currentInMyList ? "En mi lista" : "Mi lista")}
                      </Text>
                    </TouchableOpacity>

                    {/* Botón de Descargas */}
                    <TouchableOpacity 
                      style={[styles.downloadButton, (isTogglingDownloads || isAnimeMovie()) && { opacity: 0.6 }]}
                      onPress={() => currentInDownloads ? handleRemoveFromDownloads() : handleDownloadOptions()}
                      disabled={isTogglingDownloads || isAnimeMovie()}
                    >
                      {isTogglingDownloads ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Ionicons 
                          name={currentInDownloads ? "cloud-download" : "download-outline"}
                          size={20} 
                          color="#FFFFFF" 
                        />
                      )}
                      <Text style={styles.downloadButtonText}>
                        {isTogglingDownloads 
                          ? "Procesando..." 
                          : isAnimeMovie() 
                            ? "No disponible" 
                            : (currentInDownloads ? "En descargas" : "Descargar")}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  
                  {loadingStreaming ? (
                    <View style={styles.streamingLoading}>
                      <ActivityIndicator size="small" color="#E50914" />
                      <Text style={styles.streamingLoadingText}>Cargando episodios...</Text>
                    </View>
                  ) : streamingInfo && streamingInfo.seasons.length > 0 ? (
                    <View style={styles.seasonsContainer}>
                      {streamingInfo.seasons.length > 1 && (
                        <View style={styles.seasonPicker}>
                          <TouchableOpacity
                            style={styles.seasonPickerButton}
                            onPress={() => setShowSeasonPicker(true)}
                          >
                            <Text style={styles.seasonPickerButtonText}>
                              {selectedSeason?.title || streamingInfo.seasons[0].title}
                            </Text>
                            <Ionicons name={showSeasonPicker ? 'chevron-up' : 'chevron-down'} size={16} color="#FFFFFF" />
                          </TouchableOpacity>
                          {/* Lista movida a Modal para evitar problemas de transparencia y z-index */}
                        </View>
                      )}

                      {selectedSeason && (
                        <View style={styles.seasonContainer}>
                          <View style={styles.streamingSeasonHeader}>
                            <Text style={styles.streamingSeasonTitle}>{selectedSeason.title}</Text>
                            <Text style={styles.seasonEpisodeCount}>
                              {(() => {
                                let episodesToShow = selectedSeason.episodes;
                                if (detailData && 'status' in detailData) {
                                  const animeStatus = (detailData as AnimeDetail).status;
                                  if (animeStatus === 'RELEASING') {
                                    episodesToShow = selectedSeason.episodes.filter(ep => ep.number <= (selectedSeason.episodes.length || 0));
                                  }
                                }
                                return episodesToShow.length;
                              })()} episodios
                            </Text>
                          </View>

                          <View style={styles.episodesGrid}>
                            {(() => {
                              let episodesToShow = selectedSeason.episodes;
                              if (detailData && 'status' in detailData) {
                                const animeStatus = (detailData as AnimeDetail).status;
                                if (animeStatus === 'RELEASING') {
                                  episodesToShow = selectedSeason.episodes.filter(ep => ep.number <= (selectedSeason.episodes.length || 0));
                                }
                              }
                              return episodesToShow.map((episode) => (
                                <TouchableOpacity
                                  key={episode.id}
                                  style={styles.episodeCard}
                                  onPress={() => handlePlayEpisode(episode, selectedSeason)}
                                >
                                  {episode.image ? (
                                    <Image
                                      source={{ uri: episode.image }}
                                      style={styles.episodeThumb}
                                      resizeMode="cover"
                                    />
                                  ) : (
                                    <View style={styles.episodeNumber}>
                                      <Text style={styles.episodeNumberText}>{episode.number}</Text>
                                    </View>
                                  )}
                                  <View style={styles.episodeInfo}>
                                    <Text style={styles.episodeTitle} numberOfLines={2}>
                                      {episode.title}
                                    </Text>
                                    {episode.description && (
                                      <Text style={styles.episodeDescription} numberOfLines={2}>
                                        {cleanDescription(episode.description)}
                                      </Text>
                                    )}
                                  </View>
                                  <View style={styles.episodePlayButton}>
                                    <Ionicons name="play-circle" size={24} color="#E50914" />
                                  </View>
                                </TouchableOpacity>
                              ));
                            })()}
                          </View>
                        </View>
                      )}
                    </View>
                  ) : (
                    <View style={styles.noEpisodesContainer}>
                      <Text style={styles.noEpisodesText}>
                        No se encontraron episodios para este anime
                      </Text>
                      <Text style={styles.noEpisodesSubtext}>
                        Intenta nuevamente o prueba con otro título
                      </Text>
                    </View>
                  )}
                </View>
              )}
              {currentContent?.type === 'anime' && (!streamingInfo || !Array.isArray(streamingInfo.seasons) || streamingInfo.seasons.length === 0) && (
                <View style={styles.streamingSection}>
                  <View style={styles.streamingHeader}>
                    <Text style={styles.streamingTitle}>Episodios</Text>
                  </View>
                  <View style={{ paddingHorizontal: 20, paddingVertical: 12 }}>
                    <Text style={{ color: '#b3b3b3', marginBottom: 12 }}>
                      No se pudieron cargar los episodios. Verifica tu conexión o la URL del M3U.
                    </Text>
                    <View style={styles.actionButtons}>
                      <TouchableOpacity style={styles.myListButton} onPress={handleRefresh}>
                        <Ionicons name="refresh" size={20} color="#FFFFFF" />
                        <Text style={styles.myListButtonText}>Reintentar</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              )}

              {/* Modal de selección de temporada para evitar transparencia/z-index issues */}
              {showSeasonPicker && (
                <Modal
                  visible={showSeasonPicker}
                  transparent
                  animationType="fade"
                  onRequestClose={() => setShowSeasonPicker(false)}
                >
                  <Pressable style={styles.seasonModalBackdrop} onPress={() => setShowSeasonPicker(false)}>
                    <Pressable style={styles.seasonModalContent} onPress={() => {}}>
                      <View style={styles.seasonModalHeader}>
                        <Text style={styles.seasonModalHeaderText}>Selecciona temporada</Text>
                      </View>
                      <ScrollView style={styles.seasonModalList}>
                        {streamingInfo?.seasons.map((season) => (
                          <TouchableOpacity
                            key={season.id}
                            style={styles.seasonPickerItem}
                            onPress={() => {
                              setSelectedSeason(season);
                              setShowSeasonPicker(false);
                            }}
                          >
                            <Text style={styles.seasonPickerItemText}>{season.title}</Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </Pressable>
                  </Pressable>
                </Modal>
              )}

              {/* Fecha de estreno */}
              {getReleaseDate() && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>
                    {currentContent?.type === 'movie' ? 'Estreno:' : 
                     currentContent?.type === 'tv' ? 'Primera emisión:' : 
                     currentContent?.type === 'anime' ? 'Estreno:' : 'Estreno:'}
                  </Text>
                  <Text style={styles.detailValue}>{formatDate(getReleaseDate())}</Text>
                </View>
              )}
            </View>

            {/* Contenido relacionado */}
            <View style={styles.relatedSection}>
                  <Text style={styles.relatedTitle}>
                    {currentContent?.type === 'movie' ? 'Más películas similares' :
                     currentContent?.type === 'tv' ? 'Más series similares' :
                     currentContent?.type === 'anime' && isRealAnime() ? 'Más anime similar' :
                     currentContent?.type === 'anime' ? 'Más películas de anime similares' :
                     'Más títulos similares'}
                  </Text>
                  
                  {loadingRelated ? (
                    <View style={styles.relatedLoading}>
                      <ActivityIndicator size="small" color="#E50914" />
                    </View>
                  ) : relatedContent.length > 0 ? (
                    <FlatList
                      data={relatedContent}
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      nestedScrollEnabled={true}
                      scrollEnabled={true}
                      decelerationRate="fast"
                      snapToAlignment="start"
                      snapToInterval={132}
                      disableIntervalMomentum={true}
                      keyExtractor={(item) => `${item.source}-${item.type}-${item.id}`}
                      renderItem={({ item }) => (
                        <TouchableOpacity
                          style={styles.relatedCard}
                          onPress={() => {
                            setCurrentContent(item);
                            setTrailerDelay(false);
                            setTrailerFinished(false);
                            loadContentDetails();
                            loadRelatedContent();
                          }}
                        >
                          <Image
                            source={{ uri: item.source === 'anilist' ? getAnimeImageUrl(item.poster_path) : getImageUrl(item.poster_path, 'w500') }}
                            style={styles.relatedPoster}
                            resizeMode="cover"
                          />
                        </TouchableOpacity>
                      )}
                      contentContainerStyle={{ paddingHorizontal: 20 }}
                    />
                  ) : (
                    <View style={styles.noRelatedContainer}>
                      <Text style={styles.noRelatedText}>
                        No hay contenido relacionado disponible
                      </Text>
                    </View>
                  )}
            </View>
          </ScrollView>
        </View>
      </Animated.View>

    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000000',
    zIndex: 1000,
  },
  content: {
    flex: 1,
    backgroundColor: '#000000',
    width: '100%',
    height: '100%',
    marginTop: 0,
    marginBottom: 0,
    paddingTop: 0,
    paddingBottom: 0,
  },
  closeButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  scrollView: {
    flex: 1,
    height: '100%',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 16,
  },
  heroSection: {
    height: 400, // Altura fija en lugar de porcentaje
    position: 'relative',
    justifyContent: 'flex-end',
    paddingBottom: 0,
  },
  trailerBackground: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  trailerBackgroundVideo: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
  },
  backdropImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  backdropOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  heroContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingBottom: 20,
    zIndex: 10,
  },
  heroInfo: {
    maxWidth: '85%',
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  heroMetadata: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  heroYear: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  heroSeparator: {
    color: '#FFFFFF',
    fontSize: 16,
    marginHorizontal: 8,
  },
  heroRuntime: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  heroAgeRating: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  heroRating: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  heroOverview: {
    color: '#FFFFFF',
    fontSize: 16,
    lineHeight: 26,
    marginTop: 0,
    marginBottom: 16,
    textShadowColor: 'rgba(0, 0, 0, 0.9)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    fontWeight: '400',
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 12,
    marginBottom: 16,
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 6,
    gap: 8,
  },
  playButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '600',
  },
  myListButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(109, 109, 110, 0.7)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 6,
    gap: 8,
  },
  myListButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(109, 109, 110, 0.7)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 6,
    gap: 8,
  },
  downloadButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  trailerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(109, 109, 110, 0.7)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 6,
    gap: 8,
  },
  trailerButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  trailerCloseButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    zIndex: 2,
  },
  trailerCloseText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  detailsSection: {
    padding: 20,
    backgroundColor: '#141414',
    marginTop: 0,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  detailLabel: {
    color: '#999999',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
    minWidth: 100,
  },
  detailValue: {
    color: '#FFFFFF',
    fontSize: 16,
    flex: 1,
  },
  relatedSection: {
    backgroundColor: '#141414',
    paddingVertical: 20,
  },
  relatedTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  relatedLoading: {
    justifyContent: 'center',
    alignItems: 'center',
    height: 200,
  },
  relatedCard: {
    marginRight: 12,
    borderRadius: 8,
    overflow: 'hidden',
  },
  relatedPoster: {
    width: 120,
    height: 180,
  },
  noRelatedContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    height: 200,
    paddingHorizontal: 20,
  },
  noRelatedText: {
    color: '#999999',
    fontSize: 16,
    textAlign: 'center',
  },
  // Streaming styles
  streamingSection: {
    marginTop: 20,
    paddingHorizontal: 20,
  },
  streamingHeader: {
    marginBottom: 16,
  },
  streamingTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  streamingSubtitle: {
    fontSize: 14,
    color: '#999999',
    fontStyle: 'italic',
  },
  streamingLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  streamingLoadingText: {
    color: '#FFFFFF',
    marginLeft: 8,
    fontSize: 14,
  },
  seasonsContainer: {
    marginBottom: 20,
  },
  seasonPicker: {
    marginBottom: 12,
    position: 'relative',
  },
  seasonPickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 6,
  },
  seasonPickerButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  seasonPickerList: {
    position: 'absolute',
    top: 44,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(34, 34, 34, 0.95)',
    borderRadius: 6,
    overflow: 'hidden',
    zIndex: 100,
    // Elevation for Android to ensure the list sits above other content
    elevation: 12,
    // Shadow for iOS/web for visual separation
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  seasonModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  seasonModalContent: {
    width: '90%',
    maxWidth: 420,
    backgroundColor: '#222',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
  },
  seasonModalHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  seasonModalHeaderText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  seasonModalList: {
    maxHeight: 360,
  },
  seasonPickerItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  seasonPickerItemText: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  seasonContainer: {
    marginBottom: 24,
  },
  streamingSeasonHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  streamingSeasonTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  seasonEpisodeCount: {
    fontSize: 14,
    color: '#999999',
  },
  episodesGrid: {
    gap: 8,
  },
  episodeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  episodeNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E50914',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  episodeNumberText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  episodeInfo: {
    flex: 1,
    marginRight: 12,
  },
  episodeThumb: {
    width: 72,
    height: 40,
    borderRadius: 6,
    marginRight: 12,
    backgroundColor: '#222'
  },
  episodeTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  episodeDescription: {
    color: '#999999',
    fontSize: 12,
    lineHeight: 16,
  },
  episodePlayButton: {
    padding: 4,
  },
  noEpisodesContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  noEpisodesText: {
    color: '#999999',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 8,
  },
  noEpisodesSubtext: {
    color: '#666666',
    fontSize: 12,
    textAlign: 'center',
  },
  // Estilos para el estado del anime
  animeStatusContainer: {
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusLabel: {
    fontSize: 16,
    color: '#999999',
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#333333',
  },
  statusBadgeAiring: {
    backgroundColor: '#ff4444',
  },
  statusBadgeFinished: {
    backgroundColor: '#44ff44',
  },
  statusText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  statusTextAiring: {
    color: '#FFFFFF',
  },
  statusTextFinished: {
    color: '#000000',
  },
  // Estilos para información compacta
  compactInfoRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  compactInfoItem: {
    flex: 1,
    minWidth: '30%',
    marginBottom: 12,
    paddingRight: 12,
  },
  compactInfoLabel: {
    fontSize: 12,
    color: '#999999',
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  compactInfoValue: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '500',
  },
});