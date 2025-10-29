/**
 * Utilidad para detectar automáticamente la IP local
 * Útil para configurar la URL del servidor en desarrollo
 */

import { Platform } from 'react-native';

/**
 * Obtiene la IP local automáticamente
 * En desarrollo, intenta detectar la IP de la red local
 */
export const getLocalIP = (): string => {
  // En desarrollo, usar la IP que funciona
  if (__DEV__) {
    // Para Android emulator, usar la IP local que funciona
    if (Platform.OS === 'android') {
      return '192.168.107.105'; // IP local que funciona
    }
    
    // Para iOS simulator, usar localhost
    if (Platform.OS === 'ios') {
      return 'localhost';
    }
    
    // Para web, usar localhost
    return 'localhost';
  }
  
  // En producción, usar localhost
  return 'localhost';
};

/**
 * Construye la URL completa del servidor
 */
export const buildServerURL = (port: number = 3001): string => {
  const ip = getLocalIP();
  return `http://${ip}:${port}`;
};

/**
 * Configuración de red dinámica
 */
export const DYNAMIC_NETWORK_CONFIG = {
  getBaseURL: () => buildServerURL(),
  getHealthURL: () => `${buildServerURL()}/health`,
  getProfilesURL: () => `${buildServerURL()}/profiles`,
  getMyListURL: (profileId: number) => `${buildServerURL()}/my-list/${profileId}`,
};

// Log de la configuración en desarrollo
if (__DEV__) {
  console.log('🌐 Dynamic Network Config:', {
    platform: Platform.OS,
    localIP: getLocalIP(),
    serverURL: buildServerURL(),
    isDev: __DEV__,
  });
}
