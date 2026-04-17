import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

export default function NewsScreen() {
    const { colors } = useTheme();

    const styles = StyleSheet.create({
        container: {
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: colors.background,
        },
        text: {
            fontSize: 24,
            fontWeight: 'bold',
            color: colors.text,
        },
    });

    return (
        <View style={styles.container}>
            <Text style={styles.text}>Noticias</Text>
        </View>
    );
}
