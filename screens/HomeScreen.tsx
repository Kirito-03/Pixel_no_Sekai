import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, Dimensions, Alert } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { HomeStackParamList, MovieDetail, ContentItem, AnimeDetail } from '../types';
import { colors } from '../theme';
import Header from '../components/Header';
import FeaturedCarousel from '../components/FeaturedCarousel';
import MovieRow from '../components/MovieRow';
import MovieModal from '../components/MovieModal';
import { useProfile } from '../contexts/ProfileContext';
import { useMyList } from '../contexts/MyListContext';
import { catalogService } from '../services/catalogService';

type Props = NativeStackScreenProps<HomeStackParamList, 'Inicio'>;

export default function HomeScreen({ navigation }: Props) {
    const { currentProfile, adultContentEnabled } = useProfile();
    const { addToMyList: addToMyListContext } = useMyList();

    // Estado unificado para contenido (TMDB + AniList)
    const [contentSections, setContentSections] = useState<{ [key: string]: ContentItem[] }>({});

    // Estados de la UI
    const [featuredMovies, setFeaturedMovies] = useState<(MovieDetail | AnimeDetail)[]>([]);
    const [selectedContent, setSelectedContent] = useState<ContentItem | null>(null);
    const [modalVisible, setModalVisible] = useState(false);
    const [loading, setLoading] = useState(true);
    const [blackHeader, setBlackHeader] = useState(false);
    const [contentFilter, setContentFilter] = useState<'all' | 'movies' | 'series' | 'anime'>('anime');

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
        airing: 1,
        finished: 1,
        upcoming: 1,
    });

    // Pools de categorías por filtro para lograr variedad en cada carga
    const CATEGORY_LABELS: Record<string, string> = {
        airing: 'En emisión',
        finished: 'Finalizados',
        upcoming: 'Próximos',
    };

    const CATEGORY_POOLS: Record<'all' | 'movies' | 'series' | 'anime', string[]> = {
        all: ['airing', 'finished', 'upcoming'],
        movies: [],
        series: [],
        anime: ['airing', 'finished', 'upcoming'],
    };

    const mapCatalogAnimeToContentItem = (anime: any): ContentItem => ({
        id: Number(anime.id),
        type: 'anime',
        title: anime.title || 'Sin título',
        overview: anime.description || '',
        poster_path: anime.poster_url || '',
        backdrop_path: anime.banner_url || anime.poster_url || '',
        release_date: anime.release_date || '',
        vote_average: typeof anime.rating === 'number' ? anime.rating : 0,
        source: 'anilist',
        genres: Array.isArray(anime.genres) ? anime.genres : [],
    });

    const mapCatalogAnimeToAnimeDetail = (anime: any): AnimeDetail => {
        const releaseYear = anime.release_date ? new Date(anime.release_date).getFullYear() : 0;
        return {
            id: Number(anime.id),
            title: {
                romaji: anime.title || 'Sin título',
                english: anime.title_english || undefined,
                native: anime.title_japanese || anime.title || 'Sin título',
            },
            description: anime.description || '',
            coverImage: {
                large: anime.poster_url || '',
                medium: anime.poster_url || '',
            },
            bannerImage: anime.banner_url || undefined,
            startDate: { year: Number.isFinite(releaseYear) ? releaseYear : 0 },
            averageScore: typeof anime.rating === 'number' ? anime.rating * 10 : 0,
            episodes: typeof anime.total_episodes === 'number' ? anime.total_episodes : undefined,
            status: anime.status || 'UNKNOWN',
            genres: Array.isArray(anime.genres) ? anime.genres : [],
            format: 'TV',
            source: 'anilist',
            studios: { nodes: [] },
            characters: { nodes: [] },
            recommendations: { nodes: [] },
        } as any;
    };

    useEffect(() => {
        loadContent();
    }, []);

    const loadContent = async () => {
        try {
            setLoading(true);
            const sections = await catalogService.getHomeSections();

            const newContentSections: { [key: string]: ContentItem[] } = {
                airing: sections.airing.map(mapCatalogAnimeToContentItem),
                finished: sections.finished.map(mapCatalogAnimeToContentItem),
                upcoming: sections.upcoming.map(mapCatalogAnimeToContentItem),
            };

            const featuredBase = newContentSections.airing.length
                ? sections.airing
                : (sections.finished.length ? sections.finished : sections.upcoming);

            setFeaturedMovies(featuredBase.slice(0, 5).map(mapCatalogAnimeToAnimeDetail));
            setContentSections(newContentSections);
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

    const handleProfilePress = () => navigation.getParent()?.navigate('Perfil' as never);
    const handleSearchPress = () => navigation.getParent()?.navigate('Buscar' as never);

    const handleFilterChange = (filter: 'series' | 'movies' | 'all' | 'anime') => {
        setContentFilter(filter);
        setSelectedCategory(null); // Resetear categoría al cambiar el filtro principal
        // Reiniciar paginación y filas extra para evitar duplicados/mezclas al cambiar filtro
        setExtraRows([]);
        setCategorySequenceIndex(0);
        // Limpiar keys cargadas
        loadedRowKeysRef.current = new Set();
        setPagesByCategory({
            airing: 1,
            finished: 1,
            upcoming: 1,
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
            if (!pool || pool.length === 0) {
                return;
            }
            const batchSize = 3; // número de filas nuevas por carga para variedad
            const newExtraRows: { key: string; title: string; items: ContentItem[] }[] = [];
            // Usar un mapa local para evitar condiciones de carrera al actualizar páginas
            const updatedPages: Record<string, number> = { ...pagesByCategory };

            for (let i = 0; i < batchSize; i++) {
                const idx = (categorySequenceIndex + i) % pool.length;
                const categoryId = pool[idx];
                const nextPage = (updatedPages[categoryId] || 1) + 1;
                const status =
                    categoryId === 'airing' ? 'Airing' : (categoryId === 'finished' ? 'Finished' : 'Upcoming');
                const response = await catalogService.getAnimeList({ status, page: nextPage, limit: 20 });
                const items = (response?.data || []).map(mapCatalogAnimeToContentItem);

                if (items.length > 0) {
                    // Deduplicar por id+source dentro de la fila cargada
                    const seen = new Set<string>();
                    const uniqueItems = items.filter(item => {
                        const key = `${item.source}_${item.id}`;
                        if (seen.has(key)) return false;
                        seen.add(key);
                        return true;
                    });
                    const rowKey = `${categoryId}_page_${nextPage}`;
                    if (!loadedRowKeysRef.current.has(rowKey)) {
                        newExtraRows.push({
                            key: rowKey,
                            title: CATEGORY_LABELS[categoryId],
                            items: uniqueItems,
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
        navigation.navigate('Categoria', { categoryId, categoryName });
    };

    // Lógica de renderizado actualizada para incluir anime
    const shouldShowCategory = (categoryId: string) => {
        if (contentFilter === 'all') return true;

        // Filtros específicos por tipo de contenido
        if (contentFilter === 'movies') {
            return false;
        }
        if (contentFilter === 'series') {
            return false;
        }
        if (contentFilter === 'anime') {
            return categoryId === 'airing' || categoryId === 'finished' || categoryId === 'upcoming';
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
                {featuredMovies.length > 0 && (
                    <FeaturedCarousel
                        movies={featuredMovies}
                        onWatch={(movie) => {
                            if ('release_date' in movie) {
                                handleContentNavigation({
                                    id: movie.id,
                                    type: 'movie',
                                    title: movie.title,
                                    overview: movie.overview,
                                    poster_path: movie.poster_path,
                                    backdrop_path: movie.backdrop_path,
                                    release_date: movie.release_date,
                                    vote_average: movie.vote_average,
                                    source: 'tmdb'
                                });
                            } else {
                                handleContentNavigation(mapCatalogAnimeToContentItem({
                                    id: movie.id,
                                    title: (movie as any).title?.romaji || (movie as any).title?.native || '',
                                    description: (movie as any).description || '',
                                    poster_url: (movie as any).coverImage?.large || '',
                                    banner_url: (movie as any).bannerImage || '',
                                    rating: (movie as any).averageScore ? (movie as any).averageScore / 10 : 0,
                                    release_date: '',
                                    genres: (movie as any).genres || [],
                                }));
                            }
                        }}
                    />
                )}

                {([
                    { id: 'airing', name: 'En emisión' },
                    { id: 'finished', name: 'Finalizados' },
                    { id: 'upcoming', name: 'Próximos' },
                ] as const).map((category) => {
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

                {(!contentSections.airing?.length && !contentSections.finished?.length && !contentSections.upcoming?.length) && (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyTitle}>Aún no hay anime disponible</Text>
                        <Text style={styles.emptySubtitle}>Agrega contenido desde el panel de administrador.</Text>
                    </View>
                )}

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
        paddingTop: 100,
        paddingBottom: 80,
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
    emptyState: {
        paddingHorizontal: 20,
        paddingTop: 24,
    },
    emptyTitle: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 6,
    },
    emptySubtitle: {
        color: 'rgba(255,255,255,0.75)',
        fontSize: 14,
    },
});
