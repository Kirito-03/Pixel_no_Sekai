import React, { useState, useEffect, useRef } from 'react';
import { View, ScrollView, StyleSheet, ActivityIndicator, Platform, Dimensions, Alert } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { HomeStackParamList, MovieDetail, TVShowDetail, ContentItem, Movie, TVShow } from '../types';
import {
    getMovieDetails,
    ENHANCED_CATEGORIES,
    fetchCategoryPage
} from '../services/api';
import { colors } from '../theme';
import Header from '../components/Header';
import FeaturedMovie from '../components/FeaturedMovie';
import FeaturedCarousel from '../components/FeaturedCarousel';
import MovieRow from '../components/MovieRow';
import MovieModal from '../components/MovieModal';
import { useProfile } from '../contexts/ProfileContext';
import databaseService from '../services/databaseService';
import { useMyList } from '../contexts/MyListContext';

type Props = NativeStackScreenProps<HomeStackParamList, 'HomeScreen'>;

export default function HomeScreen({ navigation }: Props) {
    const { currentProfile, adultContentEnabled } = useProfile();
    const { addToMyList: addToMyListContext } = useMyList();

    // Estado unificado para contenido (TMDB + AniList)
    const [contentSections, setContentSections] = useState<{[key: string]: ContentItem[]}>({});

    // Estados de la UI
    const [featuredMovies, setFeaturedMovies] = useState<MovieDetail[]>([]);
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
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    // Mutex para evitar condiciones de carrera al cargar más filas
    const loadingMoreRef = useRef<boolean>(false);
    // Set global de keys ya añadidas para evitar duplicados incluso con llamadas concurrentes
    const loadedRowKeysRef = useRef<Set<string>>(new Set());
    const [extraRows, setExtraRows] = useState<{ key: string; title: string; items: ContentItem[] }[]>([]);
    const [categorySequenceIndex, setCategorySequenceIndex] = useState(0);
    const [pagesByCategory, setPagesByCategory] = useState<Record<string, number>>({
        popular_all: 1,
        top_rated_all: 1,
        current_all: 1,
        popular_anime: 1,
        airing_anime: 1,
        top_anime: 1,
        popular_movies: 1,
        popular_tv: 1,
    });

    // Pools de categorías por filtro para lograr variedad en cada carga
    const CATEGORY_LABELS: Record<string, string> = {
        popular_all: 'Popular Ahora',
        top_rated_all: 'Mejor Valorado',
        current_all: 'En Emisión/Cartelera',
        popular_anime: 'Anime Popular',
        airing_anime: 'Anime en Emisión',
        top_anime: 'Mejor Anime',
        popular_movies: 'Películas Populares',
        popular_tv: 'Series Populares',
    };

    const CATEGORY_POOLS: Record<'all' | 'movies' | 'series' | 'anime', string[]> = {
        all: ['popular_all', 'current_all', 'top_rated_all', 'popular_anime', 'airing_anime', 'top_anime', 'popular_movies', 'popular_tv'],
        movies: ['popular_all', 'top_rated_all', 'current_all', 'popular_movies'],
        series: ['popular_all', 'top_rated_all', 'current_all', 'popular_tv'],
        anime: ['popular_all', 'top_rated_all', 'current_all', 'popular_anime', 'airing_anime', 'top_anime'],
    };

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

            // Cargar varias películas destacadas del contenido popular (top 5)
            const popularContent = newContentSections['popular_all'];
            if (popularContent && popularContent.length > 0) {
                const popularMovies = popularContent.filter(item => item.type === 'movie').slice(0, 5);
                if (popularMovies.length > 0) {
                    try {
                        const details = await Promise.all(popularMovies.map(m => getMovieDetails(m.id)));
                        setFeaturedMovies(details);
                    } catch (error) {
                        console.error('Error loading featured movies:', error);
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
            // Usar el contexto para mantener el estado UI sincronizado
            await addToMyListContext(contentId, 'movie');
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
        const { contentOffset, layoutMeasurement, contentSize } = event.nativeEvent;
        const scrollY = contentOffset.y;
        setBlackHeader(scrollY > 10);

        // Detectar si estamos cerca del final del scroll para cargar más
        const paddingToBottom = 80;
        const isAtBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom;
        if (isAtBottom && !isLoadingMore) {
            loadMoreContent();
        }
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
        // Reiniciar paginación y filas extra para evitar duplicados/mezclas al cambiar filtro
        setExtraRows([]);
        setCategorySequenceIndex(0);
        // Limpiar keys cargadas
        loadedRowKeysRef.current = new Set();
        setPagesByCategory({
            popular_all: 1,
            top_rated_all: 1,
            current_all: 1,
            popular_anime: 1,
            airing_anime: 1,
            top_anime: 1,
            popular_movies: 1,
            popular_tv: 1,
        });
    };

    const loadMoreContent = async () => {
        try {
            // Evitar llamadas paralelas que generan claves duplicadas
            if (loadingMoreRef.current) {
                return;
            }
            loadingMoreRef.current = true;
            setIsLoadingMore(true);

            const pool = CATEGORY_POOLS[contentFilter];
            const batchSize = 3; // número de filas nuevas por carga para variedad
            const newExtraRows: { key: string; title: string; items: ContentItem[] }[] = [];
            // Usar un mapa local para evitar condiciones de carrera al actualizar páginas
            const updatedPages: Record<string, number> = { ...pagesByCategory };

            for (let i = 0; i < batchSize; i++) {
                const idx = (categorySequenceIndex + i) % pool.length;
                const categoryId = pool[idx];
                const nextPage = (updatedPages[categoryId] || 1) + 1;
                const items = await fetchCategoryPage(categoryId, nextPage);

                if (items.length > 0) {
                    const rowKey = `${categoryId}_page_${nextPage}`;
                    // Si ya existe esa key, saltarla para evitar duplicado
                    if (!loadedRowKeysRef.current.has(rowKey)) {
                        newExtraRows.push({
                            key: rowKey,
                            title: CATEGORY_LABELS[categoryId],
                            items,
                        });
                        loadedRowKeysRef.current.add(rowKey);
                    }
                }

                // Actualizar el contador de página por categoría
                updatedPages[categoryId] = nextPage;
            }

            // Avanzar el índice de la secuencia para la próxima carga
            setCategorySequenceIndex(prev => (prev + batchSize) % pool.length);

            // Aplicar actualización de páginas de manera atómica
            setPagesByCategory(updatedPages);

            if (newExtraRows.length > 0) {
                // Evitar duplicados de keys al anexar nuevas filas (segunda barrera)
                setExtraRows(prev => {
                    const all = [...prev, ...newExtraRows];
                    const map = new Map<string, { key: string; title: string; items: ContentItem[] }>();
                    for (const r of all) {
                        if (!map.has(r.key)) {
                            map.set(r.key, r);
                        }
                    }
                    return Array.from(map.values());
                });
            }
        } catch (error) {
            console.error('Error loading more content:', error);
        } finally {
            setIsLoadingMore(false);
            loadingMoreRef.current = false;
        }
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
        const byType = content.filter(item => {
            if (contentFilter === 'all') return true;
            if (contentFilter === 'movies') return item.type === 'movie';
            if (contentFilter === 'series') return item.type === 'tv';
            if (contentFilter === 'anime') return item.type === 'anime';
            return true;
        });
        // Aplicar filtro de +18 sobre anime si está deshabilitado
        return byType.filter(item => {
            if (item.type === 'anime' && !adultContentEnabled) {
                return !item.isAdult;
            }
            return true;
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
                {contentFilter !== 'series' && contentFilter !== 'anime' && featuredMovies.length > 0 && (
                    <FeaturedCarousel
                        movies={featuredMovies}
                        onWatch={(movie) => handleContentNavigation({
                            id: movie.id,
                            type: 'movie',
                            title: movie.title,
                            overview: movie.overview,
                            poster_path: movie.poster_path,
                            backdrop_path: movie.backdrop_path,
                            release_date: movie.release_date,
                            vote_average: movie.vote_average,
                            source: 'tmdb'
                        })}
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

                {/* Filas adicionales cargadas dinámicamente al llegar al final */}
                {extraRows.map((row) => (
                    <MovieRow
                        key={row.key}
                        title={row.title}
                        movies={filterContent(row.items)}
                        onMoviePress={(id) => {
                            const contentItem = row.items.find(item => item.id === id);
                            if (contentItem) {
                                handleContentNavigation(contentItem);
                            }
                        }}
                    />
                ))}

                {isLoadingMore && (
                    <View style={styles.loadingMore}>
                        <ActivityIndicator size="small" color={colors.primary} />
                    </View>
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
    loadingMore: {
        paddingVertical: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    loading: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.background,
    },
});