import { StyleSheet } from 'react-native';
import { spacing } from '../theme';

// Este es un rediseño completo para una estética más premium y minimalista en la web.
export const createStyles = (colors: any, theme: string) => StyleSheet.create({
    // --- Contenedores Principales ---
    pageWrapper: {
        flex: 1,
        alignItems: 'center',
        backgroundColor: theme === 'dark' ? '#0a0a0a' : '#f0f2f5', // Fondo ligeramente texturizado
    },
    container: {
        flex: 1,
        width: '100%',
        maxWidth: 1400,
        backgroundColor: theme === 'dark' ? '#141414' : '#ffffff',
        flexDirection: 'row',
    },

    // --- Barra Lateral (Sidebar) ---
    sidebar: {
        width: 280,
        backgroundColor: theme === 'dark' ? '#000000' : '#fafafa',
        borderRightWidth: 1,
        borderRightColor: theme === 'dark' ? '#222' : '#e0e0e0',
        paddingVertical: spacing.xl,
        alignItems: 'center',
    },
    sidebarHeader: {
        alignItems: 'center',
        marginBottom: spacing['2xl'],
        paddingHorizontal: spacing.lg,
    },
    avatarContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        marginBottom: spacing.md,
        position: 'relative',
        borderWidth: 2,
        borderColor: 'transparent',
        // En una implementación web real, aquí añadiríamos: transition: 'border-color 0.3s',
    },
    avatar: {
        width: '100%',
        height: '100%',
        borderRadius: 50,
    },
    username: {
        fontSize: 22,
        fontWeight: '600',
        color: colors.text,
        textAlign: 'center',
    },
    userEmail: {
        fontSize: 14,
        color: colors.textGray,
        marginTop: 4,
    },

    // --- Menú de Navegación ---
    menuContainer: {
        width: '100%',
        paddingHorizontal: spacing.lg,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 8,
        borderLeftWidth: 3,
        borderLeftColor: 'transparent',
        marginBottom: spacing.sm,
        // En web: transition: 'background-color 0.2s, border-left-color 0.2s',
    },
    menuItemActive: {
        backgroundColor: colors.primary + '1A', // 10% opacity
        borderLeftColor: colors.primary,
    },
    menuIcon: {
        marginRight: 16,
    },
    menuText: {
        fontSize: 16,
        fontWeight: '500',
        color: colors.textGray,
    },
    menuTextActive: {
        color: colors.primary,
        fontWeight: '600',
    },

    // --- Pie de Barra Lateral ---
    sidebarFooter: {
        marginTop: 'auto',
        width: '100%',
        padding: spacing.lg,
    },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 8,
        justifyContent: 'center',
        backgroundColor: '#e50914' + '1A',
    },
    logoutText: {
        color: '#e50914',
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 12,
    },

    // --- Área de Contenido ---
    contentArea: {
        flex: 1,
        padding: spacing['3xl'],
    },
    sectionTitle: {
        fontSize: 32,
        fontWeight: '700',
        color: colors.text,
        marginBottom: spacing.xl,
    },
    card: {
        backgroundColor: theme === 'dark' ? '#1c1c1c' : '#ffffff',
        borderRadius: 12,
        padding: spacing.xl,
        marginBottom: spacing.xl,
        borderWidth: 1,
        borderColor: theme === 'dark' ? '#2d2d2d' : '#e5e5e5',
        // En web: boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    },
    cardTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: colors.text,
        marginBottom: spacing.lg,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: theme === 'dark' ? '#2d2d2d' : '#f0f0f0',
    },
    rowLabel: {
        fontSize: 16,
        color: colors.text,
    },
    rowDesc: {
        fontSize: 14,
        color: colors.textGray,
        marginTop: 4,
    },
    actionBtn: {
        backgroundColor: 'transparent',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: colors.primary,
    },
    actionBtnText: {
        color: colors.primary,
        fontWeight: '600',
    },

    // --- Estilos de Modal ---
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: theme === 'dark' ? '#1f1f1f' : '#fff',
        borderRadius: 12,
        padding: spacing.xl,
        width: 380,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: colors.text,
        marginBottom: 8,
    },
    modalSubtitle: {
        color: colors.textGray,
        marginBottom: 24,
        fontSize: 16,
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 12,
    },
    modalCancelButton: {
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 6,
        backgroundColor: theme === 'dark' ? '#333' : '#eee',
    },
    modalCancelText: {
        color: colors.text,
        fontWeight: 'bold',
    },
    modalConfirmButton: {
        backgroundColor: '#e50914',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 6,
        alignItems: 'center',
        minWidth: 100,
    },
    modalConfirmText: {
        color: '#fff',
        fontWeight: 'bold',
    },
});
