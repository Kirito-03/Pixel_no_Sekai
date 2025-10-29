/**
 * Configuración de red para la aplicación
 * Maneja automáticamente las diferencias entre desarrollo y producción
 */

import { Platform } from 'react-native';

// Configuración de red
export const NETWORK_CONFIG = {
  // URLs base para diferentes entornos
  BASE_URLS: {
    // Desarrollo local
    development: {
      android: 'http://192.168.107.105:3001',  // IP local para Android emulator
      ios: 'http://192.168.107.105:3001',  // IP local para iOS simulator
      web: 'http://localhost:3001',  // Para web
    },
    // Producción
    production: 'http://localhost:3001',
  },
  
  // Timeouts
  TIMEOUTS: {
    request: 10000,  // 10 segundos
    connection: 5000,  // 5 segundos
  },
  
  // Headers por defecto
  DEFAULT_HEADERS: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
};

/**
 * Obtiene la URL base del servidor según la plataforma y entorno
 */
export const getBaseURL = (): string => {
  if (__DEV__) {
    const platform = Platform.OS as keyof typeof NETWORK_CONFIG.BASE_URLS.development;
    return NETWORK_CONFIG.BASE_URLS.development[platform] || NETWORK_CONFIG.BASE_URLS.development.web;
  }
  return NETWORK_CONFIG.BASE_URLS.production;
};

/**
 * Configuración de Axios para el proyecto
 */
export const axiosConfig = {
  baseURL: getBaseURL(),
  timeout: NETWORK_CONFIG.TIMEOUTS.request,
  headers: NETWORK_CONFIG.DEFAULT_HEADERS,
};

// Log de la configuración en desarrollo
if (__DEV__) {
  console.log('🌐 Network Config:', {
    platform: Platform.OS,
    baseURL: getBaseURL(),
    isDev: __DEV__,
  });
}
