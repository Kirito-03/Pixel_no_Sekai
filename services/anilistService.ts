import { Anime, AnimeDetail } from '../types';

const ANILIST_API_URL = 'https://graphql.anilist.co';

// Función auxiliar para hacer consultas GraphQL
const graphqlRequest = async (query: string, variables: any = {}) => {
  const response = await fetch(ANILIST_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      query,
      variables,
    }),
  });

  const data = await response.json();
  
  if (data.errors) {
    throw new Error(data.errors[0].message);
  }
  
  return data.data;
};

// Consulta GraphQL para obtener anime populares
const POPULAR_ANIME_QUERY = `
  query ($page: Int, $perPage: Int) {
    Page(page: $page, perPage: $perPage) {
      media(type: ANIME, sort: POPULARITY_DESC, status: FINISHED) {
        id
        title {
          romaji
          english
          native
        }
        description
        coverImage {
          large
          medium
        }
        bannerImage
        startDate {
          year
          month
          day
        }
        averageScore
        episodes
        status
        genres
        format
      }
    }
  }
`;

// Consulta GraphQL para obtener anime mejor puntuados
const TOP_RATED_ANIME_QUERY = `
  query ($page: Int, $perPage: Int) {
    Page(page: $page, perPage: $perPage) {
      media(type: ANIME, sort: SCORE_DESC, status: FINISHED) {
        id
        title {
          romaji
          english
          native
        }
        description
        coverImage {
          large
          medium
        }
        bannerImage
        startDate {
          year
          month
          day
        }
        averageScore
        episodes
        status
        genres
        format
      }
    }
  }
`;

// Consulta GraphQL para anime en emisión
const AIRING_ANIME_QUERY = `
  query ($page: Int, $perPage: Int) {
    Page(page: $page, perPage: $perPage) {
      media(type: ANIME, sort: POPULARITY_DESC, status: RELEASING) {
        id
        title {
          romaji
          english
          native
        }
        description
        coverImage {
          large
          medium
        }
        bannerImage
        startDate {
          year
          month
          day
        }
        averageScore
        episodes
        status
        genres
        format
      }
    }
  }
`;

// Consulta GraphQL para detalles de anime
const ANIME_DETAILS_QUERY = `
  query ($id: Int) {
    Media(id: $id, type: ANIME) {
      id
      title {
        romaji
        english
        native
      }
      description
      coverImage {
        large
        medium
      }
      bannerImage
      startDate {
        year
        month
        day
      }
      averageScore
      episodes
      status
      genres
      format
      duration
      studios {
        nodes {
          name
        }
      }
      trailer {
        id
        site
      }
      characters(page: 1, perPage: 8) {
        nodes {
          id
          name {
            full
          }
          image {
            medium
          }
        }
      }
      recommendations(page: 1, perPage: 8) {
        nodes {
          mediaRecommendation {
            id
            title {
              romaji
              english
              native
            }
            description
            coverImage {
              large
              medium
            }
            bannerImage
            startDate {
              year
              month
              day
            }
            averageScore
            episodes
            status
            genres
            format
          }
        }
      }
    }
  }
`;

// Consulta GraphQL para búsqueda
const SEARCH_ANIME_QUERY = `
  query ($search: String, $page: Int, $perPage: Int) {
    Page(page: $page, perPage: $perPage) {
      media(type: ANIME, search: $search) {
        id
        title {
          romaji
          english
          native
        }
        description
        coverImage {
          large
          medium
        }
        bannerImage
        startDate {
          year
          month
          day
        }
        averageScore
        episodes
        status
        genres
        format
      }
    }
  }
`;

// Consulta GraphQL por género
const ANIME_BY_GENRE_QUERY = `
  query ($genre: String, $page: Int, $perPage: Int) {
    Page(page: $page, perPage: $perPage) {
      media(type: ANIME, genre: $genre, sort: POPULARITY_DESC) {
        id
        title {
          romaji
          english
          native
        }
        description
        coverImage {
          large
          medium
        }
        bannerImage
        startDate {
          year
          month
          day
        }
        averageScore
        episodes
        status
        genres
        format
      }
    }
  }
`;

// Función para convertir datos de AniList a formato unificado
const normalizeAnime = (anime: any): Anime => ({
  ...anime,
  source: 'anilist' as const,
});

// Función para convertir datos de AniList a formato detallado
const normalizeAnimeDetail = (anime: any): AnimeDetail => ({
  ...anime,
  source: 'anilist' as const,
  studios: anime.studios || { nodes: [] },
  characters: anime.characters || { nodes: [] },
  recommendations: anime.recommendations || { nodes: [] },
});

// ===== FUNCIONES EXPORTADAS =====

// Obtener anime populares
export const getPopularAnime = async (page: number = 1, perPage: number = 20): Promise<Anime[]> => {
  const data = await graphqlRequest(POPULAR_ANIME_QUERY, { page, perPage });
  return data.Page.media.map(normalizeAnime);
};

// Obtener anime mejor puntuados
export const getTopRatedAnime = async (page: number = 1, perPage: number = 20): Promise<Anime[]> => {
  const data = await graphqlRequest(TOP_RATED_ANIME_QUERY, { page, perPage });
  return data.Page.media.map(normalizeAnime);
};

// Obtener anime en emisión
export const getAiringAnime = async (page: number = 1, perPage: number = 20): Promise<Anime[]> => {
  const data = await graphqlRequest(AIRING_ANIME_QUERY, { page, perPage });
  return data.Page.media.map(normalizeAnime);
};

// Obtener detalles de un anime
export const getAnimeDetails = async (id: number): Promise<AnimeDetail> => {
  const data = await graphqlRequest(ANIME_DETAILS_QUERY, { id });
  return normalizeAnimeDetail(data.Media);
};

// Buscar anime
export const searchAnime = async (query: string, page: number = 1, perPage: number = 20): Promise<Anime[]> => {
  const data = await graphqlRequest(SEARCH_ANIME_QUERY, { search: query, page, perPage });
  return data.Page.media.map(normalizeAnime);
};

// Obtener anime por género
export const getAnimeByGenre = async (genre: string, page: number = 1, perPage: number = 20): Promise<Anime[]> => {
  const data = await graphqlRequest(ANIME_BY_GENRE_QUERY, { genre, page, perPage });
  return data.Page.media.map(normalizeAnime);
};

// Obtener anime similares (usando recomendaciones)
export const getSimilarAnime = async (animeId: number): Promise<Anime[]> => {
  const animeDetails = await getAnimeDetails(animeId);
  return animeDetails.recommendations?.nodes?.map(rec => normalizeAnime(rec.mediaRecommendation)) || [];
};

// Géneros populares de anime
export const ANIME_GENRES = [
  'Action',
  'Adventure',
  'Comedy',
  'Drama',
  'Fantasy',
  'Horror',
  'Romance',
  'Sci-Fi',
  'Slice of Life',
  'Sports',
  'Supernatural',
  'Thriller',
  'Mystery',
  'Psychological',
  'Mecha',
  'Music',
  'School',
  'Military',
  'Historical',
  'Seinen',
  'Shounen',
  'Shoujo',
  'Josei'
];

// Función auxiliar para construir URL de imagen de AniList
export const getAnimeImageUrl = (imageUrl: string): string => {
  return imageUrl || '';
};

// Función auxiliar para obtener título preferido
export const getAnimeTitle = (titleObj: { romaji: string; english?: string; native: string }): string => {
  return titleObj.english || titleObj.romaji || titleObj.native;
};

// Función auxiliar para obtener año de lanzamiento
export const getAnimeYear = (startDate: { year: number; month?: number; day?: number }): number => {
  return startDate.year;
};

// Función auxiliar para obtener puntuación normalizada
export const getAnimeScore = (averageScore: number): number => {
  return averageScore ? averageScore / 10 : 0; // AniList usa escala 0-100, normalizamos a 0-10
};
