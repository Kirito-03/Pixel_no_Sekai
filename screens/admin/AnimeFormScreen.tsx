import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    Modal,
    FlatList,
    Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { adminApiService } from '../../services/adminApiService';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AdminStackParamList } from '../../types/navigation';

type NavigationProp = NativeStackNavigationProp<AdminStackParamList>;
type AnimeFormRouteProp = RouteProp<AdminStackParamList, 'AnimeForm'>;

export default function AnimeFormScreen() {
    const navigation = useNavigation<NavigationProp>();
    const route = useRoute<AnimeFormRouteProp>();
    const { mode, animeId } = route.params;

    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [showTMDBSearch, setShowTMDBSearch] = useState(false);
    const [tmdbResults, setTmdbResults] = useState<any[]>([]);
    const [tmdbSearchQuery, setTmdbSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);

    const [formData, setFormData] = useState({
        title: '',
        title_english: '',
        title_japanese: '',
        description: '',
        poster_url: '',
        banner_url: '',
        genres: '',
        status: 'Unknown',
        total_episodes: '',
        rating: '',
        release_date: '',
        tmdb_id: '',
    });

    useEffect(() => {
        if (mode === 'edit' && animeId) {
            loadAnime();
        }
    }, [mode, animeId]);

    const loadAnime = async () => {
        if (!animeId) return;
        try {
            setIsLoading(true);
            const data = await adminApiService.getAnimeById(animeId);
            setFormData({
                title: data.title || '',
                title_english: data.title_english || '',
                title_japanese: data.title_japanese || '',
                description: data.description || '',
                poster_url: data.poster_url || '',
                banner_url: data.banner_url || '',
                genres: data.genres?.join(', ') || '',
                status: data.status || 'Unknown',
                total_episodes: data.total_episodes?.toString() || '',
                rating: data.rating?.toString() || '',
                release_date: data.release_date || '',
                tmdb_id: data.tmdb_id?.toString() || '',
            });
        } catch (error) {
            console.error('Error loading anime:', error);
            Alert.alert('Error', 'No se pudo cargar el anime');
        } finally {
            setIsLoading(false);
        }
    };

    const searchTMDB = async () => {
        if (!tmdbSearchQuery.trim()) return;

        try {
            setIsSearching(true);
            const data = await adminApiService.searchTMDB(tmdbSearchQuery);
            setTmdbResults(data.results || []);
        } catch (error) {
            console.error('Error searching TMDB:', error);
            Alert.alert('Error', 'No se pudo buscar en TMDB');
        } finally {
            setIsSearching(false);
        }
    };

    const selectTMDBResult = async (tmdbId: number) => {
        try {
            setIsSearching(true);
            const data = await adminApiService.getTMDBDetails(tmdbId);

            // Autocompletar formulario con datos de TMDB
            setFormData({
                ...formData,
                tmdb_id: tmdbId.toString(),
                title: data.name || data.original_name || '',
                title_english: data.name || '',
                description: data.overview || '',
                poster_url: data.poster_path ? `https://image.tmdb.org/t/p/w500${data.poster_path}` : '',
                banner_url: data.backdrop_path ? `https://image.tmdb.org/t/p/original${data.backdrop_path}` : '',
                genres: data.genres?.map((g: any) => g.name).join(', ') || '',
                total_episodes: data.number_of_episodes?.toString() || '',
                rating: data.vote_average?.toString() || '',
                release_date: data.first_air_date || '',
                status: data.status || 'Unknown',
            });

            setShowTMDBSearch(false);
            Alert.alert('Éxito', 'Datos importados desde TMDB');
        } catch (error) {
            console.error('Error getting TMDB details:', error);
            Alert.alert('Error', 'No se pudieron obtener los detalles');
        } finally {
            setIsSearching(false);
        }
    };

    const handleSave = async () => {
        if (!formData.title.trim()) {
            Alert.alert('Error', 'El título es requerido');
            return;
        }

        try {
            setIsSaving(true);

            const payload = {
                ...formData,
                genres: formData.genres.split(',').map(g => g.trim()).filter(g => g),
                total_episodes: formData.total_episodes ? parseInt(formData.total_episodes) : 0,
                rating: formData.rating ? parseFloat(formData.rating) : 0,
                tmdb_id: formData.tmdb_id ? parseInt(formData.tmdb_id) : undefined,
            };

            if (mode === 'create') {
                await adminApiService.createAnime(payload);
                Alert.alert('Éxito', 'Anime creado exitosamente', [
                    { text: 'OK', onPress: () => navigation.goBack() }
                ]);
            } else {
                if (!animeId) throw new Error('ID de anime no encontrado');
                await adminApiService.updateAnime(animeId, payload);
                Alert.alert('Éxito', 'Anime actualizado exitosamente', [
                    { text: 'OK', onPress: () => navigation.goBack() }
                ]);
            }
        } catch (error: any) {
            console.error('Error saving anime:', error);
            Alert.alert('Error', error.message || 'No se pudo guardar el anime');
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#0A2342" />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#E50914" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>
                    {mode === 'create' ? 'Agregar Anime' : 'Editar Anime'}
                </Text>
                <TouchableOpacity
                    style={styles.tmdbButton}
                    onPress={() => setShowTMDBSearch(true)}
                >
                    <Ionicons name="search" size={24} color="#E50914" />
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>

                {/* Image Previews */}
                {(formData.poster_url || formData.banner_url) && (
                    <View style={styles.previewContainer}>
                        {formData.banner_url ? (
                            <Image source={{ uri: formData.banner_url }} style={styles.bannerPreview} resizeMode="cover" />
                        ) : null}
                        {formData.poster_url ? (
                            <Image source={{ uri: formData.poster_url }} style={styles.posterPreview} resizeMode="cover" />
                        ) : null}
                    </View>
                )}

                {/* Título y Autocomplete */}
                <View style={styles.formGroup}>
                    <Text style={styles.label}>Título *</Text>
                    <View style={styles.inputContainer}>
                        <TextInput
                            style={styles.input}
                            value={formData.title}
                            onChangeText={(text) => {
                                setFormData({ ...formData, title: text });
                                // Trigger search on typing (debounce needed ideally, or just button)
                            }}
                            placeholder="Nombre del anime"
                            placeholderTextColor="#999999"
                        />
                        <TouchableOpacity
                            style={styles.searchIcon}
                            onPress={() => {
                                setTmdbSearchQuery(formData.title);
                                setShowTMDBSearch(true);
                                searchTMDB();
                            }}
                        >
                            <Ionicons name="cloud-download-outline" size={20} color="#E50914" />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Título en Inglés */}
                <View style={styles.formGroup}>
                    <Text style={styles.label}>Título en Inglés</Text>
                    <TextInput
                        style={styles.input}
                        value={formData.title_english}
                        onChangeText={(text) => setFormData({ ...formData, title_english: text })}
                        placeholder="English title"
                        placeholderTextColor="#999999"
                    />
                </View>

                {/* Descripción */}
                <View style={styles.formGroup}>
                    <Text style={styles.label}>Descripción</Text>
                    <TextInput
                        style={[styles.input, styles.textArea]}
                        value={formData.description}
                        onChangeText={(text) => setFormData({ ...formData, description: text })}
                        placeholder="Sinopsis del anime"
                        placeholderTextColor="#999999"
                        multiline
                        numberOfLines={4}
                    />
                </View>

                {/* Poster URL */}
                <View style={styles.formGroup}>
                    <Text style={styles.label}>URL del Póster</Text>
                    <TextInput
                        style={styles.input}
                        value={formData.poster_url}
                        onChangeText={(text) => setFormData({ ...formData, poster_url: text })}
                        placeholder="https://..."
                        placeholderTextColor="#999999"
                        autoCapitalize="none"
                    />
                </View>

                {/* Banner URL */}
                <View style={styles.formGroup}>
                    <Text style={styles.label}>URL del Banner</Text>
                    <TextInput
                        style={styles.input}
                        value={formData.banner_url}
                        onChangeText={(text) => setFormData({ ...formData, banner_url: text })}
                        placeholder="https://..."
                        placeholderTextColor="#999999"
                        autoCapitalize="none"
                    />
                </View>

                {/* Géneros */}
                <View style={styles.formGroup}>
                    <Text style={styles.label}>Géneros (separados por coma)</Text>
                    <TextInput
                        style={styles.input}
                        value={formData.genres}
                        onChangeText={(text) => setFormData({ ...formData, genres: text })}
                        placeholder="Acción, Aventura, Fantasía"
                        placeholderTextColor="#999999"
                    />
                </View>

                {/* Estado */}
                <View style={styles.formGroup}>
                    <Text style={styles.label}>Estado</Text>
                    <View style={styles.statusButtons}>
                        {['Airing', 'Finished', 'Upcoming'].map((status) => (
                            <TouchableOpacity
                                key={status}
                                style={[
                                    styles.statusButton,
                                    formData.status === status && styles.statusButtonActive
                                ]}
                                onPress={() => setFormData({ ...formData, status })}
                            >
                                <Text style={[
                                    styles.statusButtonText,
                                    formData.status === status && styles.statusButtonTextActive
                                ]}>
                                    {status}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Total Episodios */}
                <View style={styles.formGroup}>
                    <Text style={styles.label}>Total de Episodios</Text>
                    <TextInput
                        style={styles.input}
                        value={formData.total_episodes}
                        onChangeText={(text) => setFormData({ ...formData, total_episodes: text.replace(/[^0-9]/g, '') })}
                        placeholder="12"
                        placeholderTextColor="#999999"
                        keyboardType="numeric"
                    />
                </View>

                {/* Save Button */}
                <TouchableOpacity
                    style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
                    onPress={handleSave}
                    disabled={isSaving}
                >
                    {isSaving ? (
                        <ActivityIndicator color="#FFFFFF" />
                    ) : (
                        <Text style={styles.saveButtonText}>
                            {mode === 'create' ? 'Crear Anime' : 'Guardar Cambios'}
                        </Text>
                    )}
                </TouchableOpacity>
            </ScrollView>

            {/* TMDB Search Modal */}
            <Modal
                visible={showTMDBSearch}
                animationType="slide"
                onRequestClose={() => setShowTMDBSearch(false)}
            >
                <SafeAreaView style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Buscar en TMDB</Text>
                        <TouchableOpacity onPress={() => setShowTMDBSearch(false)}>
                            <Ionicons name="close" size={28} color="#E50914" />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.searchContainer}>
                        <TextInput
                            style={styles.searchInput}
                            value={tmdbSearchQuery}
                            onChangeText={setTmdbSearchQuery}
                            placeholder="Buscar anime..."
                            placeholderTextColor="#999999"
                            onSubmitEditing={searchTMDB}
                        />
                        <TouchableOpacity style={styles.searchButton} onPress={searchTMDB}>
                            <Ionicons name="search" size={20} color="#FFFFFF" />
                        </TouchableOpacity>
                    </View>

                    {isSearching ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color="#E50914" />
                        </View>
                    ) : (
                        <FlatList
                            data={tmdbResults}
                            keyExtractor={(item) => item.id.toString()}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={styles.tmdbResultItem}
                                    onPress={() => selectTMDBResult(item.id)}
                                >
                                    <Image
                                        source={{ uri: item.poster_path ? `https://image.tmdb.org/t/p/w200${item.poster_path}` : 'https://via.placeholder.com/100x150' }}
                                        style={styles.tmdbResultImage}
                                    />
                                    <View style={styles.tmdbResultInfo}>
                                        <Text style={styles.tmdbResultTitle}>{item.name || item.original_name}</Text>
                                        <Text style={styles.tmdbResultOverview} numberOfLines={2}>
                                            {item.overview || 'Sin descripción'}
                                        </Text>
                                        <Text style={styles.tmdbResultDate}>
                                            {item.first_air_date ? `Estreno: ${item.first_air_date}` : ''}
                                        </Text>
                                    </View>
                                    <Ionicons name="chevron-forward" size={20} color="#666666" />
                                </TouchableOpacity>
                            )}
                            contentContainerStyle={styles.tmdbResultsList}
                        />
                    )}
                </SafeAreaView>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000000', // Black background
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#000000',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        backgroundColor: '#000000',
        borderBottomWidth: 1,
        borderBottomColor: '#333333',
    },
    backButton: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: '#E50914', // Red text
    },
    tmdbButton: {
        padding: 4,
    },
    content: {
        flex: 1,
    },
    contentContainer: {
        padding: 16,
    },
    // Preview Styles
    previewContainer: {
        marginBottom: 24,
        alignItems: 'center',
    },
    bannerPreview: {
        width: '100%',
        height: 150,
        borderRadius: 12,
        marginBottom: -40, // Overlap effect
        opacity: 0.8,
    },
    posterPreview: {
        width: 100,
        height: 150,
        borderRadius: 8,
        borderWidth: 2,
        borderColor: '#E50914',
    },
    formGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: '500',
        color: '#FFFFFF', // White text
        marginBottom: 8,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    searchIcon: {
        padding: 10,
        backgroundColor: '#1A1A1A',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#333333',
    },
    input: {
        flex: 1,
        backgroundColor: '#1A1A1A', // Dark input
        borderWidth: 1,
        borderColor: '#333333',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        color: '#FFFFFF', // White text
    },
    textArea: {
        minHeight: 100,
        textAlignVertical: 'top',
    },
    statusButtons: {
        flexDirection: 'row',
        gap: 8,
    },
    statusButton: {
        flex: 1,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#333333',
        backgroundColor: '#1A1A1A',
        alignItems: 'center',
    },
    statusButtonActive: {
        backgroundColor: '#E50914', // Red active
        borderColor: '#E50914',
    },
    statusButtonText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#999999',
    },
    statusButtonTextActive: {
        color: '#FFFFFF',
    },
    saveButton: {
        backgroundColor: '#E50914', // Red button
        padding: 16,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 8,
        marginBottom: 32,
    },
    saveButtonDisabled: {
        opacity: 0.6,
    },
    saveButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    // Modal Styles
    modalContainer: {
        flex: 1,
        backgroundColor: '#000000',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#000000',
        borderBottomWidth: 1,
        borderBottomColor: '#333333',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: '#E50914',
    },
    searchContainer: {
        flexDirection: 'row',
        padding: 16,
        gap: 8,
    },
    searchInput: {
        flex: 1,
        backgroundColor: '#1A1A1A',
        borderWidth: 1,
        borderColor: '#333333',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        color: '#FFFFFF',
    },
    searchButton: {
        backgroundColor: '#E50914',
        width: 48,
        height: 48,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    tmdbResultsList: {
        padding: 16,
    },
    tmdbResultItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1A1A1A',
        padding: 12,
        borderRadius: 12,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#333333',
    },
    tmdbResultImage: {
        width: 50,
        height: 75,
        borderRadius: 4,
        marginRight: 12,
        backgroundColor: '#333333',
    },
    tmdbResultInfo: {
        flex: 1,
    },
    tmdbResultTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF',
        marginBottom: 4,
    },
    tmdbResultOverview: {
        fontSize: 13,
        color: '#999999',
        marginBottom: 4,
    },
    tmdbResultDate: {
        fontSize: 12,
        color: '#666666',
    },
});
