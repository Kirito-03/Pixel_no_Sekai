import React, { useRef, useState } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  useWindowDimensions,
  PanResponder,
  Platform,
  GestureResponderHandlers
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Movie, TVShow, ContentItem } from '../types';
import MovieCard from './MovieCard';
import { colors, spacing } from '../theme';

interface Props {
  title: string;
  movies: (Movie | TVShow | ContentItem)[];
  onMoviePress: (id: number) => void;
}

export default function MovieRow({ title, movies, onMoviePress }: Props) {
  const { width } = useWindowDimensions();
  const isSmallScreen = width < 768;
  const CARD_WIDTH = isSmallScreen ? width * 0.32 : 130;
  const CARD_MARGIN = isSmallScreen ? 8 : 10;
  const TOTAL_CARD_WIDTH = CARD_WIDTH + CARD_MARGIN;
  const CARDS_PER_SCREEN = Math.floor(width / TOTAL_CARD_WIDTH);
  const SCROLL_AMOUNT = TOTAL_CARD_WIDTH * CARDS_PER_SCREEN;
  
  const flatListRef = useRef<FlatList<Movie | TVShow | ContentItem>>(null);
  const [scrollX, setScrollX] = useState(0);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);
  
  const scrollXRef = useRef(0);
  const isDragging = useRef(false);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => Platform.OS === 'web',
      onMoveShouldSetPanResponder: () => Platform.OS === 'web',

      onPanResponderGrant: () => {
        scrollXRef.current = scrollX;
        isDragging.current = true;
      },

      onPanResponderMove: (_, gestureState) => {
        // Velocidad mínima: factor de 0.3 (mucho más lento)
        const newOffset = scrollXRef.current - (gestureState.dx * 0.3);
        flatListRef.current?.scrollToOffset({ offset: newOffset, animated: false });
      },

      onPanResponderRelease: () => {
        isDragging.current = false;
      },
    })
  ).current;


  const handleLeftArrow = () => {
    const newPosition = Math.max(0, scrollX - SCROLL_AMOUNT);
    flatListRef.current?.scrollToOffset({ 
      offset: newPosition, 
      animated: true 
    });
  };

  const handleRightArrow = () => {
    const newPosition = scrollX + SCROLL_AMOUNT;
    flatListRef.current?.scrollToOffset({ 
      offset: newPosition, 
      animated: true 
    });
  };

  const handleScroll = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const contentWidth = event.nativeEvent.contentSize.width;
    const layoutWidth = event.nativeEvent.layoutMeasurement.width;
    const maxScroll = contentWidth - layoutWidth;
    
    // Sincronizamos el estado de la posición de scroll
    setScrollX(offsetX);
    scrollXRef.current = offsetX;

    // Lógica para mostrar/ocultar las flechas
    setShowLeftArrow(offsetX > 5);
    setShowRightArrow(offsetX < maxScroll - 5);
  };

  const dynamicStyles = {
    container: {
      marginBottom: isSmallScreen ? spacing.md : spacing.lg,
    },
    title: {
      fontSize: isSmallScreen ? 17 : 20,
      fontWeight: 'bold' as const,
      color: colors.text,
      marginBottom: isSmallScreen ? spacing.sm : spacing.md,
      marginLeft: isSmallScreen ? spacing.md : spacing.md,
    },
    listContainer: {
      position: 'relative' as const,
    },
    list: {
      paddingHorizontal: isSmallScreen ? spacing.sm : spacing.md,
      paddingVertical: isSmallScreen ? 6 : 4,
      minHeight: isSmallScreen ? 200 : 180,
    },
    arrow: {
      position: 'absolute' as const,
      top: 0,
      bottom: 0,
      width: isSmallScreen ? 0 : 50,
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
      zIndex: 99,
    },
    leftArrow: {
      left: 0,
      borderTopRightRadius: 4,
      borderBottomRightRadius: 4,
    },
    rightArrow: {
      right: 0,
      borderTopLeftRadius: 4,
      borderBottomLeftRadius: 4,
    },
  };

  return (
    <View style={dynamicStyles.container}>
      <Text style={dynamicStyles.title}>{title}</Text>
      
      <View 
        style={[
          dynamicStyles.listContainer,
          Platform.OS === 'web' && ({ cursor: 'grab' } as any)
        ]} 
        {...(panResponder.panHandlers as GestureResponderHandlers)}
      >
        {showLeftArrow && !isSmallScreen && (
          <TouchableOpacity 
            style={[
              dynamicStyles.arrow, 
              dynamicStyles.leftArrow,
              Platform.OS === 'web' && ({ cursor: 'pointer' } as any)
            ]}
            onPress={handleLeftArrow}
            activeOpacity={0.8}
          >
            <Ionicons name="chevron-back" size={40} color={colors.text} />
          </TouchableOpacity>
        )}

        <FlatList
          ref={flatListRef}
          data={movies}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <MovieCard movie={item} onPress={() => onMoviePress(item.id)} />
          )}
          contentContainerStyle={dynamicStyles.list}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          scrollEnabled={Platform.OS !== 'web'} 
        />

        {showRightArrow && !isSmallScreen && (
          <TouchableOpacity 
            style={[
              dynamicStyles.arrow, 
              dynamicStyles.rightArrow,
              Platform.OS === 'web' && ({ cursor: 'pointer' } as any)
            ]}
            onPress={handleRightArrow}
            activeOpacity={0.8}
          >
            <Ionicons name="chevron-forward" size={40} color={colors.text} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}