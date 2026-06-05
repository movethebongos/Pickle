export type TmdbSettings = {
  locale?: string;
  providers?: string[];
  genres?: string[];
  contentTypes?: ('Movies' | 'Series')[];
  contentType?: 'Movies' | 'Series';
};

export type MovieCard = {
  id: string;
  title: string;
  year: number;
  description: string;
  image: string;
  providers: ProviderInfo[];
  genres: string[];
  type: 'Movies' | 'Series';
};

export type TmdbLocaleOption = {
  code: string;
  name: string;
};

export type TmdbProviderOption = {
  id: string;
  name: string;
  tmdbId: number;
  logoPath?: string;
  displayPriority?: number;
};

export type ProviderInfo = {
  id: string;
  name: string;
  logoPath?: string;
  displayPriority?: number;
};

export type TmdbGenreOption = {
  id: number;
  name: string;
  type: 'Movies' | 'Series';
};

const TMDB_TOKEN = 'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiJkZGNiMTllMmY4OTY3YWJhZTYyNzJiMTIzOTJkZDY0YiIsIm5iZiI6MTc1OTkzMzY4Mi42MzM5OTk4LCJzdWIiOiI2OGU2NzRmMmExMzJjOWUxZjA3OTUxZGMiLCJzY29wZXMiOlsiYXBpX3JlYWQiXSwidmVyc2lvbiI6MX0.4LT2VK6fWHY3NmTxxiOfamWZF5xOduKdDIRV1x92N7c'
const TMDB_BASE = 'https://api.themoviedb.org/3';
const IMAGE_BASE = 'https://image.tmdb.org/t/p/w780';
const TMDB_LOGO_BASE = 'https://image.tmdb.org/t/p/w92';

const providerMap: Record<string, number> = {
  netflix: 8,
  disney: 2,
  prime: 119,
  hbomax: 384,
};

const genreMap: Record<string, number> = {
  Action: 28,
  Comedy: 35,
  Drama: 18,
  Horror: 27,
  Romance: 10749,
  'Sci-Fi': 878,
  Thriller: 53,
};

const TMDB_CACHE_PREFIX = 'pickle:tmdb:';

const knownRegionLanguage: Record<string, string> = {
  US: 'en-US',
  GB: 'en-GB',
  SE: 'sv-SE',
  FR: 'fr-FR',
  DE: 'de-DE',
  ES: 'es-ES',
  IT: 'it-IT',
  JP: 'ja-JP',
  KR: 'ko-KR',
  CN: 'zh-CN',
  RU: 'ru-RU',
  BR: 'pt-BR',
  MX: 'es-MX',
  CA: 'en-CA',
  AU: 'en-AU',
  IN: 'en-IN',
};

function resolveProviderId(value: string): number | null {
  const numeric = Number(value);
  if (!Number.isNaN(numeric) && numeric > 0) {
    return numeric;
  }
  return providerMap[value] ?? null;
}

function getLanguageFromRegion(region: string) {
  return knownRegionLanguage[region] ?? 'en-US';
}

type TmdbCacheEntry = {
  savedAt: number;
  cards: MovieCard[];
};

function isLocalStorageAvailable() {
  try {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
  } catch {
    return false;
  }
}

function safeGetLocalStorage(key: string): string | null {
  if (!isLocalStorageAvailable()) {
    return null;
  }

  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSetLocalStorage(key: string, value: string) {
  if (!isLocalStorageAvailable()) {
    return;
  }

  try {
    window.localStorage.setItem(key, value);
  } catch {
    // ignore storage errors
  }
}

function normalizeSettingsCacheKey(settings: TmdbSettings) {
  const providers = [...(settings.providers ?? [])].map(String).filter(Boolean).sort();
  const genres = [...(settings.genres ?? [])].map(String).filter(Boolean).sort();
  const contentTypes = settings.contentTypes?.length
    ? [...settings.contentTypes].sort()
    : settings.contentType
      ? [settings.contentType]
      : ['Movies', 'Series'];

  return JSON.stringify({
    locale: settings.locale ?? 'US',
    providers,
    genres,
    contentTypes,
  });
}

function getTmdbCacheKey(settings: TmdbSettings, page: number, type: 'movie' | 'tv') {
  return `${TMDB_CACHE_PREFIX}${type}:${page}:${normalizeSettingsCacheKey(settings)}`;
}

function getCachedTmdbCards(settings: TmdbSettings, page: number, type: 'movie' | 'tv'): MovieCard[] | null {
  const key = getTmdbCacheKey(settings, page, type);
  const raw = safeGetLocalStorage(key);
  if (!raw) {
    return null;
  }

  try {
    const entry = JSON.parse(raw) as TmdbCacheEntry;
    return Array.isArray(entry.cards) ? entry.cards : null;
  } catch {
    return null;
  }
}

function storeTmdbCardsInCache(settings: TmdbSettings, page: number, type: 'movie' | 'tv', cards: MovieCard[]) {
  const key = getTmdbCacheKey(settings, page, type);
  const entry: TmdbCacheEntry = { savedAt: Date.now(), cards };
  safeSetLocalStorage(key, JSON.stringify(entry));
}

async function fetchTmdbJson(path: string) {
  const response = await fetch(`${TMDB_BASE}${path}${path.includes('?') ? '&' : '?'}api_key=ddcb19e2f8967abae6272b12392dd64b`, {
    headers: {
      Authorization: `Bearer ${TMDB_TOKEN}`,
      'Content-Type': 'application/json;charset=utf-8',
    },
  });
  if (!response.ok) {
    throw new Error(`TMDB request failed: ${response.status}`);
  }
  return response.json();
}

export async function fetchTmdbCountries() {
  const raw = await fetchTmdbJson('/configuration/countries');
  return (raw as any[]).map((item) => ({
    code: item.iso_3166_1,
    name: item.english_name,
  }));
}

export async function fetchTmdbProvidersForRegion(region: string, contentTypes: ('Movies' | 'Series')[]) {
  const requestedTypes = contentTypes.length === 0 ? ['Movies', 'Series'] as const : contentTypes;
  const requests = requestedTypes.map((type) => {
    const endpoint = type === 'Series' ? 'tv' : 'movie';
    return fetchTmdbJson(`/watch/providers/${endpoint}?watch_region=${region}`);
  });
  const responses = await Promise.all(requests);
  const providers = responses.flatMap((raw: any) => raw.results ?? []).map((item: any) => ({
    id: String(item.provider_id),
    name: item.provider_name,
    tmdbId: item.provider_id,
    logoPath: item.logo_path ? `${TMDB_LOGO_BASE}${item.logo_path}` : undefined,
    displayPriority: typeof item.display_priority === 'number' ? item.display_priority : undefined,
  }));
  const unique: Record<number, TmdbProviderOption> = {};
  providers.forEach((provider) => {
    if (!unique[provider.tmdbId]) {
      unique[provider.tmdbId] = provider;
    }
  });
  return Object.values(unique).sort((a, b) => {
    if (a.displayPriority !== undefined || b.displayPriority !== undefined) {
      const aPriority = a.displayPriority ?? Number.MAX_SAFE_INTEGER;
      const bPriority = b.displayPriority ?? Number.MAX_SAFE_INTEGER;
      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }
    }
    return a.name.localeCompare(b.name);
  });
}

export async function fetchTmdbGenresForRegion(region: string, contentTypes: ('Movies' | 'Series')[]) {
  const requestedTypes = contentTypes.length === 0 ? ['Movies', 'Series'] as const : contentTypes;
  const language = getLanguageFromRegion(region);
  const requests = requestedTypes.map((type) => {
    const endpoint = type === 'Series' ? 'tv' : 'movie';
    return fetchTmdbJson(`/genre/${endpoint}/list?language=${encodeURIComponent(language)}`);
  });
  const responses = await Promise.all(requests);
  const genres = responses.flatMap((raw: any, index) => {
    const type = requestedTypes[index];
    return (raw.genres ?? []).map((genre: any) => ({
      id: genre.id,
      name: genre.name,
      type,
    }));
  });

  const unique: Record<number, TmdbGenreOption> = {};
  genres.forEach((genre) => {
    if (!unique[genre.id]) {
      unique[genre.id] = genre;
    }
  });

  return Object.values(unique).sort((a, b) => a.name.localeCompare(b.name));
}

function buildDiscoverUrl(settings: TmdbSettings, page: number, type: 'movie' | 'tv') {
  const region = settings.locale ?? 'US';
  const searchParams = new URLSearchParams({
    api_key: 'ddcb19e2f8967abae6272b12392dd64b',
    language: getLanguageFromRegion(region),
    page: String(page),
    include_adult: 'false',
    sort_by: 'popularity.desc',
    watch_region: region,
  });

  if (settings.providers?.length) {
    const providerIds = settings.providers
      .map((provider) => resolveProviderId(provider))
      .filter(Boolean)
      .join('|');
    if (providerIds) {
      // Use OR semantics for selected providers so TMDB returns content available on any selected provider.
      searchParams.set('with_watch_providers', providerIds);
    }
  }

  if (settings.genres?.length) {
    const genreIds = settings.genres
      .map((genre) => {
        const numeric = Number(genre);
        return Number.isInteger(numeric) && numeric > 0 ? numeric : genreMap[genre];
      })
      .filter(Boolean)
      .join('|');
    if (genreIds) {
      // Use OR semantics for selected genres so TMDB returns items matching any selected genre,
      // instead of requiring every selected genre at once.
      searchParams.set('with_genres', genreIds);
    }
  }

  return `${TMDB_BASE}/discover/${type}?${searchParams.toString()}`;
}

async function fetchTmdbRaw(settings: TmdbSettings, page: number, type: 'movie' | 'tv') {
  const url = buildDiscoverUrl(settings, page, type);
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${TMDB_TOKEN}`,
      'Content-Type': 'application/json;charset=utf-8',
    },
  });
  if (!response.ok) {
    throw new Error(`TMDB request failed: ${response.status}`);
  }
  return response.json();
}

function getYear(value?: string) {
  return value ? Number(value.slice(0, 4)) || new Date().getFullYear() : new Date().getFullYear();
}

async function fetchTmdbWatchProviders(itemId: number, endpoint: 'movie' | 'tv', region: string) {
  try {
    const raw = await fetchTmdbJson(`/${endpoint}/${itemId}/watch/providers`);
    const regionData = raw.results?.[region] ?? {};
    const categories = ['flatrate', 'ads', 'free', 'rent', 'buy'] as const;
    const unique: Record<string, ProviderInfo> = {};

    categories.forEach((category) => {
      const list = regionData[category];
      if (Array.isArray(list)) {
        list.forEach((provider: any) => {
          if (!provider.provider_id || !provider.provider_name) {
            return;
          }
          const providerId = String(provider.provider_id);
          if (!unique[providerId]) {
            unique[providerId] = {
              id: providerId,
              name: provider.provider_name,
              logoPath: provider.logo_path ? `${TMDB_LOGO_BASE}${provider.logo_path}` : undefined,
              displayPriority: typeof provider.display_priority === 'number' ? provider.display_priority : undefined,
            };
          }
        });
      }
    });

    return Object.values(unique).sort((a, b) => {
      if (a.displayPriority !== undefined || b.displayPriority !== undefined) {
        const aPriority = a.displayPriority ?? Number.MAX_SAFE_INTEGER;
        const bPriority = b.displayPriority ?? Number.MAX_SAFE_INTEGER;
        if (aPriority !== bPriority) {
          return aPriority - bPriority;
        }
      }
      return a.name.localeCompare(b.name);
    });
  } catch {
    return [];
  }
}

function mapGenres(genreIds: number[], _type: 'Movies' | 'Series') {
  const reverse: Record<number, string> = {
    28: 'Action',
    35: 'Comedy',
    18: 'Drama',
    27: 'Horror',
    10749: 'Romance',
    878: 'Sci-Fi',
    53: 'Thriller',
    10759: 'Action',
    9648: 'Mystery',
  };
  return genreIds.map((id) => reverse[id]).filter(Boolean).slice(0, 3);
}

function shuffleArray<T>(items: T[]) {
  return [...items].sort(() => Math.random() - 0.5);
}

export async function fetchTmdbCards(settings: TmdbSettings, page: number) {
  const requestedTypes = settings.contentTypes?.length
    ? settings.contentTypes
    : settings.contentType
      ? [settings.contentType]
      : ['Movies', 'Series'];

  const normalizedTypes = Array.from(new Set(requestedTypes.length ? requestedTypes : ['Movies', 'Series'])) as ('Movies' | 'Series')[];
  const region = settings.locale ?? 'US';

  const requests = normalizedTypes.map(async (type) => {
    const endpoint = type === 'Series' ? 'tv' : 'movie';
    const cached = getCachedTmdbCards(settings, page, endpoint);
    if (cached && cached.length) {
      return cached;
    }

    const raw = await fetchTmdbRaw(settings, page, endpoint);
    const results = raw.results ?? [];

    const cards = await Promise.all(results.map(async (item: any) => {
      const itemType = item.media_type === 'tv' || item.first_air_date ? 'Series' : 'Movies';
      const normalizedType = normalizedTypes.length === 1 ? normalizedTypes[0] : itemType;
      const watchProviders = await fetchTmdbWatchProviders(item.id, endpoint, region);
      return {
        id: `${normalizedType.toLowerCase()}-${item.id}`,
        title: item.title || item.name || 'Untitled',
        year: getYear(item.release_date || item.first_air_date),
        description: item.overview || 'A great pick from TMDB.',
        image: item.poster_path ? `${IMAGE_BASE}${item.poster_path}` : `${IMAGE_BASE}${item.backdrop_path}`,
        providers: watchProviders,
        genres: mapGenres(item.genre_ids || [], normalizedType),
        type: normalizedType,
      };
    })) as MovieCard[];

    storeTmdbCardsInCache(settings, page, endpoint, cards);
    return cards;
  });

  const responses = await Promise.all(requests);
  const results = responses.flatMap((cards) => cards);

  return shuffleArray(results);
}
