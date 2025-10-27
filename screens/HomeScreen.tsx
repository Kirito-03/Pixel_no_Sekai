import React, { useState, useEffect, useRef } from 'react';
import { View, ScrollView, StyleSheet, ActivityIndicator, Platform, Dimensions, Alert } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { HomeStackParamList, MovieDetail, TVShowDetail, ContentItem, Movie, TVShow } from '../types';
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
    GENRES
} from '../services/api';
import { colors } from '../theme';
import Header from '../components/Header';
import FeaturedMovie from '../components/FeaturedMovie';
import MovieRow from '../components/MovieRow';
import MovieModal from '../components/MovieModal';
import { useProfile } from '../contexts/ProfileContext';
import databaseService from '../services/databaseService';

type Props = NativeStackScreenProps<HomeStackParamList, 'HomeScreen'>;

export default function HomeScreen({ navigation }: Props) {
    const { currentProfile } = useProfile();

    // Estados para Películas
    const [popularMovies, setPopularMovies] = useState<Movie[]>([]);
    const [topRatedMovies, setTopRatedMovies] = useState<Movie[]>([]);
    const [nowPlayingMovies, setNowPlayingMovies] = useState<Movie[]>([]);
    const [upcomingMovies, setUpcomingMovies] = useState<Movie[]>([]);
    const [actionMovies, setActionMovies] = useState<Movie[]>([]);
    const [comedyMovies, setComedyMovies] = useState<Movie[]>([]);
    const [horrorMovies, setHorrorMovies] = useState<Movie[]>([]);
    const [sciFiMovies, setSciFiMovies] = useState<Movie[]>([]);
    const [romanceMovies, setRomanceMovies] = useState<Movie[]>([]);
    const [animationMovies, setAnimationMovies] = useState<Movie[]>([]);

    // Estados para Series
    const [popularTVShows, setPopularTVShows] = useState<TVShow[]>([]);
    const [topRatedTVShows, setTopRatedTVShows] = useState<TVShow[]>([]);
    const [onTheAirTVShows, setOnTheAirTVShows] = useState<TVShow[]>([]);
    const [airingTodayTVShows, setAiringTodayTVShows] = useState<TVShow[]>([]);
    const [dramaTVShows, setDramaTVShows] = useState<TVShow[]>([]);
    const [comedyTVShows, setComedyTVShows] = useState<TVShow[]>([]);
    const [crimeTVShows, setCrimeTVShows] = useState<TVShow[]>([]);
    const [sciFiTVShows, setSciFiTVShows] = useState<TVShow[]>([]);

    // Estados de la UI
    const [featuredMovie, setFeaturedMovie] = useState<MovieDetail | null>(null);
    const [selectedContent, setSelectedContent] = useState<ContentItem | null>(null);
    const [modalVisible, setModalVisible] = useState(false);
    const [loading, setLoading] = useState(true);
    const [blackHeader, setBlackHeader] = useState(false);
    const [contentFilter, setContentFilter] = useState<'all' | 'movies' | 'series'>('all');
    
    // NOTA: 'selectedCategory' parecía no usarse correctamente.
    // La lógica actual se basa en el filtro principal (todo, películas, series).
    // Si la idea era filtrar por género (ej. solo 'Acción'), se necesitaría un cambio mayor.
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

    const scrollViewRef = useRef<ScrollView>(null);
    const { height: screenHeight } = Dimensions.get('window');

    useEffect(() => {
        loadContent();
    }, []);

    const loadContent = async () => {
        try {
            setLoading(true);

            // CORRECCIÓN: Usar Promise.allSettled para evitar que un fallo bloquee toda la carga.
            const results = await Promise.allSettled([
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

            // Función auxiliar para asignar el estado si la promesa se cumplió
            const handleResult = (result: PromiseSettledResult<any>, setter: (data: any) => void) => {
                if (result.status === 'fulfilled') {
                    setter(result.value);
                } else {
                    console.error('Error loading a content section:', result.reason);
                    setter([]); // Poner un array vacío en caso de error para no romper la UI
                }
            };
            
            // Asignar resultados a los estados
            handleResult(results[0], setPopularMovies);
            handleResult(results[1], setTopRatedMovies);
            handleResult(results[2], setNowPlayingMovies);
            handleResult(results[3], setUpcomingMovies);
            handleResult(results[4], setActionMovies);
            handleResult(results[5], setComedyMovies);
            handleResult(results[6], setHorrorMovies);
            handleResult(results[7], setSciFiMovies);
            handleResult(results[8], setRomanceMovies);
            handleResult(results[9], setAnimationMovies);
            handleResult(results[10], setPopularTVShows);
            handleResult(results[11], setTopRatedTVShows);
            handleResult(results[12], setOnTheAirTVShows);
            handleResult(results[13], setAiringTodayTVShows);
            handleResult(results[14], setDramaTVShows);
            handleResult(results[15], setComedyTVShows);
            handleResult(results[16], setCrimeTVShows);
            handleResult(results[17], setSciFiTVShows);

            // Cargar película destacada si la primera llamada tuvo éxito
            const popularMoviesResult = results[0];
            if (popularMoviesResult.status === 'fulfilled' && popularMoviesResult.value.length > 0) {
                const featured = await getMovieDetails(popularMoviesResult.value[0].id);
                setFeaturedMovie(featured);
            }
        } catch (error) {
            console.error('Critical error loading content:', error);
            Alert.alert('Error', 'No se pudo cargar el contenido. Por favor, intente de nuevo más tarde.');
        } finally {
            setLoading(false);
        }
    };

    const addToMyList = async (contentId: number) => {
        if (!currentProfile) {
            Alert.alert('Error', 'No hay un perfil seleccionado.');
            return;
        }
        try {
            // Usar el servicio de base de datos en lugar de AsyncStorage
            await databaseService.addToMyList(currentProfile.id, contentId, 'movie');
            Alert.alert('Éxito', 'Agregado a "Mi Lista".');
        } catch (error) {
            console.error('Error adding to my list:', error);
            // Verificar si es un error de duplicado
            if (error.response?.status === 409 || error.message?.includes('duplicate')) {
                Alert.alert('Información', 'Este título ya está en tu lista.');
            } else {
                Alert.alert('Error', 'No se pudo agregar a "Mi Lista".');
            }
        }
    };

    const handleScroll = (event: any) => {
        const scrollY = event.nativeEvent.contentOffset.y;
        setBlackHeader(scrollY > 10);
    };

    const handleContentPress = (item: ContentItem) => {
        setSelectedContent(item);
        setModalVisible(true);
    };

    const handleProfilePress = () => navigation.getParent()?.navigate('Profile' as never);
    const handleSearchPress = () => navigation.getParent()?.navigate('Search' as never);
    
    const handleFilterChange = (filter: 'series' | 'movies' | 'all') => {
        setContentFilter(filter);
        setSelectedCategory(null); // Resetear categoría al cambiar el filtro principal
    };

    const handleCategorySelect = (categoryId: string, categoryName: string) => {
        navigation.navigate('Category', { categoryId, categoryName });
    };

    // CORRECCIÓN: Lógica de renderizado simplificada
    const shouldShowRow = (type: 'movie' | 'tv') => {
        if (contentFilter === 'all') return true;
        return contentFilter === 'movies' && type === 'movie' || contentFilter === 'series' && type === 'tv';
    };

    if (loading) {
        return (
            <View style={styles.loading}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }
    
    // Función auxiliar para evitar código repetido y añadir la verificación de seguridad.
    const createContentPressHandler = (id: number, type: 'movie' | 'tv', contentList: (Movie | TVShow)[]) => {
        // CORRECCIÓN CRÍTICA: Verificar si el item existe antes de pasarlo.
        const item = contentList.find(content => content.id === id);
        if (item) {
            handleContentPress({
                id,
                type,
                title: type === 'movie' ? (item as Movie).title : (item as TVShow).name,
                overview: item.overview,
                poster_path: item.poster_path,
                backdrop_path: item.backdrop_path,
                release_date: type === 'movie' ? (item as Movie).release_date : (item as TVShow).first_air_date,
                vote_average: item.vote_average,
            });
        } else {
            console.warn(`Content with id ${id} not found in the provided list.`);
        }
    };

    return (
        <View style={styles.container}>
            <Header
                black={blackHeader}
                onProfilePress={handleProfilePress}
                onSearchPress={handleSearchPress}
                onFilterChange={handleFilterChange}
                onCategorySelect={handleCategorySelect}
            />
            <ScrollView
                ref={scrollViewRef}
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                onScroll={handleScroll}
                scrollEventThrottle={16}
                showsVerticalScrollIndicator={false}
            >
                {contentFilter !== 'series' && featuredMovie && (
                    <FeaturedMovie
                        movie={featuredMovie}
                        onWatch={() => createContentPressHandler(featuredMovie.id, 'movie', [featuredMovie])}
                        onAddList={() => addToMyList(featuredMovie.id)}
                    />
                )}

                {shouldShowRow('movie') && popularMovies.length > 0 && (
                    <MovieRow title="Películas Populares" movies={popularMovies} onMoviePress={(id) => createContentPressHandler(id, 'movie', popularMovies)} />
                )}
                {shouldShowRow('tv') && popularTVShows.length > 0 && (
                     <MovieRow title="Series Populares" movies={popularTVShows} onMoviePress={(id) => createContentPressHandler(id, 'tv', popularTVShows)} />
                )}
                {shouldShowRow('movie') && nowPlayingMovies.length > 0 && (
                    <MovieRow title="En Cartelera" movies={nowPlayingMovies} onMoviePress={(id) => createContentPressHandler(id, 'movie', nowPlayingMovies)} />
                )}
                {shouldShowRow('tv') && airingTodayTVShows.length > 0 && (
                    <MovieRow title="Series en Emisión Hoy" movies={airingTodayTVShows} onMoviePress={(id) => createContentPressHandler(id, 'tv', airingTodayTVShows)} />
                )}
                {shouldShowRow('movie') && actionMovies.length > 0 && (
                    <MovieRow title="Películas de Acción" movies={actionMovies} onMoviePress={(id) => createContentPressHandler(id, 'movie', actionMovies)} />
                )}
                {shouldShowRow('tv') && dramaTVShows.length > 0 && (
                    <MovieRow title="Series de Drama" movies={dramaTVShows} onMoviePress={(id) => createContentPressHandler(id, 'tv', dramaTVShows)} />
                )}
                {shouldShowRow('movie') && comedyMovies.length > 0 && (
                    <MovieRow title="Películas de Comedia" movies={comedyMovies} onMoviePress={(id) => createContentPressHandler(id, 'movie', comedyMovies)} />
                )}
                {shouldShowRow('tv') && comedyTVShows.length > 0 && (
                    <MovieRow title="Series de Comedia" movies={comedyTVShows} onMoviePress={(id) => createContentPressHandler(id, 'tv', comedyTVShows)} />
                )}
                {shouldShowRow('movie') && horrorMovies.length > 0 && (
                    <MovieRow title="Películas de Terror" movies={horrorMovies} onMoviePress={(id) => createContentPressHandler(id, 'movie', horrorMovies)} />
                )}
                {shouldShowRow('movie') && topRatedMovies.length > 0 && (
                    <MovieRow title="Películas Mejor Valoradas" movies={topRatedMovies} onMoviePress={(id) => createContentPressHandler(id, 'movie', topRatedMovies)} />
                )}
                {shouldShowRow('tv') && topRatedTVShows.length > 0 && (
                    <MovieRow title="Series Mejor Valoradas" movies={topRatedTVShows} onMoviePress={(id) => createContentPressHandler(id, 'tv', topRatedTVShows)} />
                )}
                {shouldShowRow('movie') && sciFiMovies.length > 0 && (
                    <MovieRow title="Ciencia Ficción - Películas" movies={sciFiMovies} onMoviePress={(id) => createContentPressHandler(id, 'movie', sciFiMovies)} />
                )}
                {shouldShowRow('tv') && sciFiTVShows.length > 0 && (
                    <MovieRow title="Ciencia Ficción - Series" movies={sciFiTVShows} onMoviePress={(id) => createContentPressHandler(id, 'tv', sciFiTVShows)} />
                )}
                {shouldShowRow('tv') && crimeTVShows.length > 0 && (
                    <MovieRow title="Series de Crimen" movies={crimeTVShows} onMoviePress={(id) => createContentPressHandler(id, 'tv', crimeTVShows)} />
                )}
                {shouldShowRow('movie') && romanceMovies.length > 0 && (
                    <MovieRow title="Películas Románticas" movies={romanceMovies} onMoviePress={(id) => createContentPressHandler(id, 'movie', romanceMovies)} />
                )}
                {shouldShowRow('movie') && animationMovies.length > 0 && (
                    <MovieRow title="Películas de Animación" movies={animationMovies} onMoviePress={(id) => createContentPressHandler(id, 'movie', animationMovies)} />
                )}
                {shouldShowRow('movie') && upcomingMovies.length > 0 && (
                    <MovieRow title="Próximos Estrenos" movies={upcomingMovies} onMoviePress={(id) => createContentPressHandler(id, 'movie', upcomingMovies)} />
                )}
                {shouldShowRow('tv') && onTheAirTVShows.length > 0 && (
                    <MovieRow title="Series al Aire" movies={onTheAirTVShows} onMoviePress={(id) => createContentPressHandler(id, 'tv', onTheAirTVShows)} />
                )}

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
    scrollContent: {
        paddingTop: 100, // Ajustado para un Header estándar
    },
    loading: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.background,
    },
});