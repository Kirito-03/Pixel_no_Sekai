import axios from 'axios';
import { db, auth, storage } from './firebase';
import { collection, addDoc, deleteDoc, doc, onSnapshot, query, orderBy, where, getDocs, serverTimestamp, setDoc, getDoc } from 'firebase/firestore';
import { ref as storageRef, uploadBytes, uploadString, getDownloadURL } from 'firebase/storage';
import * as FileSystemLegacy from 'expo-file-system/legacy';
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
    const uid = auth.currentUser?.uid;
    if (!uid) {
      return [];
    }
    const ref = collection(db, `profiles/${uid}/profiles`);
    const snap = await getDocs(ref);
    return snap.docs.map(d => ({ id: Number(d.id), ...(d.data() as any) }));
  },

  /**
   * Crea un nuevo perfil para un usuario.
   * Se llama desde la nueva pantalla "CreateProfileScreen".
   */
  async createProfile(payload: CreateProfilePayload) {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error('No auth user');
    const profileId = Date.now();
    const ref = doc(db, `profiles/${uid}/profiles/${profileId}`);
    const body = { name: payload.name, avatar_url: payload.avatar_url, created_at: serverTimestamp() };
    await setDoc(ref, body);
    return { id: profileId, ...body } as any;
  },

  /**
   * Actualiza un perfil específico.
   */
  async updateProfile(profileId: number, updates: { name?: string; avatar_url?: string }) {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error('No auth user');
    const ref = doc(db, `profiles/${uid}/profiles/${profileId}`);
    await setDoc(ref, { ...updates, updated_at: serverTimestamp() }, { merge: true });
    const snap = await getDoc(ref);
    return { id: profileId, ...(snap.data() as any) };
  },

  /**
   * Elimina un perfil específico.
   */
  async deleteProfile(profileId: number) {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error('No auth user');
    const ref = doc(db, `profiles/${uid}/profiles/${profileId}`);
    await deleteDoc(ref);
    return { ok: true } as any;
  },

  // --- El resto de funciones para la lista del usuario ---

  async getMyList(perfilId: number) {
    console.log(`🔄 DatabaseService: Getting MyList for profile: ${perfilId}`);
    try {
      const profileDocId = auth.currentUser?.uid || String(perfilId);
      const ref = collection(db, `profiles/${profileDocId}/mylist`);
      const q = query(ref, orderBy('added_at', 'desc'));
      const snap = await getDocs(q);
      const items = snap.docs.map(d => d.data() as { content_id: number; content_type: 'movie' | 'tv' | 'anime' });
      console.log(`✅ DatabaseService: MyList retrieved`, {
        profileId: profileDocId,
        itemCount: items.length,
        items: items.map((item: any) => ({ id: item.content_id, type: item.content_type }))
      });
      return items;
    } catch (error: any) {
      console.error(`❌ DatabaseService: Error getting MyList`, error);
      throw error;
    }
  },

  async addToMyList(perfilId: number, contentId: number, type: 'movie' | 'tv' | 'anime') {
    console.log(`🔄 DatabaseService: Adding to MyList - Profile: ${perfilId}, Content: ${contentId}, Type: ${type}`);
    try {
      const profileDocId = auth.currentUser?.uid || String(perfilId);
      const ref = collection(db, `profiles/${profileDocId}/mylist`);
      const payload = { content_id: contentId, content_type: type, added_at: serverTimestamp() };
      const res = await addDoc(ref, payload);
      console.log(`✅ DatabaseService: Successfully added to MyList`, { id: res.id, ...payload });
      return { id: res.id, ...payload } as any;
    } catch (error: any) {
      console.error(`❌ DatabaseService: Error adding to MyList`, error);
      throw error;
    }
  },

  async removeFromMyList(perfilId: number, contentId: number, type: 'movie' | 'tv' | 'anime') {
    console.log(`🔄 DatabaseService: Removing from MyList - Profile: ${perfilId}, Content: ${contentId}, Type: ${type}`);
    try {
      const profileDocId = auth.currentUser?.uid || String(perfilId);
      const ref = collection(db, `profiles/${profileDocId}/mylist`);
      const q = query(ref, where('content_id', '==', contentId), where('content_type', '==', type));
      const snap = await getDocs(q);
      const batchDeletes = snap.docs.map(d => deleteDoc(doc(db, `profiles/${profileDocId}/mylist/${d.id}`)));
      await Promise.all(batchDeletes);
      console.log(`✅ DatabaseService: Successfully removed from MyList`, { contentId, type, deleted: snap.size });
      return { ok: true } as any;
    } catch (error: any) {
      console.error(`❌ DatabaseService: Error removing from MyList`, error);
      throw error;
    }
  },

  // --- Funciones para descargas ---

  async getDownloads(perfilId: number) {
    console.log(`🔄 DatabaseService: Getting Downloads (Firestore) for profile: ${perfilId}`);
    try {
      const profileDocId = auth.currentUser?.uid || String(perfilId);
      const ref = collection(db, `profiles/${profileDocId}/downloads`);
      const q = query(ref, orderBy('created_at', 'desc'));
      const snap = await getDocs(q);
      const items = snap.docs.map(d => d.data() as { content_id: number; content_type: 'movie' | 'tv' | 'anime'; status?: 'PENDING' | 'DOWNLOADING' | 'COMPLETED' | 'FAILED'; progress?: number; file_path?: string | null });
      console.log('✅ DatabaseService: Downloads retrieved', { count: items.length });
      return items;
    } catch (error: any) {
      console.error('❌ DatabaseService: Error getting Downloads (Firestore)', error.message);
      throw error;
    }
  },

  async addToDownloads(
    perfilId: number,
    contentId: number,
    type: 'movie' | 'tv' | 'anime',
    options?: { status?: 'PENDING' | 'DOWNLOADING' | 'COMPLETED' | 'FAILED'; progress?: number; file_path?: string | null }
  ) {
    console.log(`🔄 DatabaseService: Adding to Downloads (Firestore) - Profile: ${perfilId}, Content: ${contentId}, Type: ${type}`);
    try {
      const profileDocId = auth.currentUser?.uid || String(perfilId);
      const ref = collection(db, `profiles/${profileDocId}/downloads`);
      const payload = {
        content_id: contentId,
        content_type: type,
        status: options?.status ?? 'PENDING',
        progress: options?.progress ?? 0,
        file_path: options?.file_path ?? null,
        created_at: serverTimestamp(),
      };
      const res = await addDoc(ref, payload);
      console.log('✅ DatabaseService: Added to Downloads (Firestore)', { id: res.id });
      return { id: res.id, ...payload } as any;
    } catch (error: any) {
      console.error('❌ DatabaseService: Error adding to Downloads (Firestore)', error.message);
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
      const profileDocId = auth.currentUser?.uid || String(perfilId);
      const ref = collection(db, `profiles/${profileDocId}/downloads`);
      const q = query(ref, where('content_id', '==', contentId), where('content_type', '==', type));
      const snap = await getDocs(q);
      await Promise.all(snap.docs.map(d => setDoc(doc(db, `profiles/${profileDocId}/downloads/${d.id}`), { ...updates, updated_at: serverTimestamp() }, { merge: true })));
      return { ok: true } as any;
    } catch (error: any) {
      console.error('❌ DatabaseService: Error updating download item (Firestore)', error.message);
      throw error;
    }
  },

  async removeFromDownloads(perfilId: number, contentId: number, type: 'movie' | 'tv' | 'anime') {
    console.log(`🔄 DatabaseService: Removing from Downloads (Firestore) - Profile: ${perfilId}, Content: ${contentId}, Type: ${type}`);
    try {
      const profileDocId = auth.currentUser?.uid || String(perfilId);
      const ref = collection(db, `profiles/${profileDocId}/downloads`);
      const q = query(ref, where('content_id', '==', contentId), where('content_type', '==', type));
      const snap = await getDocs(q);
      const batchDeletes = snap.docs.map(d => deleteDoc(doc(db, `profiles/${profileDocId}/downloads/${d.id}`)));
      await Promise.all(batchDeletes);
      console.log('✅ DatabaseService: Removed from Downloads (Firestore)', { deleted: snap.size });
      return { ok: true } as any;
    } catch (error: any) {
      console.error('❌ DatabaseService: Error removing from Downloads (Firestore)', error.message);
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
    const ref = collection(db, 'content');
    const snap = await getDocs(ref);
    return snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
  },

  /**
   * Obtiene contenido por tipo (movie, tv, anime)
   */
  async getContentByType(type: 'movie' | 'tv' | 'anime') {
    const ref = collection(db, 'content');
    const q = query(ref, where('type', '==', type));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
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
    const payload = { ...content, created_at: serverTimestamp() };
    const ref = collection(db, 'content');
    const res = await addDoc(ref, payload);
    return { id: res.id, ...payload } as any;
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
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error('No auth user');
    const filename = `avatar_${Date.now()}.jpg`;
    const path = `avatars/${uid}/${filename}`;
    const sref = storageRef(storage, path);
    let dataUrlForFallback: string | null = null;
    if (Platform.OS === 'web') {
      try {
        if (typeof imageSource === 'string') {
          if (imageSource.startsWith('data:')) {
            return { url: imageSource, filename };
          }
          try {
            const blob = await fetch(imageSource).then(r => r.blob());
            const reader = new (globalThis as any).FileReader();
            const dataUrl = await new Promise<string>((resolve, reject) => {
              reader.onload = () => resolve(reader.result as string);
              reader.onerror = reject;
              reader.readAsDataURL(blob);
            });
            return { url: dataUrl, filename };
          } catch (_) {
            return { url: imageSource, filename };
          }
        } else {
          const reader = new (globalThis as any).FileReader();
          const dataUrl = await new Promise<string>((resolve, reject) => {
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(imageSource as any);
          });
          return { url: dataUrl, filename };
        }
      } catch (_) {
        return { url: typeof imageSource === 'string' ? imageSource : '', filename };
      }
    }
    try {
      if (typeof imageSource === 'string') {
        if (imageSource.startsWith('data:')) {
          const commaIndex = imageSource.indexOf(',');
          const base64 = commaIndex >= 0 ? imageSource.slice(commaIndex + 1) : imageSource;
          dataUrlForFallback = `data:image/jpeg;base64,${base64}`;
          await uploadString(sref, dataUrlForFallback, 'data_url');
        } else {
          try {
            const mod = require('expo-image-manipulator');
            const SaveFormat = mod.SaveFormat || { JPEG: 'jpeg' };
            const result = await mod.manipulateAsync(
              imageSource,
              [{ resize: { width: 256, height: 256 } }],
              { compress: 0.8, format: SaveFormat.JPEG, base64: true }
            );
            if (result?.base64) {
              dataUrlForFallback = `data:image/jpeg;base64,${result.base64}`;
              await uploadString(sref, dataUrlForFallback, 'data_url');
            } else {
              const base64 = await FileSystemLegacy.readAsStringAsync(imageSource, { encoding: 'base64' as any });
              dataUrlForFallback = `data:image/jpeg;base64,${base64}`;
              await uploadString(sref, dataUrlForFallback, 'data_url');
            }
          } catch (_) {
            const base64 = await FileSystemLegacy.readAsStringAsync(imageSource, { encoding: 'base64' as any });
            dataUrlForFallback = `data:image/jpeg;base64,${base64}`;
            await uploadString(sref, dataUrlForFallback, 'data_url');
          }
        }
      } else {
        try {
          await uploadBytes(sref, imageSource as any);
        } catch (_) {
          const toDataUrl = (file: any) => new Promise<string>((resolve, reject) => {
            try {
              const reader = new (globalThis as any).FileReader();
              reader.onload = () => resolve(reader.result as string);
              reader.onerror = reject;
              reader.readAsDataURL(file);
            } catch (err) {
              reject(err);
            }
          });
          const dataUrl = await toDataUrl(imageSource as any);
          dataUrlForFallback = dataUrl;
          await uploadString(sref, dataUrl, 'data_url');
        }
      }
      const url = await getDownloadURL(sref);
      return { url, filename };
    } catch (e: any) {
      const msg = String(e?.message || '');
      if (dataUrlForFallback) {
        return { url: dataUrlForFallback, filename };
      }
      throw e;
    }
  }
};

export default databaseService;