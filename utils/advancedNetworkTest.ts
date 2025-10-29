/**
 * Script avanzado de prueba de conectividad
 * Prueba múltiples IPs para encontrar la correcta
 */

import axios from 'axios';
import { Platform } from 'react-native';

// Lista de IPs a probar en orden de preferencia
const IP_CANDIDATES = [
  '192.168.107.105',  // IP local detectada
  '10.0.2.2',         // IP especial Android emulator
  'localhost',        // Localhost
  '127.0.0.1',       // Loopback
];

const PORT = 3001;

export const findWorkingIP = async (): Promise<string | null> => {
  console.log('🔍 Buscando IP funcional para el servidor...');
  
  for (const ip of IP_CANDIDATES) {
    const url = `http://${ip}:${PORT}/health`;
    console.log(`   Probando: ${url}`);
    
    try {
      const response = await axios.get(url, { 
        timeout: 3000,
        headers: {
          'Accept': 'application/json',
        }
      });
      
      if (response.status === 200 && response.data?.ok) {
        console.log(`✅ IP funcional encontrada: ${ip}`);
        return ip;
      }
    } catch (error) {
      console.log(`❌ ${ip}: ${error.message}`);
    }
  }
  
  console.log('❌ No se encontró ninguna IP funcional');
  return null;
};

export const testAllConnections = async () => {
  console.log('🧪 Probando todas las conexiones posibles...');
  
  const workingIP = await findWorkingIP();
  
  if (workingIP) {
    console.log(`🎉 Usar esta IP en la configuración: ${workingIP}`);
    console.log(`   URL completa: http://${workingIP}:${PORT}`);
    
    // Probar endpoints adicionales
    try {
      const baseURL = `http://${workingIP}:${PORT}`;
      
      // Probar endpoint de perfiles
      const profilesResponse = await axios.get(`${baseURL}/profiles`, { timeout: 5000 });
      console.log('✅ Endpoint de perfiles accesible');
      
      // Probar endpoint de contenido
      const contentResponse = await axios.get(`${baseURL}/content`, { timeout: 5000 });
      console.log('✅ Endpoint de contenido accesible');
      
    } catch (error) {
      console.log('⚠️ Algunos endpoints pueden tener problemas:', error.message);
    }
    
    return workingIP;
  } else {
    console.log('❌ No se pudo conectar al servidor');
    console.log('💡 Verificar que el servidor esté ejecutándose:');
    console.log('   cd server && npm run dev');
    return null;
  }
};

// Función para mostrar información detallada
export const showDetailedNetworkInfo = () => {
  console.log('🌐 Información detallada de red:');
  console.log('   Plataforma:', Platform.OS);
  console.log('   Entorno:', __DEV__ ? 'Desarrollo' : 'Producción');
  console.log('   Puerto del servidor:', PORT);
  console.log('   IPs a probar:', IP_CANDIDATES.join(', '));
};
