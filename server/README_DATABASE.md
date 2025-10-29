# Base de Datos Netflix Clone

## Descripción
Este proyecto utiliza MySQL/MariaDB como base de datos para almacenar información de usuarios, perfiles, listas de contenido e imágenes.

## Estructura de la Base de Datos

### Tablas Principales

#### `usuarios`
- `id`: Identificador único del usuario
- `email`: Email del usuario (único)
- `password_hash`: Hash de la contraseña
- `created_at`: Fecha de creación

#### `perfiles`
- `id`: Identificador único del perfil
- `usuario_id`: ID del usuario propietario
- `name`: Nombre del perfil
- `avatar_url`: URL del avatar
- `is_kids`: Si es un perfil infantil (0/1)
- `created_at`: Fecha de creación

#### `listas`
- `id`: Identificador único de la lista
- `perfil_id`: ID del perfil propietario
- `name`: Nombre de la lista
- `type`: Tipo de lista (actualmente solo 'MY_LIST')
- `created_at`: Fecha de creación

#### `lista_items`
- `id`: Identificador único del item
- `lista_id`: ID de la lista
- `content_id`: ID del contenido
- `content_type`: Tipo de contenido ('movie', 'tv', 'anime')
- `added_at`: Fecha de agregado

#### `contenido`
- `id`: Identificador único del contenido
- `title`: Título del contenido
- `type`: Tipo de contenido ('movie', 'tv', 'anime')
- `overview`: Descripción del contenido
- `poster_url`: URL del póster
- `backdrop_url`: URL de la imagen de fondo
- `created_at`: Fecha de creación

#### `imagenes`
- `id`: Identificador único de la imagen
- `filename`: Nombre del archivo
- `original_name`: Nombre original del archivo
- `mime_type`: Tipo MIME
- `size`: Tamaño en bytes
- `width`: Ancho en píxeles
- `height`: Alto en píxeles
- `url`: URL de la imagen
- `type`: Tipo de imagen ('poster', 'backdrop', 'avatar', 'thumbnail')
- `entity_id`: ID de la entidad asociada
- `entity_type`: Tipo de entidad ('contenido', 'perfil')
- `created_at`: Fecha de creación

## Configuración

### Variables de Entorno
Crear un archivo `.env` en la raíz del proyecto con:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=tu_password
DB_NAME=bd_netflix
PORT=3001
```

### Instalación de la Base de Datos

1. Crear la base de datos:
```sql
CREATE DATABASE bd_netflix CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
```

2. Ejecutar el script SQL:
```bash
mysql -u root -p bd_netflix < server/bd_netflix.sql
```

## Endpoints Disponibles

### Autenticación
- `POST /auth/register` - Registrar nuevo usuario
- `POST /auth/login` - Iniciar sesión

### Perfiles
- `GET /profiles?userId={id}` - Obtener perfiles de un usuario
- `POST /profiles` - Crear nuevo perfil
- `DELETE /profiles/{id}` - Eliminar perfil

### Mi Lista
- `GET /my-list/{perfilId}` - Obtener lista del perfil
- `POST /my-list/{perfilId}/items` - Agregar contenido a la lista
- `DELETE /my-list/{perfilId}/items/{contentId}/{type}` - Quitar contenido de la lista

### Contenido
- `GET /content` - Obtener todo el contenido
- `GET /content/{type}` - Obtener contenido por tipo (movie/tv/anime)
- `POST /content` - Agregar nuevo contenido

### Imágenes
- `POST /images` - Guardar metadatos de imagen
- `GET /images/{entity_type}/{entity_id}` - Obtener imágenes de una entidad

### Salud del Sistema
- `GET /health` - Verificar conexión a la base de datos

## Uso desde el Frontend

```typescript
import databaseService from './services/databaseService';

// Registrar usuario
const user = await databaseService.register('usuario@email.com', 'password123');

// Crear perfil
const profile = await databaseService.createProfile({
  usuario_id: user.id,
  name: 'Mi Perfil',
  avatar_url: 'https://example.com/avatar.jpg'
});

// Agregar contenido a Mi Lista
await databaseService.addToMyList(profile.id, 123, 'movie');

// Obtener contenido por tipo
const movies = await databaseService.getContentByType('movie');
```

## Características Especiales

- **Soporte para Anime**: La base de datos incluye soporte para contenido de anime además de películas y series
- **Gestión de Imágenes**: Sistema completo para almacenar metadatos de imágenes asociadas a contenido y perfiles
- **Listas Automáticas**: Cada perfil creado automáticamente obtiene una "Mi Lista"
- **Integridad Referencial**: Uso de claves foráneas con eliminación en cascada
- **Índices Optimizados**: Índices en campos frecuentemente consultados para mejor rendimiento
