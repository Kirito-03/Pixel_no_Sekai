import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useProfile } from './ProfileContext';
import databaseService from '../services/databaseService';

interface MyListContextType {
  myListItems: Set<number>;
  isInMyList: (movieId: number, contentType?: 'movie' | 'tv' | 'anime') => boolean;
  addToMyList: (movieId: number, contentType?: 'movie' | 'tv' | 'anime') => Promise<void>;
  removeFromMyList: (movieId: number, contentType?: 'movie' | 'tv' | 'anime') => Promise<void>;
  toggleMyList: (movieId: number, contentType?: 'movie' | 'tv' | 'anime') => Promise<void>;
  refreshMyList: () => Promise<void>;
  loading: boolean;
}

const MyListContext = createContext<MyListContextType | undefined>(undefined);

interface MyListProviderProps {
  children: ReactNode;
}

export const MyListProvider: React.FC<MyListProviderProps> = ({ children }) => {
  const { currentProfile } = useProfile();
  const [myListItems, setMyListItems] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);

  // Cargar la lista cuando cambie el perfil
  useEffect(() => {
    if (currentProfile) {
      refreshMyList();
    } else {
      setMyListItems(new Set());
    }
  }, [currentProfile]);

  const refreshMyList = async () => {
    if (!currentProfile) return;
    
    setLoading(true);
    try {
      console.log('🔄 Cargando Mi Lista para perfil:', currentProfile.id);
      const items = await databaseService.getMyList(currentProfile.id);
      const movieIds = new Set<number>(items.map((item: { content_id: number }) => item.content_id));
      setMyListItems(movieIds);
      console.log('✅ Mi Lista cargada exitosamente:', movieIds.size, 'items');
    } catch (error) {
      console.error('❌ Error loading my list:', error);
      if (error.code === 'NETWORK_ERROR') {
        console.error('💡 Error de red - verificar conexión al servidor');
      }
      setMyListItems(new Set<number>());
    } finally {
      setLoading(false);
    }
  };

  const isInMyList = (movieId: number, contentType?: 'movie' | 'tv' | 'anime'): boolean => {
    return myListItems.has(movieId);
  };

  const addToMyList = async (movieId: number, contentType: 'movie' | 'tv' | 'anime' = 'movie') => {
    console.log('➕ addToMyList: Starting', { movieId, contentType });
    
    if (!currentProfile) {
      console.log('❌ addToMyList: No current profile');
      throw new Error('No hay perfil seleccionado');
    }

    try {
      console.log('🌐 addToMyList: Calling databaseService.addToMyList', { profileId: currentProfile.id });
      await databaseService.addToMyList(currentProfile.id, movieId, contentType);
      console.log('✅ addToMyList: Database call successful');
      
      setMyListItems(prev => new Set<number>([...prev, movieId]));
      console.log('📝 addToMyList: Local state updated');
    } catch (error) {
      console.error('❌ addToMyList: Error', error);
      throw error;
    }
  };

  const removeFromMyList = async (movieId: number, contentType: 'movie' | 'tv' | 'anime' = 'movie') => {
    console.log('➖ removeFromMyList: Starting', { movieId, contentType });
    
    if (!currentProfile) {
      console.log('❌ removeFromMyList: No current profile');
      throw new Error('No hay perfil seleccionado');
    }

    try {
      console.log('🌐 removeFromMyList: Calling databaseService.removeFromMyList', { profileId: currentProfile.id });
      await databaseService.removeFromMyList(currentProfile.id, movieId, contentType);
      console.log('✅ removeFromMyList: Database call successful');
      
      setMyListItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(movieId);
        return newSet;
      });
      console.log('📝 removeFromMyList: Local state updated');
    } catch (error) {
      console.error('❌ removeFromMyList: Error', error);
      throw error;
    }
  };

  const toggleMyList = async (contentId: number, contentType: 'movie' | 'tv' | 'anime' = 'movie') => {
    console.log('🔄 toggleMyList: Starting', { contentId, contentType });
    
    if (!currentProfile) {
      console.log('❌ toggleMyList: No current profile');
      return;
    }

    const isCurrentlyInList = isInMyList(contentId, contentType);
    console.log('📋 toggleMyList: Current status', { isCurrentlyInList });

    try {
      if (isCurrentlyInList) {
        console.log('➖ toggleMyList: Removing from list');
        await removeFromMyList(contentId, contentType);
      } else {
        console.log('➕ toggleMyList: Adding to list');
        await addToMyList(contentId, contentType);
      }
      
      console.log('🔄 toggleMyList: Refreshing list');
      await refreshMyList();
      console.log('✅ toggleMyList: Success');
    } catch (error) {
      console.error('❌ toggleMyList: Error', error);
      throw error;
    }
  };

  const value: MyListContextType = {
    myListItems,
    isInMyList,
    addToMyList,
    removeFromMyList,
    toggleMyList,
    refreshMyList,
    loading,
  };

  return (
    <MyListContext.Provider value={value}>
      {children}
    </MyListContext.Provider>
  );
};

export const useMyList = (): MyListContextType => {
  const context = useContext(MyListContext);
  if (context === undefined) {
    throw new Error('useMyList must be used within a MyListProvider');
  }
  return context;
};