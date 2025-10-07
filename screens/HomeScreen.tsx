import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, ActivityIndicator, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { HomeStackParamList, MovieDetail, TVShowDetail, ContentItem } from '../types';
import { 
  getPopularMovies, 
  getTopRatedMovies, 
  getNowPlayingMovies,
  getUpcomingMovies,
  getMoviesByGenre,
  getPopularTVShows,
  getTopRatedTVShows,
  getOnTheAirTVShows,
  getAiringTodayTVShows,
  getTVShowsByGenre,
  getMovieDetails,
  getTVShowDetails,
  GENRES
} from '../services/api';
import FeaturedMovie from '../components/FeaturedMovie';
import MovieRow from '../components/MovieRow';
import MovieModal from '../components/MovieModal';
import Header from '../components/Header';
import { colors } from '../theme';

type Props = NativeStackScreenProps<HomeStackParamList, 'HomeScreen'>;

export default function HomeScreen({ navigation }: Props) {
  // Películas
  const [popularMovies, setPopularMovies] = useState<any[]>([]);
  const [topRatedMovies, setTopRatedMovies] = useState<any[]>([]);
  const [nowPlayingMovies, setNowPlayingMovies] = useState<any[]>([]);
  const [upcomingMovies, setUpcomingMovies] = useState<any[]>([]);
  const [actionMovies, setActionMovies] = useState<any[]>([]);
  const [comedyMovies, setComedyMovies] = useState<any[]>([]);
  const [horrorMovies, setHorrorMovies] = useState<any[]>([]);
  const [sciFiMovies, setSciFiMovies] = useState<any[]>([]);
  const [romanceMovies, setRomanceMovies] = useState<any[]>([]);
  const [animationMovies, setAnimationMovies] = useState<any[]>([]);
  
  // Series
  const [popularTVShows, setPopularTVShows] = useState<any[]>([]);
  const [topRatedTVShows, setTopRatedTVShows] = useState<any[]>([]);
  const [onTheAirTVShows, setOnTheAirTVShows] = useState<any[]>([]);
  const [airingTodayTVShows, setAiringTodayTVShows] = useState<any[]>([]);
  const [dramaTVShows, setDramaTVShows] = useState<any[]>([]);
  const [comedyTVShows, setComedyTVShows] = useState<any[]>([]);
  const [crimeTVShows, setCrimeTVShows] = useState<any[]>([]);
  const [sciFiTVShows, setSciFiTVShows] = useState<any[]>([]);
  
  const [featuredMovie, setFeaturedMovie] = useState<MovieDetail | null>(null);
  const [selectedContent, setSelectedContent] = useState<ContentItem | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [blackHeader, setBlackHeader] = useState(false);

  useEffect(() => {
    loadContent();
  }, []);

  const loadContent = async () => {
    try {
      setLoading(true);
      
      // Cargar todo el contenido en paralelo
      const [
        popularMoviesData,
        topRatedMoviesData,
        nowPlayingMoviesData,
        upcomingMoviesData,
        actionMoviesData,
        comedyMoviesData,
        horrorMoviesData,
        sciFiMoviesData,
        romanceMoviesData,
        animationMoviesData,
        popularTVShowsData,
        topRatedTVShowsData,
        onTheAirTVShowsData,
        airingTodayTVShowsData,
        dramaTVShowsData,
        comedyTVShowsData,
        crimeTVShowsData,
        sciFiTVShowsData,
      ] = await Promise.all([
        // Películas
        getPopularMovies(),
        getTopRatedMovies(),
        getNowPlayingMovies(),
        getUpcomingMovies(),
        getMoviesByGenre(GENRES.ACTION),
        getMoviesByGenre(GENRES.COMEDY),
        getMoviesByGenre(GENRES.HORROR),
        getMoviesByGenre(GENRES.SCIENCE_FICTION),
        getMoviesByGenre(GENRES.ROMANCE),
        getMoviesByGenre(GENRES.ANIMATION),
        // Series
        getPopularTVShows(),
        getTopRatedTVShows(),
        getOnTheAirTVShows(),
        getAiringTodayTVShows(),
        getTVShowsByGenre(GENRES.DRAMA),
        getTVShowsByGenre(GENRES.COMEDY),
        getTVShowsByGenre(GENRES.CRIME),
        getTVShowsByGenre(GENRES.SCIENCE_FICTION),
      ]);
      
      // Películas
      setPopularMovies(popularMoviesData);
      setTopRatedMovies(topRatedMoviesData);
      setNowPlayingMovies(nowPlayingMoviesData);
      setUpcomingMovies(upcomingMoviesData);
      setActionMovies(actionMoviesData);
      setComedyMovies(comedyMoviesData);
      setHorrorMovies(horrorMoviesData);
      setSciFiMovies(sciFiMoviesData);
      setRomanceMovies(romanceMoviesData);
      setAnimationMovies(animationMoviesData);
      
      // Series
      setPopularTVShows(popularTVShowsData);
      setTopRatedTVShows(topRatedTVShowsData);
      setOnTheAirTVShows(onTheAirTVShowsData);
      setAiringTodayTVShows(airingTodayTVShowsData);
      setDramaTVShows(dramaTVShowsData);
      setComedyTVShows(comedyTVShowsData);
      setCrimeTVShows(crimeTVShowsData);
      setSciFiTVShows(sciFiTVShowsData);
      
      // Cargar película destacada
      if (popularMoviesData.length > 0) {
        const featured = await getMovieDetails(popularMoviesData[0].id);
        setFeaturedMovie(featured);
      }
    } catch (error) {
      console.error('Error loading content:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const handleScroll = (event: any) => {
    const scrollY = event.nativeEvent.contentOffset.y;
    if (scrollY > 10) {
      setBlackHeader(true);
    } else {
      setBlackHeader(false);
    }
  };

  const handleContentPress = async (id: number, type: 'movie' | 'tv', item: any) => {
    try {
      // Crear el objeto ContentItem con toda la información
      const contentItem: ContentItem = {
        id,
        type,
        title: type === 'movie' ? item.title : item.name,
        overview: item.overview,
        poster_path: item.poster_path,
        backdrop_path: item.backdrop_path,
        release_date: type === 'movie' ? item.release_date : item.first_air_date,
        vote_average: item.vote_average,
      };
      
      setSelectedContent(contentItem);
      setModalVisible(true);
    } catch (error) {
      console.error('Error loading content details:', error);
    }
  };

  const handleProfilePress = () => {
    navigation.getParent()?.navigate('Profile' as never);
  };

  return (
    <View style={styles.container}>
      <Header black={blackHeader} onProfilePress={handleProfilePress} />
      <ScrollView 
        style={styles.scrollView}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {featuredMovie && (
          <FeaturedMovie
            movie={featuredMovie}
            onWatch={() => handleContentPress(featuredMovie.id, 'movie', featuredMovie)}
            onAddList={() => console.log('Agregar a lista')}
          />
        )}
        
        {/* Películas Populares */}
        <MovieRow
          title="Películas Populares"
          movies={popularMovies}
          onMoviePress={(id) => {
            const movie = popularMovies.find((m: any) => m.id === id);
            handleContentPress(id, 'movie', movie);
          }}
        />
        
        {/* Series Populares */}
        <MovieRow
          title="Series Populares"
          movies={popularTVShows}
          onMoviePress={(id) => {
            const show = popularTVShows.find((s: any) => s.id === id);
            handleContentPress(id, 'tv', show);
          }}
        />
        
        {/* En Cartelera */}
        <MovieRow
          title="En Cartelera"
          movies={nowPlayingMovies}
          onMoviePress={(id) => {
            const movie = nowPlayingMovies.find((m: any) => m.id === id);
            handleContentPress(id, 'movie', movie);
          }}
        />
        
        {/* Series en Emisión Hoy */}
        <MovieRow
          title="Series en Emisión Hoy"
          movies={airingTodayTVShows}
          onMoviePress={(id) => {
            const show = airingTodayTVShows.find((s: any) => s.id === id);
            handleContentPress(id, 'tv', show);
          }}
        />
        
        {/* Películas de Acción */}
        <MovieRow
          title="Películas de Acción"
          movies={actionMovies}
          onMoviePress={(id) => {
            const movie = actionMovies.find((m: any) => m.id === id);
            handleContentPress(id, 'movie', movie);
          }}
        />
        
        {/* Series de Drama */}
        <MovieRow
          title="Series de Drama"
          movies={dramaTVShows}
          onMoviePress={(id) => {
            const show = dramaTVShows.find((s: any) => s.id === id);
            handleContentPress(id, 'tv', show);
          }}
        />
        
        {/* Películas de Comedia */}
        <MovieRow
          title="Películas de Comedia"
          movies={comedyMovies}
          onMoviePress={(id) => {
            const movie = comedyMovies.find((m: any) => m.id === id);
            handleContentPress(id, 'movie', movie);
          }}
        />
        
        {/* Series de Comedia */}
        <MovieRow
          title="Series de Comedia"
          movies={comedyTVShows}
          onMoviePress={(id) => {
            const show = comedyTVShows.find((s: any) => s.id === id);
            handleContentPress(id, 'tv', show);
          }}
        />
        
        {/* Películas de Terror */}
        <MovieRow
          title="Películas de Terror"
          movies={horrorMovies}
          onMoviePress={(id) => {
            const movie = horrorMovies.find((m: any) => m.id === id);
            handleContentPress(id, 'movie', movie);
          }}
        />
        
        {/* Películas Mejor Valoradas */}
        <MovieRow
          title="Películas Mejor Valoradas"
          movies={topRatedMovies}
          onMoviePress={(id) => {
            const movie = topRatedMovies.find((m: any) => m.id === id);
            handleContentPress(id, 'movie', movie);
          }}
        />
        
        {/* Series Mejor Valoradas */}
        <MovieRow
          title="Series Mejor Valoradas"
          movies={topRatedTVShows}
          onMoviePress={(id) => {
            const show = topRatedTVShows.find((s: any) => s.id === id);
            handleContentPress(id, 'tv', show);
          }}
        />
        
        {/* Ciencia Ficción Películas */}
        <MovieRow
          title="Ciencia Ficción - Películas"
          movies={sciFiMovies}
          onMoviePress={(id) => {
            const movie = sciFiMovies.find((m: any) => m.id === id);
            handleContentPress(id, 'movie', movie);
          }}
        />
        
        {/* Ciencia Ficción Series */}
        <MovieRow
          title="Ciencia Ficción - Series"
          movies={sciFiTVShows}
          onMoviePress={(id) => {
            const show = sciFiTVShows.find((s: any) => s.id === id);
            handleContentPress(id, 'tv', show);
          }}
        />
        
        {/* Series de Crimen */}
        <MovieRow
          title="Series de Crimen"
          movies={crimeTVShows}
          onMoviePress={(id) => {
            const show = crimeTVShows.find((s: any) => s.id === id);
            handleContentPress(id, 'tv', show);
          }}
        />
        
        {/* Películas Románticas */}
        <MovieRow
          title="Películas Románticas"
          movies={romanceMovies}
          onMoviePress={(id) => {
            const movie = romanceMovies.find((m: any) => m.id === id);
            handleContentPress(id, 'movie', movie);
          }}
        />
        
        {/* Películas de Animación */}
        <MovieRow
          title="Películas de Animación"
          movies={animationMovies}
          onMoviePress={(id) => {
            const movie = animationMovies.find((m: any) => m.id === id);
            handleContentPress(id, 'movie', movie);
          }}
        />
        
        {/* Próximos Estrenos */}
        <MovieRow
          title="Próximos Estrenos"
          movies={upcomingMovies}
          onMoviePress={(id) => {
            const movie = upcomingMovies.find((m: any) => m.id === id);
            handleContentPress(id, 'movie', movie);
          }}
        />
        
        {/* Series al Aire */}
        <MovieRow
          title="Series al Aire"
          movies={onTheAirTVShows}
          onMoviePress={(id) => {
            const show = onTheAirTVShows.find((s: any) => s.id === id);
            handleContentPress(id, 'tv', show);
          }}
        />
      </ScrollView>

      <MovieModal
        content={selectedContent}
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
});

