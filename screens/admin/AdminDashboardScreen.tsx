import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAdmin } from '../../contexts/AdminContext';
import { adminApiService } from '../../services/adminApiService';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AdminStackParamList } from '../../types/navigation';

interface DashboardStats {
    totalAnime: number;
    totalEpisodes: number;
    storageStats: Array<{
        storage_type: string;
        count: number;
    }>;
    recentAnime: any[];
}

type NavigationProp = NativeStackNavigationProp<AdminStackParamList>;

export default function AdminDashboardScreen() {
    const { adminUser, logoutAdmin } = useAdmin();
    const navigation = useNavigation<NavigationProp>();
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        loadStats();
    }, []);

    const loadStats = async () => {
        try {
            setIsLoading(true);
            const data = await adminApiService.getDashboardStats();
            setStats(data);
        } catch (error) {
            console.error('Error loading stats:', error);
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    };

    const handleRefresh = () => {
        setRefreshing(true);
        loadStats();
    };

    const handleLogout = async () => {
        // En lugar de cerrar sesión, volvemos al perfil
        // Si se quiere "cerrar" el panel, basta con salir de la navegación admin
        navigation.getParent()?.goBack();
    };

    const handleGoBack = () => {
        navigation.getParent()?.goBack();
    };

    const gdriveCount = stats?.storageStats?.find(s => s.storage_type === 'gdrive')?.count || 0;
    const localCount = stats?.storageStats?.find(s => s.storage_type === 'local')?.count || 0;

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
                </TouchableOpacity>
                <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.headerTitle}>Dashboard</Text>
                    <Text style={styles.headerSubtitle}>Panel de Administración</Text>
                </View>
                {/* Botón para salir del modo administrador */}
                <TouchableOpacity onPress={handleGoBack} style={styles.logoutButton}>
                    <Ionicons name="exit-outline" size={24} color="#ef4444" />
                </TouchableOpacity>
            </View>

            <ScrollView
                style={styles.content}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
                }
            >
                {/* User Info */}
                {adminUser && (
                    <View style={styles.userCard}>
                        <View style={styles.userInfo}>
                            <View style={styles.avatar}>
                                <Text style={styles.avatarText}>
                                    {adminUser.name.charAt(0).toUpperCase()}
                                </Text>
                            </View>
                            <View>
                                <Text style={styles.userName}>{adminUser.name}</Text>
                                <Text style={styles.userEmail}>{adminUser.email}</Text>
                            </View>
                        </View>
                    </View>
                )}

                {/* Stats Grid */}
                {isLoading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#0A2342" />
                    </View>
                ) : (
                    <>
                        <View style={styles.statsGrid}>
                            <StatCard
                                title="Total de Anime"
                                value={stats?.totalAnime || 0}
                                icon="film"
                                color="#0A2342"
                            />
                            <StatCard
                                title="Total de Episodios"
                                value={stats?.totalEpisodes || 0}
                                icon="play-circle"
                                color="#10b981"
                            />
                            <StatCard
                                title="Google Drive"
                                value={gdriveCount}
                                icon="cloud"
                                color="#4285F4"
                            />
                            <StatCard
                                title="Almacenamiento Local"
                                value={localCount}
                                icon="server"
                                color="#f59e0b"
                            />
                        </View>

                        {/* Quick Actions */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Acciones Rápidas</Text>
                            <View style={styles.actionsGrid}>
                                <ActionButton
                                    title="Gestionar Anime"
                                    icon="list"
                                    onPress={() => navigation.navigate('AnimeList' as never)}
                                />
                                <ActionButton
                                    title="Agregar Anime"
                                    icon="add-circle"
                                    onPress={() => navigation.navigate('AnimeForm', { mode: 'create' })}
                                />
                            </View>
                        </View>

                        {/* Recent Anime */}
                        {stats?.recentAnime && stats.recentAnime.length > 0 && (
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>Anime Recientes</Text>
                                {stats.recentAnime.map((anime) => (
                                    <TouchableOpacity
                                        key={anime.id}
                                        style={styles.animeItem}
                                        onPress={() => navigation.navigate('EpisodeManager', { animeId: anime.id })}
                                    >
                                        <View style={styles.animeInfo}>
                                            <Text style={styles.animeTitle}>{anime.title}</Text>
                                            <Text style={styles.animeSubtitle}>
                                                {anime.total_episodes || 0} episodios
                                            </Text>
                                        </View>
                                        <Ionicons name="chevron-forward" size={20} color="#666666" />
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}
                    </>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

// Stat Card Component
function StatCard({ title, value, icon, color }: any) {
    return (
        <View style={styles.statCard}>
            <Ionicons name={icon} size={32} color={color} />
            <Text style={styles.statValue}>{value}</Text>
            <Text style={styles.statTitle}>{title}</Text>
        </View>
    );
}

// Action Button Component
function ActionButton({ title, icon, onPress }: any) {
    return (
        <TouchableOpacity style={styles.actionButton} onPress={onPress}>
            <Ionicons name={icon} size={28} color="#E50914" />
            <Text style={styles.actionButtonText}>{title}</Text>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000000', // Black background
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
        backgroundColor: '#000000', // Black header
        borderBottomWidth: 1,
        borderBottomColor: '#333333',
    },
    backButton: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: '#E50914', // Red accent
    },
    headerSubtitle: {
        fontSize: 14,
        color: '#CCCCCC',
        marginTop: 4,
    },
    logoutButton: {
        padding: 8,
    },
    content: {
        flex: 1,
    },
    userCard: {
        backgroundColor: '#1A1A1A', // Dark grey card
        margin: 16,
        padding: 16,
        borderRadius: 12,
    },
    userInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#E50914', // Red avatar
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        fontSize: 20,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    userName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    userEmail: {
        fontSize: 13,
        color: '#999999',
        marginTop: 2,
    },
    loadingContainer: {
        padding: 40,
        alignItems: 'center',
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        padding: 16,
        gap: 12,
    },
    statCard: {
        flex: 1,
        minWidth: '45%',
        backgroundColor: '#1A1A1A', // Dark grey card
        padding: 20,
        borderRadius: 12,
        alignItems: 'center',
    },
    statValue: {
        fontSize: 32,
        fontWeight: '700',
        color: '#E50914', // Red value
        marginTop: 12,
    },
    statTitle: {
        fontSize: 12,
        color: '#CCCCCC',
        marginTop: 4,
        textAlign: 'center',
    },
    section: {
        padding: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#FFFFFF',
        marginBottom: 12,
    },
    actionsGrid: {
        flexDirection: 'row',
        gap: 12,
    },
    actionButton: {
        flex: 1,
        backgroundColor: '#1A1A1A', // Dark grey button
        padding: 20,
        borderRadius: 12,
        alignItems: 'center',
    },
    actionButtonText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#FFFFFF',
        marginTop: 8,
        textAlign: 'center',
    },
    animeItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#1A1A1A', // Dark grey item
        padding: 16,
        borderRadius: 12,
        marginBottom: 8,
    },
    animeInfo: {
        flex: 1,
    },
    animeTitle: {
        fontSize: 16,
        fontWeight: '500',
        color: '#FFFFFF',
    },
    animeSubtitle: {
        fontSize: 13,
        color: '#999999',
        marginTop: 4,
    },
});
