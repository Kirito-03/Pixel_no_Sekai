import axios from 'axios';

// La URL base de tu servidor backend.
const BASE_URL = 'http://localhost:3001';

// Interfaz para los datos necesarios al crear un nuevo perfil.
export interface CreateProfilePayload {
  usuario_id: number;
  name: string;
  avatar_url: string;
}

export const databaseService = {
  /**
   * Registra un nuevo usuario.
   * Adaptado para enviar SOLO email y password, coincidiendo con tu tabla `usuarios`.
   */
  async register(email: string, password: string) {
    // Ya no se envía `displayName` aquí.
    const { data } = await axios.post(`${BASE_URL}/auth/register`, { email, password });
    return data;
  },

  /**
   * Inicia sesión de un usuario.
   * Devuelve los datos del usuario, como su ID, para poder buscar sus perfiles.
   */
  async login(email: string, password: string) {
    const { data } = await axios.post(`${BASE_URL}/auth/login`, { email, password });
    // Esperamos que el backend devuelva algo como { id, email }
    return data;
  },

  /**
   * Obtiene todos los perfiles asociados a un ID de usuario.
   * Se usa después del login para saber si el usuario debe crear su primer perfil.
   */
  async getProfiles(userId: number) {
    const { data } = await axios.get(`${BASE_URL}/profiles`, { params: { userId } });
    return data;
  },

  /**
   * Crea un nuevo perfil para un usuario.
   * Se llama desde la nueva pantalla "CreateProfileScreen".
   */
  async createProfile(payload: CreateProfilePayload) {
    const { data } = await axios.post(`${BASE_URL}/profiles`, payload);
    return data;
  },

  /**
   * Elimina un perfil específico.
   */
  async deleteProfile(profileId: number) {
    const { data } = await axios.delete(`${BASE_URL}/profiles/${profileId}`);
    return data;
  },

  // --- El resto de funciones para la lista del usuario ---

  async getMyList(perfilId: number) {
    const { data } = await axios.get(`${BASE_URL}/my-list/${perfilId}`);
    return data;
  },

  async addToMyList(perfilId: number, contentId: number, type: 'movie' | 'tv') {
    const { data } = await axios.post(`${BASE_URL}/my-list/${perfilId}/items`, { content_id: contentId, content_type: type });
    return data;
  },

  async removeFromMyList(perfilId: number, contentId: number, type: 'movie' | 'tv') {
    const { data } = await axios.delete(`${BASE_URL}/my-list/${perfilId}/items/${contentId}/${type}`);
    return data;
  }
};

export default databaseService;