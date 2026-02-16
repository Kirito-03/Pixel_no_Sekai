import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
    Alert,
    Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { adminApiService } from '../../services/adminApiService';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AdminStackParamList } from '../../types/navigation';

type NavigationProp = NativeStackNavigationProp<AdminStackParamList>;
type EpisodeManagerRouteProp = RouteProp<AdminStackParamList, 'EpisodeManager'>;

export default function EpisodeManagerScreen() {
    const navigation = useNavigation<NavigationProp>();
    const route = useRoute<EpisodeManagerRouteProp>();
    const { animeId, animeTitle } = route.params;

    const [episodes, setEpisodes] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingEpisode, setEditingEpisode] = useState<any>(null);

    const [episodeForm, setEpisodeForm] = useState({
        episode_number: '',
        title: '',
        video_url: '',
        season: '1',
        quality: '1080p',
        storage_type: 'gdrive',
    });

    useEffect(() => {
        if (animeId) {
            loadEpisodes();
        }
    }, [animeId]);

    const loadEpisodes = async () => {
        try {
            setIsLoading(true);
            const data = await adminApiService.getEpisodes(animeId);
            setEpisodes(data.episodes || []);
        } catch (error) {
            console.error('Error loading episodes:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const openAddModal = () => {
        setEditingEpisode(null);
        setEpisodeForm({
            episode_number: (episodes.length + 1).toString(),
            title: '',
            video_url: '',
            season: '1',
            quality: '1080p',
            storage_type: 'gdrive',
        });
        setShowAddModal(true);
    };

    const openEditModal = (episode: any) => {
        setEditingEpisode(episode);
        setEpisodeForm({
            episode_number: episode.episode_number.toString(),
            title: episode.title || '',
            video_url: episode.video_url || '',
            season: episode.season?.toString() || '1',
            quality: episode.quality || '1080p',
            storage_type: episode.storage_type || 'gdrive',
        });
        setShowAddModal(true);
    };

    const handleSaveEpisode = async () => {
        if (!episodeForm.episode_number || !episodeForm.video_url) {
            Alert.alert('Error', 'Número de episodio y URL de video son requeridos');
            return;
        }

        try {
            const payload = {
                anime_id: animeId,
                episode_number: parseInt(episodeForm.episode_number),
                title: episodeForm.title || undefined,
                video_url: episodeForm.video_url,
                season: parseInt(episodeForm.season),
                quality: episodeForm.quality,
                storage_type: episodeForm.storage_type as 'gdrive' | 'local',
            };

            if (editingEpisode) {
                await adminApiService.updateEpisode(editingEpisode.id, payload);
                Alert.alert('Éxito', 'Episodio actualizado');
            } else {
                await adminApiService.createEpisode(payload);
                Alert.alert('Éxito', 'Episodio agregado');
            }

            setShowAddModal(false);
            loadEpisodes();
        } catch (error: any) {
            console.error('Error saving episode:', error);
            Alert.alert('Error', error.message || 'No se pudo guardar el episodio');
        }
    };

    const handleDeleteEpisode = (episode: any) => {
        Alert.alert(
            'Confirmar Eliminación',
            `¿Eliminar episodio ${episode.episode_number}?`,
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Eliminar',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await adminApiService.deleteEpisode(episode.id);
                            Alert.alert('Éxito', 'Episodio eliminado');
                            loadEpisodes();
                        } catch (error) {
                            Alert.alert('Error', 'No se pudo eliminar el episodio');
                        }
                    },
                },
            ]
        );
    };

    const renderEpisodeItem = ({ item }: any) => (
        <View style={styles.episodeCard}>
            <View style={styles.episodeInfo}>
                <View style={styles.episodeHeader}>
                    <Text style={styles.episodeNumber}>Episodio {item.episode_number}</Text>
                    <View style={styles.badges}>
                        <View style={styles.qualityBadge}>
                            <Text style={styles.badgeText}>{item.quality || '1080p'}</Text>
                        </View>
                        <View style={[styles.storageBadge, item.storage_type === 'gdrive' && styles.gdriveBadge]}>
                            <Ionicons
                                name={item.storage_type === 'gdrive' ? 'cloud' : 'server'}
                                size={12}
                                color="#FFFFFF"
                            />
                        </View>
                    </View>
                </View>
                {item.title && (
                    <Text style={styles.episodeTitle} numberOfLines={1}>
                        {item.title}
                    </Text>
                )}
                <Text style={styles.episodeUrl} numberOfLines={1}>
                    {item.video_url}
                </Text>
            </View>
            <View style={styles.episodeActions}>
                <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => openEditModal(item)}
                >
                    <Ionicons name="create-outline" size={20} color="#0A2342" />
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleDeleteEpisode(item)}
                >
                    <Ionicons name="trash-outline" size={20} color="#ef4444" />
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#0A2342" />
                </TouchableOpacity>
                <View style={styles.headerTitleContainer}>
                    <Text style={styles.headerTitle} numberOfLines={1}>
                        {animeTitle || 'Episodios'}
                    </Text>
                    <Text style={styles.headerSubtitle}>{episodes.length} episodios</Text>
                </View>
                <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
                    <Ionicons name="add-circle" size={28} color="#0A2342" />
                </TouchableOpacity>
            </View>

            {/* Episodes List */}
            {isLoading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#0A2342" />
                </View>
            ) : episodes.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Ionicons name="play-circle-outline" size={64} color="#cccccc" />
                    <Text style={styles.emptyText}>No hay episodios agregados</Text>
                    <TouchableOpacity style={styles.emptyButton} onPress={openAddModal}>
                        <Text style={styles.emptyButtonText}>Agregar Primer Episodio</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <FlatList
                    data={episodes}
                    renderItem={renderEpisodeItem}
                    keyExtractor={(item) => item.id.toString()}
                    contentContainerStyle={styles.listContent}
                />
            )}

            {/* Add/Edit Episode Modal */}
            <Modal
                visible={showAddModal}
                animationType="slide"
                onRequestClose={() => setShowAddModal(false)}
            >
                <SafeAreaView style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>
                            {editingEpisode ? 'Editar Episodio' : 'Agregar Episodio'}
                        </Text>
                        <TouchableOpacity onPress={() => setShowAddModal(false)}>
                            <Ionicons name="close" size={28} color="#0A2342" />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.modalContent}>
                        {/* Episode Number */}
                        <View style={styles.formGroup}>
                            <Text style={styles.label}>Número de Episodio *</Text>
                            <TextInput
                                style={styles.input}
                                value={episodeForm.episode_number}
                                onChangeText={(text) =>
                                    setEpisodeForm({ ...episodeForm, episode_number: text.replace(/[^0-9]/g, '') })
                                }
                                placeholder="1"
                                keyboardType="numeric"
                                placeholderTextColor="#999999"
                            />
                        </View>

                        {/* Title */}
                        <View style={styles.formGroup}>
                            <Text style={styles.label}>Título (opcional)</Text>
                            <TextInput
                                style={styles.input}
                                value={episodeForm.title}
                                onChangeText={(text) => setEpisodeForm({ ...episodeForm, title: text })}
                                placeholder="Título del episodio"
                                placeholderTextColor="#999999"
                            />
                        </View>

                        {/* Video URL */}
                        <View style={styles.formGroup}>
                            <Text style={styles.label}>URL del Video *</Text>
                            <TextInput
                                style={styles.input}
                                value={episodeForm.video_url}
                                onChangeText={(text) => setEpisodeForm({ ...episodeForm, video_url: text })}
                                placeholder="https://drive.google.com/file/d/..."
                                placeholderTextColor="#999999"
                                autoCapitalize="none"
                                multiline
                            />
                            <Text style={styles.hint}>
                                Enlace de Google Drive o URL directa del video
                            </Text>
                        </View>

                        {/* Quality */}
                        <View style={styles.formGroup}>
                            <Text style={styles.label}>Calidad</Text>
                            <View style={styles.qualityButtons}>
                                {['720p', '1080p', '4K'].map((quality) => (
                                    <TouchableOpacity
                                        key={quality}
                                        style={[
                                            styles.qualityButton,
                                            episodeForm.quality === quality && styles.qualityButtonActive,
                                        ]}
                                        onPress={() => setEpisodeForm({ ...episodeForm, quality })}
                                    >
                                        <Text
                                            style={[
                                                styles.qualityButtonText,
                                                episodeForm.quality === quality && styles.qualityButtonTextActive,
                                            ]}
                                        >
                                            {quality}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        {/* Storage Type */}
                        <View style={styles.formGroup}>
                            <Text style={styles.label}>Tipo de Almacenamiento</Text>
                            <View style={styles.storageButtons}>
                                <TouchableOpacity
                                    style={[
                                        styles.storageButton,
                                        episodeForm.storage_type === 'gdrive' && styles.storageButtonActive,
                                    ]}
                                    onPress={() => setEpisodeForm({ ...episodeForm, storage_type: 'gdrive' })}
                                >
                                    <Ionicons name="cloud" size={20} color={episodeForm.storage_type === 'gdrive' ? '#FFFFFF' : '#666666'} />
                                    <Text
                                        style={[
                                            styles.storageButtonText,
                                            episodeForm.storage_type === 'gdrive' && styles.storageButtonTextActive,
                                        ]}
                                    >
                                        Google Drive
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[
                                        styles.storageButton,
                                        episodeForm.storage_type === 'local' && styles.storageButtonActive,
                                    ]}
                                    onPress={() => setEpisodeForm({ ...episodeForm, storage_type: 'local' })}
                                >
                                    <Ionicons name="server" size={20} color={episodeForm.storage_type === 'local' ? '#FFFFFF' : '#666666'} />
                                    <Text
                                        style={[
                                            styles.storageButtonText,
                                            episodeForm.storage_type === 'local' && styles.storageButtonTextActive,
                                        ]}
                                    >
                                        Local
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Save Button */}
                        <TouchableOpacity style={styles.saveButton} onPress={handleSaveEpisode}>
                            <Text style={styles.saveButtonText}>
                                {editingEpisode ? 'Guardar Cambios' : 'Agregar Episodio'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>
            </Modal>
        </SafeAreaView>
    );
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
        paddingHorizontal: 16,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#0A2342',
    },
    headerSubtitle: {
        fontSize: 13,
        color: '#666666',
        marginTop: 2,
    },
    addButton: {
        padding: 4,
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
    episodeCard: {
        flexDirection: 'row',
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
    episodeInfo: {
        flex: 1,
    },
    episodeHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    episodeNumber: {
        fontSize: 16,
        fontWeight: '600',
        color: '#0A2342',
    },
    badges: {
        flexDirection: 'row',
        gap: 6,
    },
    qualityBadge: {
        backgroundColor: '#10b981',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 8,
    },
    storageBadge: {
        backgroundColor: '#666666',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 8,
    },
    gdriveBadge: {
        backgroundColor: '#4285F4',
    },
    badgeText: {
        fontSize: 10,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    episodeTitle: {
        fontSize: 14,
        color: '#1a1a1a',
        marginBottom: 4,
    },
    episodeUrl: {
        fontSize: 12,
        color: '#999999',
    },
    episodeActions: {
        flexDirection: 'row',
        gap: 8,
        marginLeft: 12,
    },
    actionButton: {
        padding: 8,
    },
    modalContainer: {
        flex: 1,
        backgroundColor: '#F8F9FA',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: '#0A2342',
    },
    modalContent: {
        padding: 16,
    },
    formGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: '500',
        color: '#1a1a1a',
        marginBottom: 8,
    },
    input: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#e0e0e0',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        color: '#1a1a1a',
    },
    hint: {
        fontSize: 12,
        color: '#999999',
        marginTop: 4,
    },
    qualityButtons: {
        flexDirection: 'row',
        gap: 8,
    },
    qualityButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#e0e0e0',
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
    },
    qualityButtonActive: {
        backgroundColor: '#0A2342',
        borderColor: '#0A2342',
    },
    qualityButtonText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#666666',
    },
    qualityButtonTextActive: {
        color: '#FFFFFF',
    },
    storageButtons: {
        flexDirection: 'row',
        gap: 8,
    },
    storageButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#e0e0e0',
        backgroundColor: '#FFFFFF',
    },
    storageButtonActive: {
        backgroundColor: '#0A2342',
        borderColor: '#0A2342',
    },
    storageButtonText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#666666',
    },
    storageButtonTextActive: {
        color: '#FFFFFF',
    },
    saveButton: {
        backgroundColor: '#0A2342',
        padding: 16,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 8,
    },
    saveButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
});
