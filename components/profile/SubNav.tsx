import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { spacing } from '../../theme';

interface SubNavProps {
    tabs: { id: string; label: string }[];
    activeTab: string;
    onTabPress: (tabId: string) => void;
    colors: any;
    theme: string;
}

export const SubNav: React.FC<SubNavProps> = ({ tabs, activeTab, onTabPress, colors, theme }) => {
    const styles = createSubNavStyles(colors, theme);

    return (
        <View style={styles.container}>
            {tabs.map((tab) => (
                <TouchableOpacity
                    key={tab.id}
                    style={[styles.tab, activeTab === tab.id && styles.tabActive]}
                    onPress={() => onTabPress(tab.id)}
                >
                    <Text style={[styles.tabText, activeTab === tab.id && styles.tabTextActive]}>
                        {tab.label}
                    </Text>
                </TouchableOpacity>
            ))}
        </View>
    );
};

const createSubNavStyles = (colors: any, theme: string) => StyleSheet.create({
    container: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: theme === 'dark' ? '#2d2d2d' : '#e5e5e5',
        marginBottom: spacing.xl,
    },
    tab: {
        paddingVertical: 16,
        paddingHorizontal: 20,
        marginRight: spacing.lg,
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    tabActive: {
        borderBottomColor: colors.primary,
    },
    tabText: {
        fontSize: 16,
        fontWeight: '500',
        color: colors.textGray,
    },
    tabTextActive: {
        color: colors.primary,
        fontWeight: '600',
    },
});
