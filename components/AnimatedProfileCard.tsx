import React, { useEffect } from 'react';
import { TouchableOpacity, Text, Image, View, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withDelay } from 'react-native-reanimated';

interface Profile {
  id: number;
  name: string;
  avatar_url?: string;
}

interface AnimatedProfileCardProps {
  profile: Profile;
  index: number;
  onPress: () => void;
  onLongPress: () => void;
  getCorrectedAvatarUrl: (url: string) => string;
}

export const AnimatedProfileCard: React.FC<AnimatedProfileCardProps> = ({
  profile,
  index,
  onPress,
  onLongPress,
  getCorrectedAvatarUrl,
}) => {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(20);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
      transform: [{ translateY: translateY.value }],
    };
  });

  useEffect(() => {
    opacity.value = withDelay(index * 100, withTiming(1, { duration: 500 }));
    translateY.value = withDelay(index * 100, withTiming(0, { duration: 500 }));
  }, []);

  return (
    <Animated.View style={[styles.profileCard, animatedStyle]}>
      <TouchableOpacity onPress={onPress} onLongPress={onLongPress}>
        <View style={[styles.avatarContainer, { backgroundColor: '#333' }]}>
          {profile.avatar_url && (
            <Image
              source={{ uri: getCorrectedAvatarUrl(profile.avatar_url) || '' }}
              style={{ width: 80, height: 80, borderRadius: 40 }}
            />
          )}
        </View>
        <Text style={styles.profileName}>{profile.name}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  profileCard: {
    alignItems: 'center',
    width: 120,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    overflow: 'hidden',
  },
  profileName: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
  },
});
