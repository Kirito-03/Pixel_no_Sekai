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
    GENRES,
    ENHANCED_CATEGORIES,
    getAllPopularContent,
    getAllTopRatedContent,
    getCurrentContent
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

    // Estado unificado para contenido (TMDB + AniList)
    const [contentSections, setContentSections] = useState<{[key: string]: ContentItem[]}>({});

    // Estados de la UI
    const [featuredMovie, setFeaturedMovie] = useState<MovieDetail | null>(null);
    const [selectedContent, setSelectedContent] = useState<ContentItem | null>(null);
    const [modalVisible, setModalVisible] = useState(false);
    const [loading, setLoading] = useState(true);
    const [blackHeader, setBlackHeader] = useState(false);
    const [contentFilter, setContentFilter] = useState<'all' | 'movies' | 'series' | 'anime'>('all');
    
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

            // Cargar todas las categorías de contenido unificado (TMDB + AniList)
            const categoryPromises = ENHANCED_CATEGORIES.map(async (category) => {
                try {
                    const content = await category.fetcher();
                    return { id: category.id, content };
                } catch (error) {
                    console.error(`Error loading category ${category.name}:`, error);
                    return { id: category.id, content: [] };
                }
            });

            const categoryResults = await Promise.allSettled(categoryPromises);
            const newContentSections: {[key: string]: ContentItem[]} = {};

            categoryResults.forEach((result) => {
                if (result.status === 'fulfilled') {
                    newContentSections[result.value.id] = result.value.content;
                }
            });

            setContentSections(newContentSections);

            // Cargar película destacada del contenido popular
            const popularContent = newContentSections['popular_all'];
            if (popularContent && popularContent.length > 0) {
                const firstMovie = popularContent.find(item => item.type === 'movie');
                if (firstMovie) {
                    try {
                        const featured = await getMovieDetails(firstMovie.id);
                        setFeaturedMovie(featured);
                    } catch (error) {
                        console.error('Error loading featured movie:', error);
                    }
                }
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
        } catch (error: any) {
            console.error('Error adding to my list:', error);
            // Verificar si es un error de duplicado
            if (error?.response?.status === 409 || error?.message?.includes('duplicate')) {
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
    
    const handleFilterChange = (filter: 'series' | 'movies' | 'all' | 'anime') => {
        setContentFilter(filter);
        setSelectedCategory(null); // Resetear categoría al cambiar el filtro principal
    };

    const handleCategorySelect = (categoryId: string, categoryName: string) => {
        navigation.navigate('Category', { categoryId, categoryName });
    };

    // Lógica de renderizado actualizada para incluir anime
    const shouldShowCategory = (categoryId: string) => {
        if (contentFilter === 'all') return true;
        
        // Filtros específicos por tipo de contenido
        if (contentFilter === 'movies') {
            return categoryId.includes('movie') || categoryId === 'popular_all' || categoryId === 'top_rated_all' || categoryId === 'current_all';
        }
        if (contentFilter === 'series') {
            return categoryId.includes('tv') || categoryId === 'popular_all' || categoryId === 'top_rated_all' || categoryId === 'current_all';
        }
        if (contentFilter === 'anime') {
            return categoryId.includes('anime') || categoryId === 'popular_all' || categoryId === 'top_rated_all' || categoryId === 'current_all';
        }
        
        return false;
    };

    // Función para filtrar contenido basado en el filtro actual
    const filterContent = (content: ContentItem[]): ContentItem[] => {
        if (contentFilter === 'all') return content;
        
        return content.filter(item => {
            switch (contentFilter) {
                case 'movies':
                    return item.type === 'movie';
                case 'series':
                    return item.type === 'tv';
                case 'anime':
                    return item.type === 'anime';
                default:
                    return true;
            }
        });
    };

    if (loading) {
        return (
            <View style={styles.loading}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }
    
    // Función simplificada para manejar la selección de contenido
    const handleContentSelection = (contentItem: ContentItem) => {
        handleContentPress(contentItem);
    };

    // Función para navegar a detalles de contenido
    const handleContentNavigation = (contentItem: ContentItem) => {
        handleContentPress(contentItem);
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
                {contentFilter !== 'series' && contentFilter !== 'anime' && featuredMovie && (
                    <FeaturedMovie
                        movie={featuredMovie}
                        onWatch={() => handleContentNavigation({
                            id: featuredMovie.id,
                            type: 'movie',
                            title: featuredMovie.title,
                            overview: featuredMovie.overview,
                            poster_path: featuredMovie.poster_path,
                            backdrop_path: featuredMovie.backdrop_path,
                            release_date: featuredMovie.release_date,
                            vote_average: featuredMovie.vote_average,
                            source: 'tmdb'
                        })}
                        onAddList={() => addToMyList(featuredMovie.id)}
                    />
                )}

                {ENHANCED_CATEGORIES.map((category) => {
                    if (!shouldShowCategory(category.id)) return null;
                    
                    const categoryContent = contentSections[category.id];
                    if (!categoryContent || categoryContent.length === 0) return null;
                    
                    const filteredContent = filterContent(categoryContent);
                    if (filteredContent.length === 0) return null;
                    
                    return (
                        <MovieRow 
                            key={category.id}
                            title={category.name} 
                            movies={filteredContent} 
                            onMoviePress={(id) => {
                                const contentItem = filteredContent.find(item => item.id === id);
                                if (contentItem) {
                                    handleContentNavigation(contentItem);
                                }
                            }} 
                        />
                    );
                })}
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