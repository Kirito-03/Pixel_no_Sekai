import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Profile {
  id: number;
  name: string;
  avatar_url: string;
  usuario_id: number;
}

interface ProfileContextType {
  currentProfile: Profile | null;
  setCurrentProfile: (profile: Profile | null) => void;
  loadCurrentProfile: () => Promise<void>;
  clearCurrentProfile: () => Promise<void>;
  // Preferencias por perfil
  adultContentEnabled: boolean;
  setAdultContentEnabled: (enabled: boolean) => Promise<void>;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

interface ProfileProviderProps {
  children: ReactNode;
}

export const ProfileProvider: React.FC<ProfileProviderProps> = ({ children }) => {
  const [currentProfile, setCurrentProfileState] = useState<Profile | null>(null);
  const [adultContentEnabled, setAdultContentEnabledState] = useState<boolean>(false);

  const setCurrentProfile = async (profile: Profile | null) => {
    console.log('ProfileContext: Setting current profile:', profile);
    setCurrentProfileState(profile);
    if (profile) {
      await AsyncStorage.setItem('currentProfile', JSON.stringify(profile));
      console.log('ProfileContext: Profile saved to AsyncStorage');
      // Cargar preferencia de +18 asociada al perfil
      try {
        const stored = await AsyncStorage.getItem(`adultContentEnabled:${profile.id}`);
        if (stored !== null) {
          const parsed = JSON.parse(stored);
          setAdultContentEnabledState(Boolean(parsed));
        } else {
          setAdultContentEnabledState(false);
        }
      } catch (err) {
        console.warn('ProfileContext: No se pudo cargar preferencia +18, usando false por defecto');
        setAdultContentEnabledState(false);
      }
    } else {
      await AsyncStorage.removeItem('currentProfile');
      console.log('ProfileContext: Profile removed from AsyncStorage');
      setAdultContentEnabledState(false);
    }
  };

  const loadCurrentProfile = async () => {
    try {
      console.log('ProfileContext: Loading current profile...');
      const profileData = await AsyncStorage.getItem('currentProfile');
      console.log('ProfileContext: Profile data from storage:', profileData);
      if (profileData) {
        const profile = JSON.parse(profileData);
        console.log('ProfileContext: Parsed profile:', profile);
        setCurrentProfileState(profile);
        // Cargar preferencia de +18 para el perfil
        try {
          const stored = await AsyncStorage.getItem(`adultContentEnabled:${profile.id}`);
          if (stored !== null) {
            setAdultContentEnabledState(Boolean(JSON.parse(stored)));
          } else {
            setAdultContentEnabledState(false);
          }
        } catch (err) {
          setAdultContentEnabledState(false);
        }
      } else {
        console.log('ProfileContext: No profile found in storage');
      }
    } catch (error) {
      console.error('Error loading current profile:', error);
    }
  };

  const clearCurrentProfile = async () => {
    setCurrentProfileState(null);
    await AsyncStorage.removeItem('currentProfile');
    setAdultContentEnabledState(false);
  };

  const setAdultContentEnabled = async (enabled: boolean) => {
    setAdultContentEnabledState(enabled);
    const profileId = currentProfile?.id;
    if (profileId) {
      try {
        await AsyncStorage.setItem(`adultContentEnabled:${profileId}`, JSON.stringify(enabled));
      } catch (err) {
        console.warn('ProfileContext: No se pudo guardar preferencia +18');
      }
    }
  };

  useEffect(() => {
    loadCurrentProfile();
  }, []);

  const value: ProfileContextType = {
    currentProfile,
    setCurrentProfile,
    loadCurrentProfile,
    clearCurrentProfile,
    adultContentEnabled,
    setAdultContentEnabled,
  };

  return (
    <ProfileContext.Provider value={value}>
      {children}
    </ProfileContext.Provider>
  );
};

export const useProfile = (): ProfileContextType => {
  const context = useContext(ProfileContext);
  if (context === undefined) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }
  return context;
};