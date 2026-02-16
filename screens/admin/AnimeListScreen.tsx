import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
    RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { adminApiService } from '../../services/adminApiService';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AdminStackParamList } from '../../types/navigation';

type NavigationProp = NativeStackNavigationProp<AdminStackParamList>;

export default function AnimeListScreen() {
    const navigation = useNavigation<NavigationProp>();
    const [animeList, setAnimeList] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [page, setPage] = useState(1);

    useEffect(() => {
        loadAnime();
    }, [searchQuery]);

    const loadAnime = async () => {
        try {
            setIsLoading(true);
            const data = await adminApiService.getAnimeList({
                page: 1,
                limit: 50,
                search: searchQuery || undefined,
            });
            setAnimeList(data.anime || []);
        } catch (error) {
            console.error('Error loading anime:', error);
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    };

    const handleRefresh = () => {
        setRefreshing(true);
        loadAnime();
    };

    const handleSearch = (text: string) => {
        setSearchQuery(text);
    };

    const renderAnimeItem = ({ item }: any) => (
        <TouchableOpacity
            style={styles.animeCard}
            onPress={() => navigation.navigate('EpisodeManager', { animeId: item.id, animeTitle: item.title })}
        >
            <View style={styles.animeInfo}>
                <Text style={styles.animeTitle} numberOfLines={1}>
                    {item.title}
                </Text>
                {item.title_english && (
                    <Text style={styles.animeSubtitle} numberOfLines={1}>
                        {item.title_english}
                    </Text>
                )}
                <View style={styles.animeMetadata}>
                    <View style={[styles.badge, getStatusBadgeStyle(item.status)]}>
                        <Text style={styles.badgeText}>{item.status || 'Unknown'}</Text>
                    </View>
                    <Text style={styles.episodeCount}>
                        {item.total_episodes || 0} episodios
                    </Text>
                </View>
            </View>
            <View style={styles.actions}>
                <TouchableOpacity
                    style={styles.actionButton}
                    onPress={(e) => {
                        e.stopPropagation();
                        navigation.navigate('AnimeForm', { mode: 'edit', animeId: item.id });
                    }}
                >
                    <Ionicons name="create-outline" size={20} color="#0A2342" />
                </TouchableOpacity>
                <Ionicons name="chevron-forward" size={20} color="#666666" />
            </View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    style={styles.backButton}
                >
                    <Ionicons name="arrow-back" size={24} color="#0A2342" />
                </TouchableOpacity>
                <View style={styles.headerTitleContainer}>
                    <Text style={styles.headerTitle}>Biblioteca de Anime</Text>
                </View>
                <TouchableOpacity
                    style={styles.addButton}
                    onPress={() => navigation.navigate('AnimeForm', { mode: 'create' })}
                >
                    <Ionicons name="add-circle" size={28} color="#0A2342" />
                </TouchableOpacity>
            </View>

            {/* Search Bar */}
            <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color="#666666" style={styles.searchIcon} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Buscar anime..."
                    value={searchQuery}
                    onChangeText={handleSearch}
                    placeholderTextColor="#999999"
                />
                {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchQuery('')}>
                        <Ionicons name="close-circle" size={20} color="#666666" />
                    </TouchableOpacity>
                )}
            </View>

            {/* Anime List */}
            {isLoading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#0A2342" />
                </View>
            ) : animeList.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Ionicons name="film-outline" size={64} color="#cccccc" />
                    <Text style={styles.emptyText}>
                        {searchQuery ? 'No se encontraron resultados' : 'No hay anime agregado aún'}
                    </Text>
                    {!searchQuery && (
                        <TouchableOpacity
                            style={styles.emptyButton}
                            onPress={() => navigation.navigate('AnimeForm', { mode: 'create' })}
                        >
                            <Text style={styles.emptyButtonText}>Agregar Anime</Text>
                        </TouchableOpacity>
                    )}
                </View>
            ) : (
                <FlatList
                    data={animeList}
                    renderItem={renderAnimeItem}
                    keyExtractor={(item) => item.id.toString()}
                    contentContainerStyle={styles.listContent}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
                    }
                />
            )}
        </SafeAreaView>
    );
}

function getStatusBadgeStyle(status: string) {
    switch (status) {
        case 'Airing':
            return { backgroundColor: '#d1fae5' };
        case 'Finished':
            return { backgroundColor: '#fef3c7' };
        case 'Upcoming':
            return { backgroundColor: '#fee2e2' };
        default:
            return { backgroundColor: '#f3f4f6' };
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8F9FA',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    backButton: {
        padding: 4,
    },
    headerTitleContainer: {
        flex: 1,
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: '#0A2342',
    },
    addButton: {
        padding: 4,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        margin: 16,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e0e0e0',
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        color: '#1a1a1a',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 32,
    },
    emptyText: {
        fontSize: 16,
        color: '#666666',
        marginTop: 16,
        textAlign: 'center',
    },
    emptyButton: {
        marginTop: 24,
        backgroundColor: '#0A2342',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
    },
    emptyButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '500',
    },
    listContent: {
        padding: 16,
    },
    animeCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    animeInfo: {
        flex: 1,
    },
    animeTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1a1a1a',
        marginBottom: 4,
    },
    animeSubtitle: {
        fontSize: 13,
        color: '#666666',
        marginBottom: 8,
    },
    animeMetadata: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    badge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    badgeText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#065f46',
    },
    episodeCount: {
        fontSize: 13,
        color: '#666666',
    },
    actions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    actionButton: {
        padding: 8,
    },
});
