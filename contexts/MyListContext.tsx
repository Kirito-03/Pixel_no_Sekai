import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useProfile } from './ProfileContext';
import databaseService from '../services/databaseService';
import { db, auth } from '../services/firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';

interface MyListContextType {
  // Guardamos claves compuestas con el tipo para evitar colisiones entre TMDB y AniList
  myListItems: Set<string>;
  isInMyList: (contentId: number, contentType?: 'movie' | 'tv' | 'anime') => boolean;
  addToMyList: (contentId: number, contentType?: 'movie' | 'tv' | 'anime') => Promise<void>;
  removeFromMyList: (contentId: number, contentType?: 'movie' | 'tv' | 'anime') => Promise<void>;
  toggleMyList: (contentId: number, contentType?: 'movie' | 'tv' | 'anime') => Promise<void>;
  refreshMyList: () => Promise<void>;
  loading: boolean;
}

const MyListContext = createContext<MyListContextType | undefined>(undefined);

interface MyListProviderProps {
  children: ReactNode;
}

export const MyListProvider: React.FC<MyListProviderProps> = ({ children }) => {
  const { currentProfile } = useProfile();
  const [myListItems, setMyListItems] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Escuchar cambios en el estado de autenticación
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user: any) => {
      setIsAuthenticated(!!user);
    });
    return () => unsubscribe();
  }, []);

  // Cargar la lista cuando cambie el perfil O cuando se complete la autenticación
  useEffect(() => {
    if (currentProfile && isAuthenticated) {
      refreshMyList();
    } else if (!currentProfile) {
      setMyListItems(new Set());
    }
  }, [currentProfile, isAuthenticated]);

  useEffect(() => {
    if (!currentProfile) return;
    if (!auth.currentUser) return;
    const uid = auth.currentUser.uid;
    const ref = collection(db, `profiles/${uid}/profiles/${currentProfile.id}/mylist`);
    const q = query(ref, orderBy('added_at', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const keyed = new Set<string>(
        snap.docs.map((d) => {
          const data = d.data() as { content_id: number; content_type: 'movie' | 'tv' | 'anime' };
          const typeRaw = String(data.content_type ?? '').toLowerCase();
          const type = typeRaw === 'movie' || typeRaw === 'tv' || typeRaw === 'anime' ? typeRaw : 'movie';
          return `${type}:${data.content_id}`;
        })
      );
      setMyListItems(keyed);
    });
    return () => unsub();
  }, [currentProfile]);

  const refreshMyList = async () => {
    if (!currentProfile) return;

    // Esperar a que el usuario esté autenticado antes de cargar
    if (!auth.currentUser) {
      console.log('⏳ refreshMyList: Esperando autenticación...');
      return;
    }

    setLoading(true);
    try {
      console.log('🔄 refreshMyList: Cargando Mi Lista para perfil:', currentProfile.id);
      const items = await databaseService.getMyList(currentProfile.id);
      console.log('🔄 refreshMyList: Items recibidos del backend:', items);

      // Crear claves únicas por tipo para evitar colisiones (ej: 'anime:12345')
      // Normalizamos el tipo por si el backend envía variantes de casing
      const keyed = new Set<string>(
        items.map((item: { content_id: number; content_type: 'movie' | 'tv' | 'anime' }) => {
          const typeRaw = String(item.content_type ?? '').toLowerCase();
          let type: 'movie' | 'tv' | 'anime';

          if (typeRaw === 'movie' || typeRaw === 'tv' || typeRaw === 'anime') {
            type = typeRaw;
          } else {
            // Fallback: si el backend devuelve tipo vacío por un ENUM inválido, intentamos inferir
            // Si ya existe la clave 'anime:<id>' en el estado previo, asumimos que es anime
            if (myListItems.has(`anime:${item.content_id}`)) {
              type = 'anime';
              console.warn(`⚠️ refreshMyList: content_type vacío para ID ${item.content_id}. Inferido como 'anime' por estado previo.`);
            } else {
              // Como último recurso, mantenemos compatibilidad con el comportamiento previo
              type = 'movie';
              console.warn(`⚠️ refreshMyList: content_type inválido ('${typeRaw}') para ID ${item.content_id}. Usando fallback 'movie'.`);
            }
          }

          const key = `${type}:${item.content_id}`;
          console.log(`🔄 refreshMyList: Procesando item - ID: ${item.content_id}, Type: ${item.content_type} -> ${type}, Key: ${key}`);
          return key;
        })
      );
      setMyListItems(keyed);
      console.log('✅ refreshMyList: Mi Lista cargada exitosamente:', keyed.size, 'items');
      console.log('✅ refreshMyList: Claves finales:', Array.from(keyed));
    } catch (error) {
      console.error('❌ refreshMyList: Error loading my list:', error);
      if (error instanceof Error && 'code' in error && error.code === 'NETWORK_ERROR') {
        console.error('❌ refreshMyList: Error de red - verificar conexión al servidor');
      }
      setMyListItems(new Set<string>());
    } finally {
      setLoading(false);
    }
  };

  const isInMyList = (contentId: number, contentType: 'movie' | 'tv' | 'anime' = 'movie'): boolean => {
    const key = `${contentType}:${contentId}`;
    return myListItems.has(key);
  };

  const addToMyList = async (contentId: number, contentType: 'movie' | 'tv' | 'anime' = 'movie') => {
    console.log('➕ addToMyList: Starting', { contentId, contentType, profileId: currentProfile?.id });

    if (!currentProfile) {
      console.log('❌ addToMyList: No current profile');
      throw new Error('No hay perfil seleccionado');
    }

    try {
      console.log('➕ addToMyList: Calling databaseService.addToMyList', {
        profileId: currentProfile.id,
        contentId,
        contentType
      });

      const result = await databaseService.addToMyList(currentProfile.id, contentId, contentType);
      console.log('✅ addToMyList: Database call successful, result:', result);

      const key = `${contentType}:${contentId}`;
      setMyListItems(prev => {
        const newSet = new Set<string>([...prev, key]);
        console.log('✅ addToMyList: Local state updated, new key:', key);
        console.log('✅ addToMyList: All keys now:', Array.from(newSet));
        return newSet;
      });
    } catch (error) {
      console.error('❌ addToMyList: Error', error);
      if (error instanceof Error) {
        console.error('❌ addToMyList: Error message:', error.message);
        console.error('❌ addToMyList: Error stack:', error.stack);
      }
      throw error;
    }
  };

  const removeFromMyList = async (contentId: number, contentType: 'movie' | 'tv' | 'anime' = 'movie') => {
    console.log('➖ removeFromMyList: Starting', { contentId, contentType, profileId: currentProfile?.id });

    if (!currentProfile) {
      console.log('❌ removeFromMyList: No current profile');
      throw new Error('No hay perfil seleccionado');
    }

    try {
      console.log('➖ removeFromMyList: Calling databaseService.removeFromMyList', {
        profileId: currentProfile.id,
        contentId,
        contentType
      });

      const result = await databaseService.removeFromMyList(currentProfile.id, contentId, contentType);
      console.log('✅ removeFromMyList: Database call successful, result:', result);

      setMyListItems(prev => {
        const newSet = new Set(prev);
        const key = `${contentType}:${contentId}`;
        const wasDeleted = newSet.delete(key);
        console.log('✅ removeFromMyList: Local state updated, removed key:', key, 'was present:', wasDeleted);
        console.log('✅ removeFromMyList: All keys now:', Array.from(newSet));
        return newSet;
      });
    } catch (error) {
      console.error('❌ removeFromMyList: Error', error);
      if (error instanceof Error) {
        console.error('❌ removeFromMyList: Error message:', error.message);
        console.error('❌ removeFromMyList: Error stack:', error.stack);
      }
      throw error;
    }
  };

  const toggleMyList = async (contentId: number, contentType: 'movie' | 'tv' | 'anime' = 'movie') => {
    console.log('🔄 toggleMyList: Starting', { contentId, contentType, profileId: currentProfile?.id });

    if (!currentProfile) {
      console.log('❌ toggleMyList: No current profile');
      return;
    }

    const isCurrentlyInList = isInMyList(contentId, contentType);
    const key = `${contentType}:${contentId}`;
    console.log('🔄 toggleMyList: Current status', {
      isCurrentlyInList,
      key,
      allKeys: Array.from(myListItems)
    });

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
      if (error instanceof Error) {
        console.error('❌ toggleMyList: Error message:', error.message);
      }
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