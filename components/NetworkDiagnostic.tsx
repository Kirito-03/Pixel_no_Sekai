import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { testAllConnections, showDetailedNetworkInfo } from '../utils/advancedNetworkTest';

interface NetworkDiagnosticProps {
  onConnectionTest?: (success: boolean) => void;
}

export const NetworkDiagnostic: React.FC<NetworkDiagnosticProps> = ({ onConnectionTest }) => {
  const [testing, setTesting] = useState(false);
  const [lastResult, setLastResult] = useState<string>('');

  const handleTestConnection = async () => {
    setTesting(true);
    setLastResult('');
    
    try {
      // Mostrar información de red
      showDetailedNetworkInfo();
      
      // Probar todas las conexiones
      const workingIP = await testAllConnections();
      const success = workingIP !== null;
      
      setLastResult(success ? `✅ Conexión exitosa (${workingIP})` : '❌ Error de conexión');
      
      if (onConnectionTest) {
        onConnectionTest(success);
      }
      
      if (!success) {
        Alert.alert(
          'Error de Conexión',
          'No se pudo conectar al servidor. Verifica que esté ejecutándose en el puerto 3001.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'Conexión Exitosa',
          `Servidor encontrado en: ${workingIP}:3001`,
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      setLastResult('❌ Error inesperado');
      console.error('Error en test de conexión:', error);
    } finally {
      setTesting(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Diagnóstico de Red</Text>
      
      <TouchableOpacity
        style={[styles.button, testing && styles.buttonDisabled]}
        onPress={handleTestConnection}
        disabled={testing}
      >
        <Text style={styles.buttonText}>
          {testing ? 'Probando...' : 'Probar Conexión'}
        </Text>
      </TouchableOpacity>
      
      {lastResult ? (
        <Text style={styles.result}>{lastResult}</Text>
      ) : null}
      
      <Text style={styles.info}>
        Este componente prueba la conexión al servidor backend.
        Útil para diagnosticar problemas de red en desarrollo.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    margin: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#e50914',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
  },
  buttonDisabled: {
    backgroundColor: '#666',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  result: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 15,
    fontWeight: 'bold',
  },
  info: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    lineHeight: 16,
  },
});

export default NetworkDiagnostic;
