# 🎬 Proyecto Netflix Clone

Una aplicación móvil y web que replica la funcionalidad de Netflix, desarrollada con React Native, Expo y Node.js.

## 📋 Características

- 🔐 **Autenticación completa**: Registro e inicio de sesión de usuarios
- 👤 **Gestión de perfiles**: Múltiples perfiles por usuario (incluido perfil para niños)
- 🎥 **Catálogo de películas**: Integración con TMDB API para contenido actualizado
- 📱 **Responsive**: Funciona en móvil, tablet y web
- ⭐ **Mi Lista**: Funcionalidad para guardar películas favoritas
- 🔍 **Búsqueda**: Buscar películas por título
- 🎨 **UI moderna**: Interfaz inspirada en Netflix con gradientes y animaciones

## 🛠️ Tecnologías utilizadas

### Frontend
- **React Native** 0.81.4
- **Expo** ~54.0.12
- **TypeScript** ~5.9.2
- **React Navigation** 7.x
- **Expo Linear Gradient** para efectos visuales

### Backend
- **Node.js** con Express 4.19.2
- **MySQL** con mysql2 3.9.7
- **bcryptjs** para encriptación de contraseñas
- **CORS** habilitado para desarrollo

### APIs externas
- **TMDB (The Movie Database)** para catálogo de películas

## 🚀 Instalación y configuración

### Prerrequisitos
- Node.js (versión 16 o superior)
- MySQL Server
- Expo CLI (`npm install -g @expo/cli`)

### 1. Clonar el repositorio
```bash
git clone <url-del-repositorio>
cd Proyecto_Netflix
```

### 2. Instalar dependencias

**Frontend:**
```bash
npm install
```

**Backend:**
```bash
cd server
npm install
cd ..
```

### 3. Configurar base de datos MySQL

Este proyecto utiliza las siguientes tablas en la base `bd_netflix`:
- `usuarios`: registro y login de usuarios
- `perfiles`: perfiles de usuario (incluido soporte para niños)
- `listas`: contenedor de la lista "Mi lista" por perfil
- `lista_items`: elementos individuales de "Mi lista"

#### Importar el esquema:
1. Abre phpMyAdmin o tu cliente MySQL preferido
2. Crea la base de datos `bd_netflix` (si no existe)
3. Importa el archivo `server/bd_netflix.sql`
4. Verifica que se crearon las tablas: `usuarios`, `perfiles`, `listas`, `lista_items`

### 4. Variables de entorno

Crea/ajusta el archivo `.env` en la raíz del proyecto:
```env
# Base de datos
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=tu_password_mysql
DB_NAME=bd_netflix

# Backend
BACKEND_URL=http://localhost:3001
# Para dispositivos/emuladores usar IP local:
# Android: http://10.0.2.2:3001
# iOS: http://192.168.107.105:3001

# TMDB API (opcional - para contenido actualizado)
TMDB_API_KEY=tu_api_key_de_tmdb
```

## 🎯 Uso

### Iniciar el backend
```bash
cd server
npm start
# o para desarrollo con auto-reload:
npm run dev
```
El backend estará disponible en `http://localhost:3001`

**Verificar salud del backend:**
```bash
curl http://localhost:3001/health
```
Debe responder: `{"ok": true, ...}`

### Iniciar la aplicación (Expo)
```bash
npm start
```

Opciones disponibles:
- **Web**: Presiona `w` o abre `http://localhost:8081`
- **Android**: Presiona `a` (requiere Android Studio/emulador)
- **iOS**: Presiona `i` (requiere Xcode - solo macOS)
- **Expo Go**: Escanea el QR con la app Expo Go

## 📱 Funcionalidades principales

### Autenticación
- **Registro**: `RegisterScreen.tsx` → `POST /auth/register`
- **Login**: `LoginScreen.tsx` → `POST /auth/login`

### Gestión de perfiles
- **Selección**: `ProfileSelectionScreen.tsx` → `GET /profiles`
- **Creación**: Crear nuevos perfiles → `POST /profiles`
- **Perfil para niños**: Soporte completo para contenido infantil

### Contenido
- **Catálogo**: Películas populares, mejor valoradas, próximos estrenos
- **Detalles**: Información completa de películas con trailers
- **Búsqueda**: Buscar por título en tiempo real
- **Mi Lista**: `GET/POST/DELETE /my-list/...` → gestión de favoritos

## 🏗️ Estructura del proyecto

```
Proyecto_Netflix/
├── components/          # Componentes reutilizables
│   ├── Header.tsx
│   ├── MovieCard.tsx
│   ├── MovieModal.tsx
│   └── ...
├── screens/            # Pantallas de la aplicación
│   ├── HomeScreen.tsx
│   ├── LoginScreen.tsx
│   ├── ProfileScreen.tsx
│   └── ...
├── contexts/           # Context API para estado global
│   ├── ProfileContext.tsx
│   └── MyListContext.tsx
├── services/           # Servicios y APIs
│   ├── api.ts         # TMDB API
│   └── databaseService.ts
├── server/             # Backend Node.js
│   ├── index.js       # Servidor Express
│   ├── bd_netflix.sql # Esquema de BD
│   └── package.json
├── navigation/         # Configuración de navegación
├── assets/            # Recursos (iconos, imágenes)
└── types.ts           # Definiciones TypeScript
```

## 🔧 Scripts disponibles

### Frontend
- `npm start` - Inicia Expo development server
- `npm run android` - Inicia en Android
- `npm run ios` - Inicia en iOS
- `npm run web` - Inicia versión web

### Backend
- `npm start` - Inicia servidor de producción
- `npm run dev` - Inicia con nodemon (desarrollo)

## ⚠️ Solución de problemas

### Errores comunes

**Error 409 al registrar:**
- El email ya existe en la base de datos
- Usa un email diferente o verifica la tabla `usuarios`

**Error 401 al iniciar sesión:**
- Credenciales incorrectas
- Verifica email y contraseña

**Error de conexión a la base de datos:**
- Verifica que MySQL esté ejecutándose
- Revisa las credenciales en `.env`
- Confirma que la base `bd_netflix` existe

**Problemas con Expo:**
- Ejecuta `expo doctor` para diagnosticar
- Limpia caché: `expo start -c`
- Reinstala dependencias: `rm -rf node_modules && npm install`

## 🤝 Contribución

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto es de uso educativo y no tiene fines comerciales.

## 🙏 Agradecimientos

- [TMDB](https://www.themoviedb.org/) por proporcionar la API de películas
- [Expo](https://expo.dev/) por facilitar el desarrollo multiplataforma
- Inspirado en la interfaz de Netflix

