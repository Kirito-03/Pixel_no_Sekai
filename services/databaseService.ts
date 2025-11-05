/**
 * Servicio de acceso al backend (HTTP) y gestión dinámica de red.
 *
 * ¿Para qué es?
 * - Centraliza llamadas Axios al servidor (auth, perfiles, Mi Lista, etc.).
 * - Ajusta automáticamente la BASE_URL según entorno (Android emulador, localhost) y salud del servidor.
 * - Persiste y recupera la configuración de red para mejorar resiliencia.
 *
 * ¿Cómo funciona?
 * - Crea dos instancias de Axios: una general y otra para uploads.
 * - Interceptor de respuestas detecta errores de red y prueba URLs candidatas (getCandidateBaseURLs).
 * - Al encontrar una URL funcional, actualiza baseURL global y reintenta la solicitud.
 * - Expone funciones de negocio: register/login, validateUser, perfiles (get/create/update/delete), Mi Lista (get/add/remove), etc.
 * - Provee utilidades para resetear/forzar BASE_URL y obtener la actual.
 *
 * Consideraciones:
 * - Timeout ampliado y logs controlados para evitar spam.
 * - En producción, validar seguridad (tokens, headers, manejo de errores). 
 */
import axios from 'axios';
import { Platform } from 'react-native';
import { loadNetworkConfig, saveNetworkConfig, clearNetworkConfig } from '../utils/networkStorage';
import { getCandidateBaseURLs } from '../utils/networkUtils';

// Función para obtener la URL inicial según la plataforma, sin IPs fijas
const getInitialBaseURL = (): string => {
  if (__DEV__) {
    if (Platform.OS === 'android') {
      // Emulador Android usa esta IP especial para acceder al host
      return 'http://10.0.2.2:3001';
    }
    // iOS (simulador) y web usan localhost
    return 'http://localhost:3001';
  }
  // En producción, intentar localhost por defecto; se actualizará dinámicamente si es necesario
  return 'http://localhost:3001';
};

// La URL base de tu servidor backend
let BASE_URL = getInitialBaseURL();

// Exportar función para obtener BASE_URL actual (para otros módulos)
export const getCurrentBaseURL = () => BASE_URL;

// Configurar Axios con reintentos automáticos
const axiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 15000, // Aumentar timeout
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Instancia separada para uploads de archivos (sin Content-Type predefinido)
const axiosFileUpload = axios.create({
  baseURL: BASE_URL,
  timeout: 60000, // Timeout más largo para archivos
  headers: {
    'Accept': 'application/json',
    // NO incluir Content-Type - se establecerá automáticamente para FormData
  },
});

// Cargar configuración guardada al iniciar y actualizar las instancias
loadNetworkConfig().then((savedURL) => {
  if (savedURL) {
    BASE_URL = savedURL;
    axiosInstance.defaults.baseURL = savedURL;
    axiosFileUpload.defaults.baseURL = savedURL;
    // También actualizar axios.defaults para que otros módulos puedan acceder
    axios.defaults.baseURL = savedURL;
    console.log('URL cargada desde almacenamiento:', savedURL);
  } else {
    // Asegurar que axios.defaults tenga el BASE_URL
    axios.defaults.baseURL = BASE_URL;
  }
}).catch(() => {
  console.log('Usando URL por defecto:', BASE_URL);
  axios.defaults.baseURL = BASE_URL;
});

// Contador de errores para evitar spam en logs
let errorCount = 0;
let lastErrorTime = 0;

// Interceptor para reintentos automáticos
axiosInstance.interceptors.response.use(
  (response) => {
    // Resetear contador en respuesta exitosa
    errorCount = 0;
    return response;
  },
  async (error) => {
    // Solo procesar errores de red en la primera vez
    if (error.code === 'NETWORK_ERROR' || error.code === 'ERR_NETWORK' || error.message?.includes('Network Error')) {
      // Evitar bucles infinitos - verificar si ya intentamos cambiar la IP
      if (error.config?._retry) {
        return Promise.reject(error);
      }

      // Limitar logs para evitar spam (máximo 1 log cada 10 segundos)
      const now = Date.now();
      if (now - lastErrorTime > 10000 || errorCount === 0) {
        console.log('Error de red detectado, intentando encontrar servidor...');
        lastErrorTime = now;
        errorCount++;
      }
      
      // Intentar con diferentes URLs base (incluyendo la del emulador Android)
      const candidateBaseURLs = getCandidateBaseURLs();
      const currentBaseURL = axiosInstance.defaults.baseURL || BASE_URL;
      
      let workingBaseURL: string | null = null;
      
      // Si ya estamos usando una de las URLs candidatas, no buscar otras salvo por si acaso
      if (currentBaseURL && candidateBaseURLs.includes(currentBaseURL)) {
        console.log(`   Ya estamos usando ${currentBaseURL}, probando otras URLs por si acaso...`);
      }
      
      // Probar todas las URLs candidatas
      for (const candidate of candidateBaseURLs) {
        // Si ya es la URL actual, saltarla
        if (candidate === currentBaseURL) continue;
        
        try {
          const testUrl = `${candidate}/health`;
          console.log(`   Probando ${candidate}...`);
          
          const testResponse = await axios.get(testUrl, { timeout: 5000 });
          if (testResponse.status === 200) {
            console.log(`   ${candidate} funciona! Actualizando baseURL...`);
            BASE_URL = candidate;
            axiosInstance.defaults.baseURL = candidate;
            axiosFileUpload.defaults.baseURL = candidate;
            axios.defaults.baseURL = candidate; // Actualizar para otros módulos
            
            // Guardar la IP que funciona para futuras sesiones
            saveNetworkConfig(candidate).catch(err => {
              console.warn('No se pudo guardar la configuración:', err);
            });
            
            console.log(`   Nuevo baseURL: ${BASE_URL}`);
            workingBaseURL = candidate;
            break;
          }
        } catch (testError) {
          console.log(`   ${candidate} falló`);
        }
      }
      
      // Si encontramos una IP que funciona, reintentar la solicitud original
      if (workingBaseURL && error.config) {
        console.log('Reintentando solicitud con nueva IP...');
        error.config._retry = true; // Marcar para evitar bucles infinitos
        error.config.baseURL = workingBaseURL;
        return axiosInstance.request(error.config);
      }
    }
    
    return Promise.reject(error);
  }
);

// Interfaz para los datos necesarios al crear un nuevo perfil.
export interface CreateProfilePayload {
  usuario_id: number;
  name: string;
  avatar_url: string;
}

export const databaseService = {
  /**
   * Reinicia la configuración de red: borra la URL guardada y vuelve a la predeterminada.
   */
  async resetNetworkConfig() {
    await clearNetworkConfig();
    const initial = getInitialBaseURL();
    BASE_URL = initial;
    axiosInstance.defaults.baseURL = initial;
    axiosFileUpload.defaults.baseURL = initial;
    axios.defaults.baseURL = initial;
    console.log('Configuración de red reiniciada. BASE_URL:', initial);
  },
  /**
   * Establece la URL base explícitamente para esta sesión y la guarda.
   */
  setBaseURL(newURL: string) {
    if (!newURL || typeof newURL !== 'string') return;
    BASE_URL = newURL;
    axiosInstance.defaults.baseURL = newURL;
    axiosFileUpload.defaults.baseURL = newURL;
    axios.defaults.baseURL = newURL;
    // Guardar en almacenamiento para que DYNAMIC_NETWORK_CONFIG pueda leerla
    saveNetworkConfig(newURL).catch((err) => {
      console.warn('No se pudo guardar la configuración de red:', err);
    });
    console.log('BASE_URL actualizada manualmente a:', newURL);
  },
  /**
   * Registra un nuevo usuario.
   * Adaptado para enviar SOLO email y password, coincidiendo con tu tabla `usuarios`.
   */
  async register(email: string, password: string) {
    const { data } = await axiosInstance.post('/auth/register', { email, password });
    return data;
  },

  /**
   * Inicia sesión de un usuario.
   * Devuelve los datos del usuario, como su ID, para poder buscar sus perfiles.
   */
  async login(email: string, password: string) {
    const { data } = await axiosInstance.post('/auth/login', { email, password });
    // Esperamos que el backend devuelva algo como { id, email }
    return data;
  },

  /**
   * Valida si un usuario existe en el backend (para limpiar sesiones huérfanas).
   */
  async validateUser(userId: number) {
    try {
      const { data } = await axiosInstance.get(`/users/${userId}`);
      return data; // { id, email, created_at }
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  },

  /**
   * Solicita token de recuperación de contraseña (dev: el token se devuelve en la respuesta).
   */
  async forgotPassword(email: string) {
    const { data } = await axiosInstance.post('/auth/forgot-password', { email });
    return data; // { ok: true, token, expires_in_minutes }
  },

  /**
   * Restablece la contraseña usando el token de recuperación.
   */
  async resetPassword(email: string, token: string, newPassword: string) {
    const { data } = await axiosInstance.post('/auth/reset-password', { email, token, new_password: newPassword });
    return data; // { ok: true }
  },

  /**
   * Obtiene todos los perfiles asociados a un ID de usuario.
   * Se usa después del login para saber si el usuario debe crear su primer perfil.
   */
  async getProfiles(userId: number) {
    const { data } = await axiosInstance.get('/profiles', { params: { userId } });
    return data;
  },

  /**
   * Crea un nuevo perfil para un usuario.
   * Se llama desde la nueva pantalla "CreateProfileScreen".
   */
  async createProfile(payload: CreateProfilePayload) {
    console.log('🔄 DatabaseService: Creando perfil...', {
      baseURL: axiosInstance.defaults.baseURL || getCurrentBaseURL(),
      endpoint: '/profiles',
      payload,
    });
    try {
      const { data } = await axiosInstance.post('/profiles', payload);
      console.log('✅ DatabaseService: Perfil creado', data);
      return data;
    } catch (error: any) {
      const status = error?.response?.status;
      const errData = error?.response?.data;
      console.error('❌ DatabaseService: Error al crear perfil', {
        status,
        error: errData || error.message,
      });
      throw error;
    }
  },

  /**
   * Actualiza un perfil específico.
   */
  async updateProfile(profileId: number, updates: { name?: string; avatar_url?: string }) {
    const { data } = await axiosInstance.put(`/profiles/${profileId}`, updates);
    return data;
  },

  /**
   * Elimina un perfil específico.
   */
  async deleteProfile(profileId: number) {
    const { data } = await axiosInstance.delete(`/profiles/${profileId}`);
    return data;
  },

  // --- El resto de funciones para la lista del usuario ---

  async getMyList(perfilId: number) {
    console.log(`🔄 DatabaseService: Getting MyList for profile: ${perfilId}`);
    try {
      console.log(`📤 DatabaseService: GET /my-list/${perfilId}`);
      
      const { data } = await axiosInstance.get(`/my-list/${perfilId}`);
      
      console.log(`✅ DatabaseService: MyList retrieved`, {
        profileId: perfilId,
        itemCount: data?.length || 0,
        items: data?.map((item: any) => ({
          id: item.content_id,
          type: item.content_type
        })) || []
      });
      
      return data;
    } catch (error: any) {
      console.error(`❌ DatabaseService: Error getting MyList`, {
        perfilId,
        error: error.response?.data || error.message
      });
      throw error;
    }
  },

  async addToMyList(perfilId: number, contentId: number, type: 'movie' | 'tv' | 'anime') {
    console.log(`🔄 DatabaseService: Adding to MyList - Profile: ${perfilId}, Content: ${contentId}, Type: ${type}`);
    try {
      const payload = { content_id: contentId, content_type: type };
      console.log(`📤 DatabaseService: POST /my-list/${perfilId}/items`, payload);
      
      const { data } = await axiosInstance.post(`/my-list/${perfilId}/items`, payload);
      
      console.log(`✅ DatabaseService: Successfully added to MyList`, data);
      return data;
    } catch (error: any) {
      console.error(`❌ DatabaseService: Error adding to MyList`, {
        perfilId,
        contentId,
        type,
        error: error.response?.data || error.message
      });
      throw error;
    }
  },

  async removeFromMyList(perfilId: number, contentId: number, type: 'movie' | 'tv' | 'anime') {
    console.log(`🔄 DatabaseService: Removing from MyList - Profile: ${perfilId}, Content: ${contentId}, Type: ${type}`);
    try {
      console.log(`📤 DatabaseService: DELETE /my-list/${perfilId}/items/${contentId}/${type}`);
      
      const { data } = await axiosInstance.delete(`/my-list/${perfilId}/items/${contentId}/${type}`);
      
      console.log(`✅ DatabaseService: Successfully removed from MyList`, data);
      return data;
    } catch (error: any) {
      console.error(`❌ DatabaseService: Error removing from MyList`, {
        perfilId,
        contentId,
        type,
        error: error.response?.data || error.message
      });
      throw error;
    }
  },

  // --- Funciones para descargas ---

  async getDownloads(perfilId: number) {
    console.log(`🔄 DatabaseService: Getting Downloads for profile: ${perfilId}`);
    try {
      const { data } = await axiosInstance.get(`/downloads/${perfilId}`);
      console.log('✅ DatabaseService: Downloads retrieved', { count: data?.length || 0 });
      return data;
    } catch (error: any) {
      console.error('❌ DatabaseService: Error getting Downloads', error.response?.data || error.message);
      throw error;
    }
  },

  async addToDownloads(
    perfilId: number,
    contentId: number,
    type: 'movie' | 'tv' | 'anime',
    options?: { status?: 'PENDING' | 'DOWNLOADING' | 'COMPLETED' | 'FAILED'; progress?: number; file_path?: string | null }
  ) {
    console.log(`🔄 DatabaseService: Adding to Downloads - Profile: ${perfilId}, Content: ${contentId}, Type: ${type}`);
    try {
      const payload = {
        content_id: contentId,
        content_type: type,
        status: options?.status ?? 'PENDING',
        progress: options?.progress ?? 0,
        file_path: options?.file_path ?? null,
      };
      const { data } = await axiosInstance.post(`/downloads/${perfilId}/items`, payload);
      console.log('✅ DatabaseService: Added to Downloads');
      return data;
    } catch (error: any) {
      const status = error?.response?.status;
      const message: string = error?.response?.data?.message || error?.message || '';
      console.error('❌ DatabaseService: Error adding to Downloads', error.response?.data || error.message);

      // Fallback: si el backend devuelve 404 porque no existe el registro de descargas del perfil,
      // intentamos auto-crear con GET /downloads/:perfilId y reintentamos el POST.
      if (status === 404 && /Descargas no encontrada para el perfil|Perfil no encontrado/i.test(message)) {
        try {
          console.log('➡️ Intentando auto-crear registro de descargas con GET /downloads/:perfilId...');
          await this.getDownloads(perfilId); // backend debe auto-crear si falta
          console.log('↪️ Reintentando añadir a Descargas...');
          const retryPayload = {
            content_id: contentId,
            content_type: type,
            status: options?.status ?? 'PENDING',
            progress: options?.progress ?? 0,
            file_path: options?.file_path ?? null,
          };
          const { data: retryData } = await axiosInstance.post(`/downloads/${perfilId}/items`, retryPayload);
          console.log('✅ DatabaseService: Added to Downloads tras auto-creación');
          return retryData;
        } catch (retryErr: any) {
          console.error('❌ Retry addToDownloads failed:', retryErr?.response?.data || retryErr?.message);
          throw retryErr;
        }
      }

      throw error;
    }
  },

  async updateDownloadItem(
    perfilId: number,
    contentId: number,
    type: 'movie' | 'tv' | 'anime',
    updates: { status?: 'PENDING' | 'DOWNLOADING' | 'COMPLETED' | 'FAILED'; progress?: number; file_path?: string | null }
  ) {
    try {
      const { data } = await axiosInstance.put(`/downloads/${perfilId}/items/${contentId}/${type}`, updates);
      return data;
    } catch (error: any) {
      console.error('❌ DatabaseService: Error updating download item', error.response?.data || error.message);
      throw error;
    }
  },

  async removeFromDownloads(perfilId: number, contentId: number, type: 'movie' | 'tv' | 'anime') {
    console.log(`🔄 DatabaseService: Removing from Downloads - Profile: ${perfilId}, Content: ${contentId}, Type: ${type}`);
    try {
      const { data } = await axiosInstance.delete(`/downloads/${perfilId}/items/${contentId}/${type}`);
      console.log('✅ DatabaseService: Removed from Downloads');
      return data;
    } catch (error: any) {
      console.error('❌ DatabaseService: Error removing from Downloads', error.response?.data || error.message);
      throw error;
    }
  },

  /**
   * Verifica si un contenido está en descargas
   */
  async isInDownloads(perfilId: number, contentId: number, type: 'movie' | 'tv' | 'anime'): Promise<boolean> {
    try {
      const downloads = await this.getDownloads(perfilId) as Array<{ content_id: number; content_type: 'movie' | 'tv' | 'anime' }>;
      return downloads.some((item) => 
        item.content_id === contentId && 
        item.content_type === type
      );
    } catch (error: any) {
      console.error('Error checking if in downloads:', error);
      return false;
    }
  },

  /**
   * Agrega anime completo (todas las temporadas y episodios)
   */
  async addAnimeToDownloads(
    perfilId: number, 
    contentId: number, 
    seasons: Array<{ season_number: number; episodes: Array<{ episode_number: number; name: string }> }>
  ): Promise<void> {
    try {
      // Agregar el anime principal
      await this.addToDownloads(perfilId, contentId, 'anime', {
        status: 'PENDING',
        progress: 0,
        file_path: JSON.stringify({ 
          type: 'full_anime',
          total_seasons: seasons.length,
          total_episodes: seasons.reduce((acc, season) => acc + season.episodes.length, 0)
        })
      });

      // Agregar cada temporada y episodio como items separados
      for (const season of seasons) {
        for (const episode of season.episodes) {
          await this.addToDownloads(perfilId, contentId, 'anime', {
            status: 'PENDING',
            progress: 0,
            file_path: JSON.stringify({
              type: 'episode',
              season_number: season.season_number,
              episode_number: episode.episode_number,
              episode_name: episode.name
            })
          });
        }
      }
    } catch (error: any) {
      console.error('Error adding anime to downloads:', error);
      throw error;
    }
  },

  /**
   * Agrega temporada específica de anime
   */
  async addAnimeSeasonToDownloads(
    perfilId: number, 
    contentId: number, 
    seasonNumber: number,
    episodes: Array<{ episode_number: number; name: string }>
  ): Promise<void> {
    try {
      // Agregar la temporada
      await this.addToDownloads(perfilId, contentId, 'anime', {
        status: 'PENDING',
        progress: 0,
        file_path: JSON.stringify({
          type: 'season',
          season_number: seasonNumber,
          total_episodes: episodes.length
        })
      });

      // Agregar cada episodio
      for (const episode of episodes) {
        await this.addToDownloads(perfilId, contentId, 'anime', {
          status: 'PENDING',
          progress: 0,
          file_path: JSON.stringify({
            type: 'episode',
            season_number: seasonNumber,
            episode_number: episode.episode_number,
            episode_name: episode.name
          })
        });
      }
    } catch (error: any) {
      console.error('Error adding anime season to downloads:', error);
      throw error;
    }
  },

  /**
   * Agrega un episodio específico de una temporada de anime
   */
  async addAnimeEpisodeToDownloads(
    perfilId: number,
    contentId: number,
    seasonNumber: number,
    episode: { episode_number: number; name: string }
  ): Promise<void> {
    try {
      await this.addToDownloads(perfilId, contentId, 'anime', {
        status: 'PENDING',
        progress: 0,
        file_path: JSON.stringify({
          type: 'episode',
          season_number: seasonNumber,
          episode_number: episode.episode_number,
          episode_name: episode.name,
        }),
      });
    } catch (error: any) {
      console.error('Error adding anime episode to downloads:', error);
      throw error;
    }
  },

  // --- Funciones para manejo de contenido ---

  /**
   * Obtiene todo el contenido almacenado en la base de datos
   */
  async getAllContent() {
    const { data } = await axiosInstance.get('/content');
    return data;
  },

  /**
   * Obtiene contenido por tipo (movie, tv, anime)
   */
  async getContentByType(type: 'movie' | 'tv' | 'anime') {
    const { data } = await axiosInstance.get(`/content/${type}`);
    return data;
  },

  /**
   * Agrega nuevo contenido a la base de datos
   */
  async addContent(content: {
    title: string;
    type: 'movie' | 'tv' | 'anime';
    overview?: string;
    poster_url?: string;
    backdrop_url?: string;
  }) {
    const { data } = await axiosInstance.post('/content', content);
    return data;
  },

  // --- Funciones para manejo de imágenes ---

  /**
   * Guarda metadatos de una imagen en la base de datos
   */
  async saveImageMetadata(imageData: {
    filename: string;
    original_name: string;
    mime_type: string;
    size: number;
    width?: number;
    height?: number;
    url: string;
    type: 'poster' | 'backdrop' | 'avatar' | 'thumbnail';
    entity_id?: number;
    entity_type?: 'contenido' | 'perfil';
  }) {
    const { data } = await axiosInstance.post('/images', imageData);
    return data;
  },

  /**
   * Obtiene imágenes asociadas a una entidad
   */
  async getImagesByEntity(entityType: 'contenido' | 'perfil', entityId: number) {
    const { data } = await axiosInstance.get(`/images/${entityType}/${entityId}`);
    return data;
  },

  /**
   * Sube un avatar al servidor
   * Soporta tanto React Native (URI) como Web (File o data URL)
   */
  async uploadAvatar(imageSource: string | File): Promise<{ url: string; filename: string }> {
    console.log('Iniciando subida de avatar');
    console.log('URL del servidor:', BASE_URL);
    console.log('Tipo de fuente:', typeof imageSource);
    
    const formData = new FormData();
    
    // Detectar si estamos en web (File object) o móvil (URI string)
    if (typeof imageSource === 'string') {
      // React Native: URI string
      const filename = imageSource.split('/').pop() || 'avatar.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const mimeType = match ? `image/${match[1]}` : 'image/jpeg';
      
      console.log('Detalles del archivo (móvil):', { filename, mimeType, uri: imageSource });
      
      // Crear el objeto de archivo para FormData en React Native
      formData.append('avatar', {
        uri: imageSource,
        name: filename,
        type: mimeType,
      } as any);
    } else {
      // Web: File object
      console.log('Detalles del archivo (web):', {
        name: imageSource.name,
        type: imageSource.type,
        size: imageSource.size
      });
      
      // En web, simplemente agregamos el File directamente
      formData.append('avatar', imageSource);
    }

    try {
      console.log('Enviando request a:', `${BASE_URL}/upload/avatar`);
      console.log('BASE_URL actual:', BASE_URL);
      
      // Usar axiosFileUpload que no tiene Content-Type predefinido
      // El navegador establecerá automáticamente el Content-Type correcto con boundary para FormData
      // Enviar BASE_URL en un header personalizado para que el servidor construya la URL correcta
      const { data } = await axiosFileUpload.post('/upload/avatar', formData, {
        headers: {
          // Usar minúsculas para asegurar coincidencia en Node/Express
          'x-client-baseurl': BASE_URL, // Enviar BASE_URL al servidor para construir la URL correcta
          // En RN, establecer explícitamente multipart/form-data suele evitar errores de red
          'Content-Type': 'multipart/form-data',
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      });
      
      // Si el servidor devolvió una URL relativa, construirla con nuestro BASE_URL
      if (data.url && !data.url.startsWith('http')) {
        data.url = `${BASE_URL}${data.url.startsWith('/') ? '' : '/'}${data.url}`;
        console.log('URL reconstruida:', data.url);
      }

      console.log('Avatar subido exitosamente:', data);
      return data;
    } catch (error: any) {
      console.error('Error al subir avatar:', error);
      console.error('Detalles del error:', {
        message: error.message,
        code: error.code,
        response: error.response?.data,
        status: error.response?.status,
        baseURL: BASE_URL,
      });
      
      // Si es un error 400, mostrar el mensaje del servidor
      if (error.response?.status === 400) {
        const serverMessage = error.response?.data?.message || 'Error al procesar el archivo';
        console.error('Mensaje del servidor:', serverMessage);
        throw new Error(`Error al subir avatar: ${serverMessage}`);
      }
      
      // Fallback: intentar subir usando fetch (suele ser más robusto en RN)
      try {
        console.log('Intentando fallback con fetch para subir avatar...');
        const resp = await fetch(`${BASE_URL}/upload/avatar`, {
          method: 'POST',
          headers: {
            'x-client-baseurl': BASE_URL,
            // No establecer Content-Type aquí para que RN/Fetch cree el boundary correctamente
          } as any,
          body: formData as any,
        });
        if (!resp.ok) {
          const txt = await resp.text().catch(() => '');
          throw new Error(`Upload failed (fetch). Status: ${resp.status}. Body: ${txt}`);
        }
        const data = await resp.json();

        if (data.url && !data.url.startsWith('http')) {
          data.url = `${BASE_URL}${data.url.startsWith('/') ? '' : '/'}${data.url}`;
          console.log('URL reconstruida (fetch):', data.url);
        }

        console.log('Avatar subido exitosamente (fetch):', data);
        return data;
      } catch (fallbackErr: any) {
        console.error('Fallback con fetch también falló:', fallbackErr);
        // Propagar el error original si el fallback falla
        throw error;
      }
    }
  }
};

export default databaseService;