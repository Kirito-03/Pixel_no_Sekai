# 🎬 Clon de Netflix - React Native + Expo + TypeScript

## 📁 Estructura del Proyecto

```
Proyecto_Netflix/
├── components/              # Componentes reutilizables
│   ├── Header.tsx          # Header con logo y avatar
│   ├── MovieCard.tsx       # Card de película
│   ├── MovieRow.tsx        # Fila horizontal de películas
│   ├── FeaturedMovie.tsx   # Película destacada principal
│   └── MovieModal.tsx      # Modal con trailer de YouTube
├── screens/                # Pantallas de la app
│   ├── HomeScreen.tsx      # Pantalla principal
│   ├── SearchScreen.tsx    # Búsqueda de películas
│   ├── MovieDetailScreen.tsx  # Detalles de película
│   ├── ProfileScreen.tsx   # Perfil del usuario
│   └── LoginScreen.tsx     # Pantalla de login
├── navigation/             # Navegación
│   └── AppNavigator.tsx    # Configuración de rutas
├── services/              # Servicios API
│   └── api.ts             # Integración con TMDB API
├── types.ts               # Tipos TypeScript
├── theme.ts               # Colores y estilos
└── App.tsx               # Punto de entrada
```

## 🚀 Cómo empezar

### 1. Obtener API Key de TMDB (GRATIS)

1. Ve a: https://www.themoviedb.org/signup
2. Crea una cuenta
3. Ve a: https://www.themoviedb.org/settings/api
4. Solicita una API Key (es gratis e instantánea)
5. Copia tu API Key

### 2. API Key ya está configurada ✅

Tu API Key de TMDB ya está en el archivo `services/api.ts`

### 3. Ejecutar el proyecto

```bash
cd Proyecto_Netflix
npm start
```

Luego presiona:
- `a` para abrir en Android
- `i` para abrir en iOS
- Escanea el QR con Expo Go desde tu móvil

## ✅ Características

### 🏠 Home Screen
- ✅ **Header animado**: Logo Netflix + Avatar (se vuelve negro al hacer scroll)
- ✅ **Película destacada**: Vista completa con gradientes, info y botones
- ✅ **Filas de películas**: Populares y mejor valoradas
- ✅ **Scroll infinito**: Navegación fluida

### 🔍 Búsqueda
- ✅ **Búsqueda en tiempo real**: Escribe y busca películas
- ✅ **Grid de resultados**: 3 columnas responsive
- ✅ **Modal de trailer**: Click en película para ver trailer

### 🎬 Película Destacada (FeaturedMovie)
- ✅ **Imagen de fondo completa**
- ✅ **Gradientes verticales y horizontales**
- ✅ **Info completa**: Título, puntos, año, duración
- ✅ **Descripción limitada** a 5 líneas
- ✅ **Botones**: "Assistir" y "Minha lista"
- ✅ **Géneros**: Lista de géneros separados por coma

### 🎥 Modal de Trailer
- ✅ **Modal animado**: Fade in + Slide up
- ✅ **YouTube embebido**: Reproduce trailers dentro de la app
- ✅ **Botón cerrar**: Icono X en esquina superior
- ✅ **Info de película**: Título y descripción
- ✅ **Loading state**: Indicador mientras carga
- ✅ **Manejo de errores**: Mensaje si no hay trailer

### 📱 Navegación
- ✅ **Bottom Tabs**: Home, Buscar, Perfil
- ✅ **Stack Navigation**: Detalles de película
- ✅ **Animaciones nativas**: Transiciones suaves

### 🎨 Diseño
- ✅ **Responsive**: Adaptado a todo tipo de móviles
- ✅ **Tema oscuro**: Colores Netflix (#000, #E50914)
- ✅ **Animaciones**: Header, Modal, Botones
- ✅ **TypeScript**: Todo tipado correctamente

## 📦 Paquetes instalados

- `expo` - Framework base
- `react` + `react-native` - Core
- `@react-navigation/*` - Sistema de navegación (Stack + Bottom Tabs)
- `axios` - Consumir API REST
- `expo-linear-gradient` - Gradientes
- `react-native-webview` - YouTube embebido
- `react-native-safe-area-context` - Safe areas
- `react-native-screens` - Performance
- `typescript` - Tipado estático

## 🎯 Componentes principales

### Header.tsx
- Header fijo con logo y avatar
- Transición animada a fondo negro al hacer scroll
- Safe Area compatible

### FeaturedMovie.tsx
- Película destacada con imagen completa
- Gradientes verticales y horizontales
- Info completa: puntos (verde), año, duración
- Botones "Assistir" y "Minha lista"
- Géneros con formato

### MovieModal.tsx
- Modal con animación fade in + slide up
- YouTube embebido con WebView
- Loading state mientras carga trailer
- Manejo de errores si no hay trailer disponible
- Cierre con animación

### MovieRow.tsx
- Fila horizontal scrollable
- Título de la categoría
- Cards de películas clickeables

## 🌐 API Integration

Integración completa con **TMDB API**:
- Películas populares
- Películas mejor valoradas
- Búsqueda de películas
- Detalles completos (géneros, duración, trailer)
- Videos/Trailers de YouTube

## 📱 Capturas de funcionalidades

1. **Home**: Header transparente → negro al scroll
2. **Featured**: Película grande con toda la info
3. **Rows**: Filas de películas por categoría
4. **Search**: Búsqueda con grid de resultados
5. **Modal**: Trailer en YouTube embebido

## 🎨 Personalización

### Cambiar colores (theme.ts):
```typescript
export const colors = {
  primary: '#E50914',    // Rojo Netflix
  background: '#000000', // Negro
  card: '#141414',       // Gris oscuro
  text: '#FFFFFF',       // Blanco
  textGray: '#808080',   // Gris
};
```

### Agregar más categorías en HomeScreen:
```typescript
const [upcoming, setUpcoming] = useState([]);
// ... en loadMovies
const upcomingData = await getUpcomingMovies();
setUpcoming(upcomingData);
// ... en render
<MovieRow title="Próximamente" movies={upcoming} ... />
```

## 🚀 ¡Listo para producción!

Tu clon de Netflix está completo con:
- ✅ Diseño profesional
- ✅ Animaciones suaves
- ✅ API real de películas
- ✅ Trailers integrados
- ✅ Responsive mobile-first
- ✅ TypeScript + Best practices

¡Disfruta tu Netflix! 🍿🎬

