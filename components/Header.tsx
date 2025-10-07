import React, { useEffect, useRef } from 'react';
import { View, Image, Text, TouchableOpacity, StyleSheet, SafeAreaView, Animated, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';

interface HeaderProps {
  black?: boolean;
  onProfilePress?: () => void;
}

export default function Header({ black = false, onProfilePress }: HeaderProps) {
  const { width } = useWindowDimensions();
  const isSmallScreen = width < 768;
  
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

          {/* Contenedor derecho: Notificaciones + Avatar */}
          <View style={dynamicStyles.rightContainer}>
            {/* Botón de notificaciones */}
            <TouchableOpacity style={dynamicStyles.notificationButton}>
              <Ionicons name="notifications-outline" size={isSmallScreen ? 24 : 26} color={colors.text} />
            </TouchableOpacity>

            {/* Avatar de usuario */}
            <TouchableOpacity 
              style={dynamicStyles.userContainer}
              onPress={onProfilePress}
            >
              <Image
                source={{ uri: 'https://upload.wikimedia.org/wikipedia/commons/0/0b/Netflix-avatar.png' }}
                style={dynamicStyles.avatar}
              />
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </Animated.View>
  );
}

