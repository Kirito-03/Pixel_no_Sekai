import axios from 'axios';
import { Movie, MovieDetail, TVShow, TVShowDetail, Anime, AnimeDetail, ContentItem } from '../types';
import * as AniListService from './anilistService';

const API_KEY = 'fdb82cd7ca3f789281b9484719b26df2';
const BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_BASE = 'https://image.tmdb.org/t/p';

const api = axios.create({
  baseURL: BASE_URL,
  params: {
    api_key: API_KEY,
    language: 'es-ES',
  },
});

// ===== PELÍCULAS =====

// Obtener películas populares
export const getPopularMovies = async (): Promise<Movie[]> => {
  const { data } = await api.get('/movie/popular');
  return data.results;
};

// Obtener películas mejor valoradas
export const getTopRatedMovies = async (): Promise<Movie[]> => {
  const { data } = await api.get('/movie/top_rated');
  return data.results;
};

// Obtener películas en cartelera
export const getNowPlayingMovies = async (): Promise<Movie[]> => {
  const { data } = await api.get('/movie/now_playing');
  return data.results;
};

// Obtener próximos estrenos
export const getUpcomingMovies = async (): Promise<Movie[]> => {
  const { data } = await api.get('/movie/upcoming');
  return data.results;
};

// Obtener películas por género
export const getMoviesByGenre = async (genreId: number): Promise<Movie[]> => {
  const { data } = await api.get('/discover/movie', {
    params: { with_genres: genreId },
  });
  return data.results;
};

// Obtener detalles de una película (incluye trailer y clasificación)
export const getMovieDetails = async (id: number): Promise<MovieDetail> => {
  const { data } = await api.get(`/movie/${id}`, {
    params: { append_to_response: 'videos,release_dates' },
  });
  return data;
};

// Obtener películas similares
export const getSimilarMovies = async (movieId: number): Promise<Movie[]> => {
  const { data } = await api.get(`/movie/${movieId}/similar`);
  return data.results.slice(0, 20);
};

// Obtener recomendaciones de películas
export const getRecommendedMovies = async (movieId: number): Promise<Movie[]> => {
  const { data } = await api.get(`/movie/${movieId}/recommendations`);
  return data.results.slice(0, 20);
};

// ===== SERIES =====

// Obtener series populares
export const getPopularTVShows = async (): Promise<TVShow[]> => {
  const { data } = await api.get('/tv/popular');
  return data.results;
};

// Obtener series mejor valoradas
export const getTopRatedTVShows = async (): Promise<TVShow[]> => {
  const { data } = await api.get('/tv/top_rated');
  return data.results;
};

// Obtener series en emisión
export const getOnTheAirTVShows = async (): Promise<TVShow[]> => {
  const { data } = await api.get('/tv/on_the_air');
  return data.results;
};

// Obtener series que se emiten hoy
export const getAiringTodayTVShows = async (): Promise<TVShow[]> => {
  const { data } = await api.get('/tv/airing_today');
  return data.results;
};

// Obtener series por género
export const getTVShowsByGenre = async (genreId: number): Promise<TVShow[]> => {
  const { data } = await api.get('/discover/tv', {
    params: { with_genres: genreId },
  });
  return data.results;
};

// Obtener detalles de una serie
export const getTVShowDetails = async (id: number): Promise<TVShowDetail> => {
  const { data } = await api.get(`/tv/${id}`, {
    params: { append_to_response: 'videos,content_ratings' },
  });
  return data;
};

// Obtener series similares
export const getSimilarTVShows = async (tvId: number): Promise<TVShow[]> => {
  const { data } = await api.get(`/tv/${tvId}/similar`);
  return data.results.slice(0, 20);
};

// Obtener recomendaciones de series
export const getRecommendedTVShows = async (tvId: number): Promise<TVShow[]> => {
  const { data } = await api.get(`/tv/${tvId}/recommendations`);
  return data.results.slice(0, 20);
};

// ===== BÚSQUEDA =====

// Buscar películas
export const searchMovies = async (query: string): Promise<Movie[]> => {
  const { data } = await api.get('/search/movie', {
    params: { query },
  });
  return data.results;
};

// Buscar series
export const searchTVShows = async (query: string): Promise<TVShow[]> => {
  const { data } = await api.get('/search/tv', {
    params: { query },
  });
  return data.results;
};

// ===== UTILIDADES =====

// Construir URL de imagen
export const getImageUrl = (path: string, size: 'w500' | 'original' = 'w500') => {
  return path ? `${IMAGE_BASE}/${size}${path}` : '';
};

// Obtener URL del trailer de YouTube
export const getTrailerUrl = (item: MovieDetail | TVShowDetail): string | null => {
  const trailer = item.videos.results.find(
    (video) => video.type === 'Trailer' && video.site === 'YouTube'
  );
  return trailer ? `https://www.youtube.com/watch?v=${trailer.key}` : null;
};

// IDs de géneros populares
export const GENRES = {
  ACTION: 28,
  ADVENTURE: 12,
  ANIMATION: 16,
  COMEDY: 35,
  CRIME: 80,
  DOCUMENTARY: 99,
  DRAMA: 18,
  FAMILY: 10751,
  FANTASY: 14,
  HISTORY: 36,
  HORROR: 27,
  MUSIC: 10402,
  MYSTERY: 9648,
  ROMANCE: 10749,
  SCIENCE_FICTION: 878,
  THRILLER: 53,
  WAR: 10752,
  WESTERN: 37,
};

// ===== FUNCIONES DE INTEGRACIÓN (TMDB + ANILIST) =====

// Función para convertir Movie/TVShow a ContentItem
const tmdbToContentItem = (item: Movie | TVShow, type: 'movie' | 'tv'): ContentItem => {
  const title = 'title' in item ? item.title : item.name;
  const releaseDate = 'release_date' in item ? item.release_date : item.first_air_date;
  
  return {
    id: item.id,
    type,
    title,
    overview: item.overview,
    poster_path: item.poster_path,
    backdrop_path: item.backdrop_path,
    release_date: releaseDate,
    vote_average: item.vote_average,
    source: 'tmdb',
  };
};

// Función para convertir Anime a ContentItem
const animeToContentItem = (anime: Anime): ContentItem => {
  return {
    id: anime.id,
    type: 'anime',
    title: AniListService.getAnimeTitle(anime.title),
    overview: anime.description || '',
    poster_path: anime.coverImage.large,
    backdrop_path: anime.bannerImage || anime.coverImage.large,
    release_date: anime.startDate.year.toString(),
    vote_average: AniListService.getAnimeScore(anime.averageScore),
    source: 'anilist',
  };
};

// Obtener contenido popular combinado (películas, series y anime)
export const getAllPopularContent = async (): Promise<ContentItem[]> => {
  try {
    const [movies, tvShows, anime] = await Promise.all([
      getPopularMovies(),
      getPopularTVShows(),
      AniListService.getPopularAnime(),
    ]);

    const movieItems = movies.slice(0, 6).map(movie => tmdbToContentItem(movie, 'movie'));
    const tvItems = tvShows.slice(0, 6).map(show => tmdbToContentItem(show, 'tv'));
    const animeItems = anime.slice(0, 8).map(animeToContentItem);

    return [...movieItems, ...tvItems, ...animeItems];
  } catch (error) {
    console.error('Error fetching all popular content:', error);
    return [];
  }
};

// Obtener contenido mejor valorado combinado
export const getAllTopRatedContent = async (): Promise<ContentItem[]> => {
  try {
    const [movies, tvShows, anime] = await Promise.all([
      getTopRatedMovies(),
      getTopRatedTVShows(),
      AniListService.getTopRatedAnime(),
    ]);

    const movieItems = movies.slice(0, 6).map(movie => tmdbToContentItem(movie, 'movie'));
    const tvItems = tvShows.slice(0, 6).map(show => tmdbToContentItem(show, 'tv'));
    const animeItems = anime.slice(0, 8).map(animeToContentItem);

    return [...movieItems, ...tvItems, ...animeItems];
  } catch (error) {
    console.error('Error fetching all top rated content:', error);
    return [];
  }
};

// Búsqueda unificada en todas las APIs
export const searchAllContent = async (query: string): Promise<ContentItem[]> => {
  try {
    const [movies, tvShows, anime] = await Promise.all([
      searchMovies(query),
      searchTVShows(query),
      AniListService.searchAnime(query),
    ]);

    const movieItems = movies.map(movie => tmdbToContentItem(movie, 'movie'));
    const tvItems = tvShows.map(show => tmdbToContentItem(show, 'tv'));
    const animeItems = anime.map(animeToContentItem);

    return [...movieItems, ...tvItems, ...animeItems];
  } catch (error) {
    console.error('Error searching all content:', error);
    return [];
  }
};

// Obtener contenido en emisión/cartelera
export const getCurrentContent = async (): Promise<ContentItem[]> => {
  try {
    const [movies, tvShows, anime] = await Promise.all([
      getNowPlayingMovies(),
      getOnTheAirTVShows(),
      AniListService.getAiringAnime(),
    ]);

    const movieItems = movies.slice(0, 6).map(movie => tmdbToContentItem(movie, 'movie'));
    const tvItems = tvShows.slice(0, 6).map(show => tmdbToContentItem(show, 'tv'));
    const animeItems = anime.slice(0, 8).map(animeToContentItem);

    return [...movieItems, ...tvItems, ...animeItems];
  } catch (error) {
    console.error('Error fetching current content:', error);
    return [];
  }
};

// Obtener detalles unificados de contenido
export const getContentDetails = async (
  id: number, 
  type: 'movie' | 'tv' | 'anime',
  source: 'tmdb' | 'anilist'
): Promise<ContentItem | null> => {
  try {
    if (source === 'anilist' && type === 'anime') {
      const anime = await AniListService.getAnimeDetails(id);
      return animeToContentItem(anime);
    } else if (source === 'tmdb') {
      if (type === 'movie') {
        const movie = await getMovieDetails(id);
        return tmdbToContentItem(movie, 'movie');
      } else if (type === 'tv') {
        const tvShow = await getTVShowDetails(id);
        return tmdbToContentItem(tvShow, 'tv');
      }
    }
    return null;
  } catch (error) {
    console.error('Error fetching content details:', error);
    return null;
  }
};

// Categorías mejoradas que incluyen anime
export const ENHANCED_CATEGORIES = [
  {
    id: 'popular_all',
    name: 'Popular Ahora',
    fetcher: getAllPopularContent,
  },
  {
    id: 'top_rated_all',
    name: 'Mejor Valorado',
    fetcher: getAllTopRatedContent,
  },
  {
    id: 'current_all',
    name: 'En Emisión/Cartelera',
    fetcher: getCurrentContent,
  },
  {
    id: 'popular_anime',
    name: 'Anime Popular',
    fetcher: async () => (await AniListService.getPopularAnime()).map(animeToContentItem),
  },
  {
    id: 'airing_anime',
    name: 'Anime en Emisión',
    fetcher: async () => (await AniListService.getAiringAnime()).map(animeToContentItem),
  },
  {
    id: 'top_anime',
    name: 'Mejor Anime',
    fetcher: async () => (await AniListService.getTopRatedAnime()).map(animeToContentItem),
  },
  {
    id: 'popular_movies',
    name: 'Películas Populares',
    fetcher: async () => (await getPopularMovies()).map(movie => tmdbToContentItem(movie, 'movie')),
  },
  {
    id: 'popular_tv',
    name: 'Series Populares', 
    fetcher: async () => (await getPopularTVShows()).map(show => tmdbToContentItem(show, 'tv')),
  },
];

