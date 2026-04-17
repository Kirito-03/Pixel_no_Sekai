import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useProfile } from '../contexts/ProfileContext';

export default function MangaScreen() {
    const { colors } = useTheme();
    const { currentProfile } = useProfile();

    // Asumimos que el perfil tiene una propiedad `adultContentEnabled`
    const adultContentEnabled = currentProfile?.adultContentEnabled || false;

    const styles = StyleSheet.create({
        container: {
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: colors.background,
        },
        title: {
            fontSize: 24,
            fontWeight: 'bold',
            color: colors.text,
            marginBottom: 20,
        },
        category: {
            fontSize: 18,
            color: colors.text,
            padding: 10,
        },
        sensitiveCategory: {
            fontSize: 18,
            color: colors.primary, // Destacar la categoría sensible
            padding: 10,
            borderWidth: 1,
            borderColor: colors.primary,
            borderRadius: 8,
            marginTop: 15,
        }
    });

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Sección de Manga</Text>
            <Text style={styles.category}>Shonen</Text>
            <Text style={styles.category}>Shojo</Text>
            <Text style={styles.category}>Seinen</Text>
            
            {adultContentEnabled && (
                <Text style={styles.sensitiveCategory}>Hentai (Visible)</Text>
            )}
        </View>
    );
}
