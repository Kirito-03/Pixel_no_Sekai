# Solución de Problemas de Conectividad

## Error: Network Error al cargar "Mi Lista"

Si ves el error `[AxiosError: Network Error]` en la aplicación, sigue estos pasos:

### 1. Verificar que el servidor esté ejecutándose

```bash
# En la carpeta server/
npm run dev
```

El servidor debe mostrar:
```
Backend escuchando en http://localhost:3001
```

### 2. Probar la conexión desde la terminal

```bash
curl http://localhost:3001/health
```

Debe responder: `{"ok":true,"rows":[{"ok":1}]}`

### 3. Verificar la configuración de red

El problema más común es que React Native no puede acceder a `localhost` desde dispositivos/emuladores.

#### Para Android Emulator:
- Usar: `http://10.0.2.2:3001`
- Esta IP especial redirige al localhost de la máquina host

#### Para iOS Simulator:
- Usar la IP local de tu máquina (ej: `http://192.168.107.105:3001`)
- Encontrar tu IP con: `ipconfig` (Windows) o `ifconfig` (Mac/Linux)

### 4. Configuración automática

El proyecto ya está configurado para detectar automáticamente la plataforma:

```typescript
// config/network.ts
const BASE_URL = __DEV__ 
  ? Platform.OS === 'android' 
    ? 'http://10.0.2.2:3001'  // Android emulator
    : 'http://192.168.107.105:3001'  // iOS simulator
  : 'http://localhost:3001';  // Producción
```

### 5. Usar el componente de diagnóstico

Agregar temporalmente el componente `NetworkDiagnostic` a tu pantalla para probar la conexión:

```typescript
import NetworkDiagnostic from '../components/NetworkDiagnostic';

// En tu componente
<NetworkDiagnostic onConnectionTest={(success) => {
  console.log('Conexión:', success ? 'Exitosa' : 'Fallida');
}} />
```

### 6. Verificar firewall y antivirus

Asegúrate de que el puerto 3001 no esté bloqueado por:
- Windows Firewall
- Antivirus
- Software de seguridad

### 7. Soluciones adicionales

#### Si usas un dispositivo físico:
1. Asegúrate de que el dispositivo esté en la misma red WiFi
2. Usa la IP local de tu máquina en lugar de localhost
3. Verifica que el puerto 3001 esté abierto

#### Si usas un emulador:
1. **Android**: Usar `10.0.2.2:3001`
2. **iOS**: Usar la IP local de tu máquina

#### Si usas Expo:
1. Usar `exp://192.168.x.x:8081` para la URL de desarrollo
2. Configurar el servidor para aceptar conexiones desde la IP de Expo

### 8. Logs útiles

Revisar los logs de React Native para más detalles:

```bash
# Android
npx react-native log-android

# iOS
npx react-native log-ios
```

### 9. Reiniciar servicios

Si nada funciona, intenta:
1. Reiniciar el servidor backend
2. Reiniciar el emulador/dispositivo
3. Limpiar caché de React Native: `npx react-native start --reset-cache`

### 10. Verificación final

Una vez solucionado, deberías ver en los logs:
```
✅ Mi Lista cargada exitosamente: X items
```

En lugar de:
```
❌ Error loading my list: [AxiosError: Network Error]
```
