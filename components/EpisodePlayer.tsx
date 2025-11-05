/**
 * Reproductor de episodios de anime.
 *
 * ¿Para qué es?
 * - Reproducir un episodio usando fuente directa (M3U) o fuentes obtenidas vía animeStreamingService.
 * - Ofrecer controles básicos (play/pause, siguiente/anterior), ocultar StatusBar y manejar errores.
 *
 * ¿Cómo funciona?
 * - Carga fuentes en mount o al cambiar de episodio: prioriza episode.url, luego getEpisodeSources; si no, usa videos de prueba.
 * - En web usa <video> nativo; en móvil usa WebView con HTML embebido.
 * - Mantiene estado de reproducción y visibilidad de controles; reacciona a eventos de fin para navegar al siguiente.
 */
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
  StatusBar,
  Platform,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { AnimeEpisode, VideoSource } from '../types';
import { getEpisodeSources, isHLSSource } from '../services/animeStreamingService';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface EpisodePlayerProps {
  episode: AnimeEpisode;
  animeTitle: string;
  onClose: () => void;
  onNextEpisode?: () => void;
  onPreviousEpisode?: () => void;
  hasNextEpisode?: boolean;
  hasPreviousEpisode?: boolean;
}

const EpisodePlayer: React.FC<EpisodePlayerProps> = ({
  episode,
  animeTitle,
  onClose,
  onNextEpisode,
  onPreviousEpisode,
  hasNextEpisode = false,
  hasPreviousEpisode = false,
}) => {
  console.log('EpisodePlayer rendering with episode:', episode.title);
  const [sources, setSources] = useState<VideoSource[]>([]);
  const [selectedSource, setSelectedSource] = useState<VideoSource | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showControls, setShowControls] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const webViewRef = useRef<WebView>(null);

  useEffect(() => {
    console.log('EpisodePlayer mounted for episode:', episode.id, episode.title);
    loadEpisodeSources();
  }, [episode.id]);

  // Ocultar la status bar durante la reproducción para maximizar el área de video
  useEffect(() => {
    try {
      StatusBar.setHidden(true, 'fade');
    } catch {}
    return () => {
      try {
        StatusBar.setHidden(false, 'fade');
      } catch {}
    };
  }, []);

  useEffect(() => {
    console.log('EpisodePlayer state changed - loading:', loading, 'error:', error);
  }, [loading, error]);

  const loadEpisodeSources = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Loading sources for episode:', episode.id);
      
      // Intentar primero con la API real
      // Si el episodio tiene URL directa (del M3U), usarla directamente
      if (episode.url) {
        console.log('Using direct episode URL from M3U:', episode.url);
        const directSources: VideoSource[] = [{
          url: episode.url
        }];
        setSources(directSources);
        setSelectedSource(directSources[0]);
        return;
      }
      
      try {
        // Extraer información del anime del título si está disponible
        const episodeSources = await getEpisodeSources(episode.id);
        console.log('Episode sources received:', episodeSources);
        
        if (episodeSources.length > 0) {
          setSources(episodeSources);
          setSelectedSource(episodeSources[0]); // Usar directamente la primera fuente
          console.log('Using episode sources:', episodeSources[0].url);
          return;
        }
      } catch (apiError) {
        console.log('API error, using fallback sources:', apiError);
      }
      
      // Si no hay fuentes reales, usar fuentes de video que funcionan
      console.log('No real sources found, checking if episode has URL');
      
      // Verificar si el episodio tiene una URL directa
      if (episode.url) {
        console.log('Found direct episode URL:', episode.url);
        const directSources: VideoSource[] = [{
          url: episode.url
        }];
        setSources(directSources);
        setSelectedSource(directSources[0]);
        return;
      }
      
      console.log('No direct URL found, using working video sources');
      
      // Videos de prueba más variados para simular diferentes episodios
      const testVideos = [
        'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
        'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
        'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
        'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
        'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
        'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
        'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4',
        'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
        'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
        'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/VolkswagenGTIReview.mp4',
      ];
      
      // Seleccionar un video basado en el número del episodio para máxima variedad
      const videoIndex = (episode.number - 1) % testVideos.length;
      const selectedTestVideo = testVideos[videoIndex];
      
      console.log(`Using test video ${videoIndex + 1}/${testVideos.length} for episode ${episode.number}:`, selectedTestVideo);
      
      const workingSources: VideoSource[] = [
        {
          url: selectedTestVideo
        }
      ];
      
      setSources(workingSources);
      setSelectedSource(workingSources[0]);
      console.log('Using test video:', selectedTestVideo);
      
    } catch (err) {
      console.error('Error loading episode sources:', err);
      setError('Error al cargar las fuentes del episodio');
    } finally {
      setLoading(false);
    }
  };

  const handleSourceChange = useCallback((source: VideoSource) => {
    setSelectedSource(source);
  }, []);

  const toggleControls = useCallback(() => {
    setShowControls(!showControls);
  }, [showControls]);

  const handlePlayPause = useCallback(() => {
    setIsPlaying(!isPlaying);
    // Send message to WebView to play/pause (for mobile)
    if (Platform.OS !== 'web') {
      webViewRef.current?.postMessage(JSON.stringify({ action: isPlaying ? 'pause' : 'play' }));
    }
    // For web, the video element will handle play/pause through its controls
  }, [isPlaying]);

  const renderVideoPlayer = useMemo(() => {
    console.log('Rendering video player with selectedSource:', selectedSource);
    
    if (!selectedSource) {
      console.log('No selected source, showing loading');
      return (
        <View style={styles.videoPlaceholder}>
          <ActivityIndicator size="large" color="#e50914" />
          <Text style={styles.placeholderText}>Cargando video...</Text>
        </View>
      );
    }

    // Usar la URL real del episodio si está disponible, sino usar la URL del source
    const videoUrl = selectedSource.url || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
    console.log('Using video URL:', videoUrl);
    
    // Para web, usar un elemento video HTML nativo
    if (Platform.OS === 'web') {
      return (
        <View style={styles.videoContainer}>
          <video
            ref={(ref) => {
              if (ref) {
                ref.addEventListener('play', () => setIsPlaying(true));
                ref.addEventListener('pause', () => setIsPlaying(false));
                ref.addEventListener('ended', () => {
                  setIsPlaying(false);
                  if (hasNextEpisode && onNextEpisode) {
                    onNextEpisode();
                  }
                });
                ref.addEventListener('error', (e) => {
                  console.error('Video error:', e);
                  setError('Error al reproducir el video');
                });
              }
            }}
            controls
            style={styles.webVideo}
            preload="metadata"
            playsInline
            webkit-playsinline="true"
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onEnded={() => {
              setIsPlaying(false);
              if (hasNextEpisode && onNextEpisode) {
                onNextEpisode();
              }
            }}
            onError={(e) => {
              console.error('Video error:', e);
              setError('Error al reproducir el video');
            }}
          >
            <source src={videoUrl} type="video/mp4" />
            <Text style={styles.placeholderText}>
              Tu navegador no soporta el elemento video.
            </Text>
          </video>
        </View>
      );
    }

    // Para móvil, usar WebView
    const safeVideoUrl = encodeURI(videoUrl);

    const videoHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              background: #000;
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
              font-family: Arial, sans-serif;
            }
            video {
              width: 100%;
              height: 100%;
              object-fit: contain;
              background: #000;
            }
            .video-info {
              position: absolute;
              top: 10px;
              left: 10px;
              color: white;
              background: rgba(0,0,0,0.7);
              padding: 10px;
              border-radius: 5px;
              font-size: 14px;
              z-index: 1000;
            }
            .loading {
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              color: white;
              font-size: 16px;
            }
          </style>
        </head>
        <body>
          <div class="video-info">
            Reproduciendo: ${episode.title}
          </div>
          <div class="loading" id="loading">Cargando video...</div>
          <video 
            id="videoPlayer" 
            controls 
            preload="metadata"
            playsinline
            webkit-playsinline
            style="display: none;"
          >
            <source src="${safeVideoUrl}" type="video/mp4" />
            <p style="color: white; text-align: center; padding: 20px;">
              Tu navegador no soporta el elemento video.
            </p>
          </video>
          
          <script>
            const video = document.getElementById('videoPlayer');
            const loading = document.getElementById('loading');
            
            console.log('Video element:', video);
            
            // Show video when loaded
            video.addEventListener('loadeddata', function() {
              console.log('Video loaded, showing player');
              loading.style.display = 'none';
              video.style.display = 'block';
            });
            
            // Handle messages from React Native
            window.addEventListener('message', function(event) {
              try {
                const data = JSON.parse(event.data);
                console.log('Received message:', data);
                if (data.action === 'play') {
                  video.play().catch(e => console.log('Play error:', e));
                } else if (data.action === 'pause') {
                  video.pause();
                }
              } catch (e) {
                console.log('Message parsing error:', e);
              }
            });
            
            // Video event listeners
            video.addEventListener('play', function() {
              console.log('Video playing');
              window.ReactNativeWebView?.postMessage(JSON.stringify({ action: 'playing' }));
            });
            
            video.addEventListener('pause', function() {
              console.log('Video paused');
              window.ReactNativeWebView?.postMessage(JSON.stringify({ action: 'paused' }));
            });
            
            video.addEventListener('ended', function() {
              console.log('Video ended');
              window.ReactNativeWebView?.postMessage(JSON.stringify({ action: 'ended' }));
            });
            
            video.addEventListener('error', function(e) {
              console.log('Video error:', e);
              loading.innerHTML = 'Error al cargar el video';
              window.ReactNativeWebView?.postMessage(JSON.stringify({ 
                action: 'error', 
                error: e.target.error?.message || 'Error desconocido' 
              }));
            });
            
            // Load the video when ready
            setTimeout(() => {
              console.log('Loading video...');
              video.load();
            }, 500);
          </script>
        </body>
      </html>
    `;

    return (
      <WebView
        ref={webViewRef}
        source={{ html: videoHTML }}
        style={styles.webView}
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        onMessage={(event) => {
          try {
            const data = JSON.parse(event.nativeEvent.data);
            console.log('WebView message:', data);
            switch (data.action) {
              case 'playing':
                setIsPlaying(true);
                break;
              case 'paused':
                setIsPlaying(false);
                break;
              case 'ended':
                setIsPlaying(false);
                // Auto-play next episode if available
                if (hasNextEpisode && onNextEpisode) {
                  onNextEpisode();
                }
                break;
              case 'error':
                setError(data.error || 'Error al reproducir el video');
                break;
            }
          } catch (err) {
            console.error('Error parsing WebView message:', err);
          }
        }}
        onError={(error) => {
          console.error('WebView error:', error);
          setError('Error al cargar el reproductor de video');
        }}
        onLoadEnd={() => {
          console.log('WebView loaded successfully');
        }}
        onLoadStart={() => {
          console.log('WebView started loading');
        }}
      />
    );
  }, [selectedSource, episode.title, episode.number, hasNextEpisode, onNextEpisode]);

  // Selector de calidad removido - usando únicamente M3U

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar hidden />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#e50914" />
          <Text style={styles.loadingText}>Cargando episodio...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <StatusBar hidden />
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={64} color="#e50914" />
          <Text style={styles.errorTitle}>Error</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadEpisodeSources}>
            <Text style={styles.retryButtonText}>Reintentar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Cerrar</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar hidden />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={onClose}>
          <Ionicons name="close" size={24} color="white" />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.animeTitle} numberOfLines={1}>{animeTitle}</Text>
          <Text style={styles.episodeTitle} numberOfLines={1}>
            Episodio {episode.number}: {episode.title}
          </Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      {/* Video Player */}
      <View style={styles.videoContainer}>
        {renderVideoPlayer}
      </View>

      {/* Controls */}
      {showControls && (
        <View style={styles.controls}>
          {/* Episode Navigation */}
          <View style={styles.episodeNavigation}>
            <TouchableOpacity 
              style={[styles.navButton, !hasPreviousEpisode && styles.navButtonDisabled]}
              onPress={onPreviousEpisode}
              disabled={!hasPreviousEpisode}
            >
              <Ionicons name="chevron-back" size={24} color="white" />
              <Text style={styles.navButtonText}>Anterior</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.navButton, !hasNextEpisode && styles.navButtonDisabled]}
              onPress={onNextEpisode}
              disabled={!hasNextEpisode}
            >
              <Text style={styles.navButtonText}>Siguiente</Text>
              <Ionicons name="chevron-forward" size={24} color="white" />
            </TouchableOpacity>
          </View>

          {/* Quality Selector */}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  loadingText: {
    color: 'white',
    marginTop: 16,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    padding: 20,
  },
  errorTitle: {
    color: '#e50914',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#e50914',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  closeButton: {
    backgroundColor: 'transparent',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'white',
  },
  closeButtonText: {
    color: 'white',
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  headerButton: {
    padding: 8,
  },
  headerInfo: {
    flex: 1,
    marginHorizontal: 16,
  },
  animeTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  episodeTitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
  },
  headerSpacer: {
    width: 40,
  },
  videoContainer: {
    flex: 1,
    position: 'relative',
  },
  webView: {
    flex: 1,
    backgroundColor: '#000',
  },
  webVideo: {
    width: '100%',
    height: '100%',
    backgroundColor: '#000',
  },
  videoPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  placeholderText: {
    color: 'white',
    marginTop: 16,
    fontSize: 16,
  },
  playOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  controls: {
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  episodeNavigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
  },
  navButtonDisabled: {
    opacity: 0.5,
  },
  navButtonText: {
    color: 'white',
    fontSize: 14,
    marginHorizontal: 8,
  },
});

export default EpisodePlayer;
