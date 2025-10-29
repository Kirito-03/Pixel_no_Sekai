/**
 * Script de prueba de conectividad para React Native
 * Ejecutar en la consola de React Native para probar la conexión
 */

import { DYNAMIC_NETWORK_CONFIG } from './networkUtils';
import axios from 'axios';

export const testConnection = async () => {
  const baseURL = DYNAMIC_NETWORK_CONFIG.getBaseURL();
  console.log('🧪 Probando conexión a:', baseURL);
  
  try {
    // Probar endpoint de salud
    const healthResponse = await axios.get(`${baseURL}/health`, { timeout: 5000 });
    console.log('✅ Health check exitoso:', healthResponse.data);
    
    // Probar endpoint de perfiles (sin parámetros para ver el error)
    try {
      const profilesResponse = await axios.get(`${baseURL}/profiles`, { timeout: 5000 });
      console.log('✅ Profiles endpoint accesible:', profilesResponse.data);
    } catch (error) {
      if (error.response?.status === 400) {
        console.log('✅ Profiles endpoint accesible (error esperado sin userId)');
      } else {
        throw error;
      }
    }
    
    console.log('🎉 ¡Conexión exitosa! El servidor está funcionando correctamente.');
    return true;
    
  } catch (error) {
    console.error('❌ Error de conexión:', error.message);
    if (error.code === 'NETWORK_ERROR' || error.code === 'ECONNREFUSED') {
      console.error('💡 Sugerencias:');
      console.error('   - Verificar que el servidor esté ejecutándose en el puerto 3001');
      console.error('   - Verificar la IP en config/network.ts');
      console.error('   - Para Android emulator usar: http://10.0.2.2:3001');
      console.error('   - Para iOS simulator usar la IP local de tu máquina');
    }
    return false;
  }
};

// Función para mostrar información de red
export const showNetworkInfo = () => {
  const baseURL = getBaseURL();
  console.log('🌐 Información de red:');
  console.log('   Base URL:', baseURL);
  console.log('   Entorno:', __DEV__ ? 'Desarrollo' : 'Producción');
  console.log('   Plataforma:', Platform.OS);
};
