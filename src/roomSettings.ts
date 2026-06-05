export type ContentType = 'Movies' | 'Series';

export type StoredRoomSettings = {
  locale: string;
  selectedProviders: string[];
  selectedGenres: string[];
  selectedContentTypes: ContentType[];
};

const STORAGE_KEY = 'pickle-room-settings';

const DEFAULTS: StoredRoomSettings = {
  locale: 'US',
  selectedProviders: [],
  selectedGenres: [],
  selectedContentTypes: ['Movies', 'Series'],
};

function isContentType(value: unknown): value is ContentType {
  return value === 'Movies' || value === 'Series';
}

function parseStoredRoomSettings(raw: string): StoredRoomSettings | null {
  try {
    const parsed = JSON.parse(raw) as Partial<StoredRoomSettings>;
    if (typeof parsed.locale !== 'string' || !parsed.locale.trim()) {
      return null;
    }

    const selectedProviders = Array.isArray(parsed.selectedProviders)
      ? parsed.selectedProviders.filter((id): id is string => typeof id === 'string')
      : DEFAULTS.selectedProviders;

    const selectedGenres = Array.isArray(parsed.selectedGenres)
      ? parsed.selectedGenres.filter((id): id is string => typeof id === 'string')
      : DEFAULTS.selectedGenres;

    const selectedContentTypes = Array.isArray(parsed.selectedContentTypes)
      ? parsed.selectedContentTypes.filter(isContentType)
      : DEFAULTS.selectedContentTypes;

    return {
      locale: parsed.locale,
      selectedProviders,
      selectedGenres,
      selectedContentTypes: selectedContentTypes.length > 0 ? selectedContentTypes : DEFAULTS.selectedContentTypes,
    };
  } catch {
    return null;
  }
}

export function getStoredRoomSettings(): StoredRoomSettings | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    return parseStoredRoomSettings(raw);
  } catch {
    return null;
  }
}

export function resolveRoomSettings(): StoredRoomSettings {
  return getStoredRoomSettings() ?? DEFAULTS;
}

export function persistRoomSettings(settings: StoredRoomSettings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // ignore quota / private mode
  }
}
