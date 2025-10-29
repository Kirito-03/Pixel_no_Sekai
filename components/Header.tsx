import React, { useEffect, useRef, useState } from 'react';
import { View, Image, Text, TouchableOpacity, StyleSheet, SafeAreaView, Animated, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';
import CategoriesMenu from './CategoriesMenu';

interface HeaderProps {
  black?: boolean;
  onProfilePress?: () => void;
  onSearchPress?: () => void;
  onFilterChange?: (filter: 'series' | 'movies' | 'all' | 'anime') => void;
  onCategorySelect?: (categoryId: string, categoryName: string) => void;
  currentCategoryId?: string;
}

export default function Header({ black = false, onProfilePress, onSearchPress, onFilterChange, onCategorySelect, currentCategoryId }: HeaderProps) {
  const { width } = useWindowDimensions();
  const isSmallScreen = width < 768;
  const [selectedFilter, setSelectedFilter] = useState<'series' | 'movies' | 'anime' | 'all' | null>(null);
  const [showCategoriesMenu, setShowCategoriesMenu] = useState(false);
  
  const backgroundOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(backgroundOpacity, {
      toValue: black ? 1 : 0,
      duration: 500,
      useNativeDriver: false,
    }).start();
  }, [black]);

  const backgroundColor = backgroundOpacity.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(0, 0, 0, 0)', 'rgba(20, 20, 20, 1)'],
  });

  const handleFilterPress = (filter: 'series' | 'movies' | 'anime' | 'all') => {
    setSelectedFilter(filter === selectedFilter ? null : filter);
    onFilterChange?.(filter);
  };

  const handleCategoriesPress = () => {
    setShowCategoriesMenu(true);
  };

  const handleCategorySelect = (categoryId: string, categoryName: string) => {
    onCategorySelect?.(categoryId, categoryName);
  };

  const handleCloseMenu = () => {
    setShowCategoriesMenu(false);
    setSelectedFilter(null);
  };

  const dynamicStyles = {
    container: {
      position: 'absolute' as const,
      top: 0,
      left: 0,
      right: 0,
      zIndex: 999,
    },
    header: {
      height: isSmallScreen ? 60 : 70,
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      alignItems: 'center' as const,
      paddingHorizontal: isSmallScreen ? 12 : 20,
    },
    logoContainer: {
      height: isSmallScreen ? 25 : 30,
      justifyContent: 'center' as const,
    },
    logo: {
      fontSize: isSmallScreen ? 20 : 24,
      fontWeight: 'bold' as const,
      color: colors.primary,
      letterSpacing: 1.5,
    },
    rightContainer: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: isSmallScreen ? 16 : 20,
    },
    notificationButton: {
      padding: 4,
    },
    userContainer: {
      height: isSmallScreen ? 30 : 35,
      width: isSmallScreen ? 30 : 35,
    },
    avatar: {
      height: '100%' as const,
      width: '100%' as const,
      borderRadius: 3,
    },
  };

  return (
    <Animated.View style={[dynamicStyles.container, { backgroundColor }]}>
      <SafeAreaView>
        <View style={dynamicStyles.header}>
          {/* Logo de DSIView */}
          <TouchableOpacity style={dynamicStyles.logoContainer}>
            <Text style={dynamicStyles.logo}>DSIVIEW</Text>
          </TouchableOpacity>

          {/* Contenedor derecho: Búsqueda + Notificaciones */}
          <View style={dynamicStyles.rightContainer}>
            {/* Botón de búsqueda */}
            <TouchableOpacity 
              style={dynamicStyles.notificationButton}
              onPress={onSearchPress}
            >
              <Ionicons name="search" size={isSmallScreen ? 24 : 26} color={colors.text} />
            </TouchableOpacity>

            {/* Botón de notificaciones */}
            <TouchableOpacity style={dynamicStyles.notificationButton}>
              <Ionicons name="notifications-outline" size={isSmallScreen ? 24 : 26} color={colors.text} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Filtros: Todo, Películas, Series, Anime, Categorías */}
        <View style={styles.filtersContainer}>
          <TouchableOpacity 
            style={[styles.filterButton, selectedFilter === 'all' && styles.filterButtonActive]}
            onPress={() => handleFilterPress('all')}
          >
            <Text style={[styles.filterText, selectedFilter === 'all' && styles.filterTextActive]}>
              Todo
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.filterButton, selectedFilter === 'movies' && styles.filterButtonActive]}
            onPress={() => handleFilterPress('movies')}
          >
            <Text style={[styles.filterText, selectedFilter === 'movies' && styles.filterTextActive]}>
              Películas
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.filterButton, selectedFilter === 'series' && styles.filterButtonActive]}
            onPress={() => handleFilterPress('series')}
          >
            <Text style={[styles.filterText, selectedFilter === 'series' && styles.filterTextActive]}>
              Series
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.filterButton, selectedFilter === 'anime' && styles.filterButtonActive]}
            onPress={() => handleFilterPress('anime')}
          >
            <Text style={[styles.filterText, selectedFilter === 'anime' && styles.filterTextActive]}>
              Anime
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.filterButton}
            onPress={handleCategoriesPress}
          >
            <Text style={styles.filterText}>
              Categorías
            </Text>
            <Ionicons 
              name="chevron-down" 
              size={14} 
              color={colors.textGray} 
              style={{ marginLeft: 4 }}
            />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* Menú de Categorías */}
      <CategoriesMenu
        visible={showCategoriesMenu}
        onClose={handleCloseMenu}
        onSelectCategory={handleCategorySelect}
        currentCategoryId={currentCategoryId}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  filtersContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: 12,
    paddingBottom: 10,
    gap: 12,
  },
  filterButton: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.textGray,
    backgroundColor: 'transparent',
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: colors.text,
    borderColor: colors.text,
  },
  filterText: {
    color: colors.textGray,
    fontSize: 13,
    fontWeight: '500',
  },
  filterTextActive: {
    color: colors.background,
    fontWeight: '600',
  },
});

