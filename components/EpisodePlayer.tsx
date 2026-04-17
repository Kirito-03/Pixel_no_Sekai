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

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface EpisodePlayerProps {
  episode: AnimeEpisode;
  animeTitle: string;
  seasonNumber: number;
  onClose: () => void;
  onNextEpisode?: () => void;
  onPreviousEpisode?: () => void;
  hasNextEpisode?: boolean;
  hasPreviousEpisode?: boolean;
}

const EpisodePlayer: React.FC<EpisodePlayerProps> = ({
  episode,
  animeTitle,
  seasonNumber,
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
  const webVideoRef = useRef<any>(null);

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

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const videoEl = webVideoRef.current as any;
    const url = selectedSource?.url || '';
    if (!videoEl || !url) return;
    const isM3U8 = /\.m3u8(\?|$)/i.test(url);
    let hls: any = null;
    function initHls() {
      const HlsCtor = (window as any).Hls;
      if (!HlsCtor?.isSupported?.()) {
        setError('HLS no soportado en este navegador');
        return;
      }

      hls = new HlsCtor({
        enableWorker: true,
        lowLatencyMode: false,
      });

      hls.on(HlsCtor.Events.MANIFEST_LOADING, () => {
        console.log('[HLS][web] MANIFEST_LOADING', { url });
      });
      hls.on(HlsCtor.Events.MANIFEST_PARSED, (_event: any, data: any) => {
        console.log('[HLS][web] MANIFEST_PARSED', { levels: data?.levels?.length, url });
      });
      hls.on(HlsCtor.Events.FRAG_LOADED, (_event: any, data: any) => {
        const fragUrl = data?.frag?.url || data?.frag?.relurl;
        if (fragUrl) console.log('[HLS][web] FRAG_LOADED', fragUrl);
      });
      hls.on(HlsCtor.Events.ERROR, (_event: any, data: any) => {
        const code = data?.response?.code;
        const errUrl = data?.response?.url || data?.url;
        console.log('[HLS][web] ERROR', {
          type: data?.type,
          details: data?.details,
          fatal: data?.fatal,
          code,
          url: errUrl,
        });
        if (data?.fatal) {
          setError(`Error HLS: ${data?.details || 'fatal'}${code ? ` (${code})` : ''}`);
        }
      });

      hls.loadSource(url);
      hls.attachMedia(videoEl);
    }
    if (isM3U8) {
      console.log('[EpisodePlayer][web] m3u8 url', url);
      if (videoEl.canPlayType && videoEl.canPlayType('application/vnd.apple.mpegurl')) {
        videoEl.src = url;
        videoEl.load();
      } else if ((window as any).Hls) {
        initHls();
      } else {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/hls.js@latest';
        script.async = true;
        script.onload = initHls;
        script.onerror = () => setError('No se pudo cargar hls.js');
        document.head.appendChild(script);
      }
    }
    return () => {
      if (hls) {
        try { hls.destroy(); } catch {}
      }
    };
  }, [selectedSource]);

  const loadEpisodeSources = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Loading sources for episode:', episode.id);
      
      if (episode.url) {
        console.log('Using direct episode URL:', episode.url);
        const directSources: VideoSource[] = [{ url: episode.url }];
        setSources(directSources);
        setSelectedSource(directSources[0]);
        return;
      }

      setError('No hay una fuente disponible para este episodio');
      return;
      
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
    const isHls = /\.m3u8(\?|$)/.test(videoUrl);
    const urlNoQuery = videoUrl.split('?')[0];
    const ext = (urlNoQuery.split('.').pop() || '').toLowerCase();
    const mime = ext === 'm3u8'
      ? 'application/vnd.apple.mpegurl'
      : ext === 'mp4'
      ? 'video/mp4'
      : ext === 'webm'
      ? 'video/webm'
      : ext === 'mov'
      ? 'video/quicktime'
      : ext === 'mkv'
      ? 'video/x-matroska'
      : '';
    console.log('Using video URL:', videoUrl);
    
    // Para web, usar un elemento video HTML nativo
    if (Platform.OS === 'web') {
      return (
        <View style={styles.videoContainer}>
          <video
            ref={webVideoRef}
            controls
            style={styles.webVideo}
            preload="metadata"
            crossOrigin="anonymous"
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
              const el = webVideoRef.current as any;
              const mediaError = el?.error;
              console.error('Video error:', { event: e, mediaError, url: videoUrl });
              setError(`Error al reproducir el video${mediaError?.code ? ` (code ${mediaError.code})` : ''}`);
            }}
          >
            {!isHls && (mime ? (
              <source src={videoUrl} type={mime} />
            ) : (
              <source src={videoUrl} />
            ))}
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
            ${isHls ? '' : `<source src="${safeVideoUrl}" ${mime ? `type="${mime}"` : ''} />`}
            <p style="color: white; text-align: center; padding: 20px;">
              Tu navegador no soporta el elemento video.
            </p>
          </video>
          
          <script>
            ${isHls ? `
            var script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/hls.js@latest';
            document.head.appendChild(script);
            ` : ''}
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
            function initPlayer() {
              if (${isHls ? 'true' : 'false'}) {
                if (video.canPlayType('application/vnd.apple.mpegurl')) {
                  video.src = '${safeVideoUrl}';
                  video.load();
                } else if (window.Hls) {
                  if (window.Hls.isSupported && !window.Hls.isSupported()) {
                    loading.innerHTML = 'HLS no soportado';
                    window.ReactNativeWebView?.postMessage(JSON.stringify({ action: 'hls_error', error: 'HLS no soportado' }));
                    return;
                  }
                  const hls = new window.Hls({ enableWorker: true, lowLatencyMode: false });
                  hls.on(window.Hls.Events.ERROR, function (_event, data) {
                    var code = data && data.response && data.response.code;
                    var errUrl = (data && data.response && data.response.url) || data.url;
                    console.log('[HLS][mobile-webview] ERROR', data);
                    window.ReactNativeWebView?.postMessage(JSON.stringify({
                      action: 'hls_error',
                      error: 'Error HLS: ' + (data.details || 'unknown') + (code ? (' (' + code + ')') : ''),
                      details: data.details,
                      code: code,
                      url: errUrl
                    }));
                  });
                  hls.loadSource('${safeVideoUrl}');
                  hls.attachMedia(video);
                } else {
                  loading.innerHTML = 'HLS no soportado';
                  window.ReactNativeWebView?.postMessage(JSON.stringify({ action: 'hls_error', error: 'HLS no soportado' }));
                }
              } else {
                video.load();
              }
            }
            if (${isHls ? 'true' : 'false'}) {
              if (window.Hls) {
                initPlayer();
              } else {
                script.onload = initPlayer;
              }
            } else {
              initPlayer();
            }
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
              case 'hls_error':
                console.log('[EpisodePlayer][WebView] hls_error', data);
                setError(data.error || 'Error HLS');
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
