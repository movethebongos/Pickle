import { useEffect, useMemo, useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db, ensureAuth } from '../firebase.ts';
import { persistRoomSettings, resolveRoomSettings, type ContentType } from '../roomSettings.ts';
import { fetchTmdbCountries, fetchTmdbProvidersForRegion, fetchTmdbGenresForRegion, type TmdbProviderOption, type TmdbLocaleOption, type TmdbGenreOption } from '../tmdb.ts';
import AppShell, { GlassPanel } from './AppShell.tsx';
import GlassButton from './GlassButton.tsx';
import ShareButton from './ShareButton.tsx';

interface SettingsScreenProps {
  code: string;
  isHost: boolean;
  activeUsers: number;
  onBack: () => void;
  onStartPickling: () => void;
}

const initialLocaleOptions: TmdbLocaleOption[] = [{ code: 'US', name: 'United States' }];

export default function SettingsScreen({ code, isHost, activeUsers, onBack, onStartPickling }: SettingsScreenProps) {
  const savedSettings = useMemo(() => (isHost ? resolveRoomSettings() : null), [isHost]);

  const [locale, setLocale] = useState(savedSettings?.locale ?? 'US');
  const [localeOptions, setLocaleOptions] = useState<TmdbLocaleOption[]>(initialLocaleOptions);
  const [providerOptions, setProviderOptions] = useState<TmdbProviderOption[]>([]);
  const [selectedProviders, setSelectedProviders] = useState<string[]>(savedSettings?.selectedProviders ?? []);
  const [genreOptions, setGenreOptions] = useState<TmdbGenreOption[]>([]);
  const [selectedGenres, setSelectedGenres] = useState<string[]>(savedSettings?.selectedGenres ?? []);
  const [selectedContentTypes, setSelectedContentTypes] = useState<ContentType[]>(
    savedSettings?.selectedContentTypes ?? ['Movies', 'Series'],
  );
  const [statusMessage, setStatusMessage] = useState(() =>
    isHost ? '' : 'Waiting for host to start the room.',
  );
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState('');

  const providerSummary = useMemo(() => {
    if (!providerOptions.length) {
      return 'Loading providers…';
    }
    if (selectedProviders.length === 0) {
      return `No providers selected yet.`;
    }
    if (selectedProviders.length === providerOptions.length) {
      return `All providers in ${locale} are included.`;
    }
    const selectedLabels = selectedProviders
      .map((id) => providerOptions.find((provider) => provider.id === id)?.name)
      .filter(Boolean);
    return selectedLabels.length > 0
      ? `Selected providers: ${selectedLabels.join(', ')}`
      : `No providers selected yet.`;
  }, [selectedProviders, providerOptions, locale]);

  const genreSummary = useMemo(() => {
    if (!genreOptions.length) {
      return 'Loading genres…';
    }
    if (selectedGenres.length === 0) {
      return `No genres selected yet.`;
    }
    if (selectedGenres.length === genreOptions.length) {
      return `All genres in ${locale} are included.`;
    }
    const selectedNames = selectedGenres
      .map((id) => genreOptions.find((genre) => String(genre.id) === id)?.name)
      .filter(Boolean);
    return selectedNames.length > 0 ? selectedNames.join(', ') : `No genres selected yet.`;
  }, [selectedGenres, genreOptions, locale]);

  const toggleProvider = (providerId: string) => {
    setSelectedProviders((current) =>
      current.includes(providerId) ? current.filter((item) => item !== providerId) : [...current, providerId],
    );
  };

  const toggleGenre = (genre: string) => {
    setSelectedGenres((current) =>
      current.includes(genre) ? current.filter((item) => item !== genre) : [...current, genre],
    );
  };

  const selectAllProviders = () => {
    setSelectedProviders(providerOptions.map((provider) => provider.id));
  };

  const clearProviders = () => {
    setSelectedProviders([]);
  };

  const selectAllGenres = () => {
    setSelectedGenres(genreOptions.map((genre) => String(genre.id)));
  };

  const clearGenres = () => {
    setSelectedGenres([]);
  };

  useEffect(() => {
    const loadRegionMetadata = async () => {
      setError('');
      try {
        const [countries, providers, genres] = await Promise.all([
          fetchTmdbCountries(),
          fetchTmdbProvidersForRegion(locale, selectedContentTypes),
          fetchTmdbGenresForRegion(locale, selectedContentTypes),
        ]);

        setLocaleOptions(countries);
        setProviderOptions(providers);
        setGenreOptions(genres);

      } catch (err) {
        console.error('Failed to load TMDB metadata', err);
        const message = err instanceof Error ? err.message : String(err);
        setError(`Could not load region metadata. ${message}`);
      }
    };

    loadRegionMetadata();
  }, [locale, selectedContentTypes]);

  useEffect(() => {
    if (!isHost) {
      return;
    }
    persistRoomSettings({
      locale,
      selectedProviders,
      selectedGenres,
      selectedContentTypes,
    });
  }, [isHost, locale, selectedProviders, selectedGenres, selectedContentTypes]);

  useEffect(() => {
    if (!isHost || !providerOptions.length) {
      return;
    }
    setSelectedProviders((current) => {
      const valid = current.filter((id) => providerOptions.some((provider) => provider.id === id));
      return valid.length === current.length ? current : valid;
    });
  }, [providerOptions, isHost]);

  useEffect(() => {
    if (!isHost || !genreOptions.length) {
      return;
    }
    setSelectedGenres((current) => {
      const valid = current.filter((id) => genreOptions.some((genre) => String(genre.id) === id));
      return valid.length === current.length ? current : valid;
    });
  }, [genreOptions, isHost]);

  const toggleContentType = (type: ContentType) => {
    setSelectedContentTypes((current) =>
      current.includes(type) ? current.filter((item) => item !== type) : [...current, type],
    );
  };
  const startPickling = async () => {
    setError('');
    setStarting(true);
    try {
      await ensureAuth();
      const roomRef = doc(db, 'rooms', code);
      const settings = {
        locale,
        selectedProviders,
        selectedGenres,
        selectedContentTypes,
      };
      persistRoomSettings(settings);
      await updateDoc(roomRef, {
        status: 'active',
        locale: settings.locale,
        providers: settings.selectedProviders,
        providerNames: settings.selectedProviders.map(
          (id) => providerOptions.find((provider) => provider.id === id)?.name ?? id,
        ),
        genres: settings.selectedGenres,
        contentTypes: settings.selectedContentTypes,
      });
      setStatusMessage('Room is now active. Pickling started!');
      onStartPickling();
    } catch (err) {
      console.error('Start pickling failed', err);
      const message = err instanceof Error ? err.message : String(err);
      setError(`Could not start pickling. ${message}`);
    } finally {
      setStarting(false);
    }
  };

  return (
    <AppShell isHost={isHost} screen="settings">
      <div className="flex flex-col gap-8">
        <header className="space-y-4 text-center">
          <p className="pickle-eyebrow">Room settings</p>
          <h1 className="pickle-title text-4xl sm:text-5xl">Room settings</h1>
          <p className="pickle-subtitle mx-auto max-w-2xl text-base sm:text-lg">
            {isHost
              ? 'Configure the room before everyone starts pickling.'
              : 'Waiting for the host to finish setup and start the room.'}
          </p>
        </header>

        <GlassPanel>
          <div className="grid gap-6 sm:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-5 text-left">
              <div>
                <p className="text-sm font-medium text-[var(--pickle-text-muted)]">Room shortcode</p>
                <p className="pickle-title mt-2 text-3xl tracking-[0.18em]">{code}</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="glass-panel">
                  <div className="glass-panel__inner !py-4">
                    <p className="text-sm font-medium text-[var(--pickle-text-muted)]">Role</p>
                    <p className="mt-2 font-medium">{isHost ? 'Host' : 'Guest'}</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="glass-panel">
              <div className="glass-panel__inner !py-4 text-left">
                <p className="text-sm font-medium text-[var(--pickle-text-muted)]">Current status</p>
                <p className="mt-2 font-medium">{isHost ? `Host can configure the room, ${activeUsers} ${activeUsers === 1 ? 'person' : 'people'}` : statusMessage}</p>
              </div>
            </div>
          </div>
        </GlassPanel>

        {isHost ? (
          <div className="grid gap-6">
            <GlassPanel>
              <div className="grid gap-5 sm:grid-cols-2 text-left">
                <label className="grid gap-2">
                  <span className="text-sm font-medium text-[var(--pickle-text-muted)]">Locale</span>
                  <select
                    value={locale}
                    onChange={(event) => setLocale(event.target.value)}
                    className="glass-input glass-select"
                  >
                    {localeOptions.map((option) => (
                      <option key={option.code} value={option.code}>
                        {option.name} ({option.code})
                      </option>
                    ))}
                  </select>
                </label>

                <div>
                  <p className="text-sm font-medium text-[var(--pickle-text-muted)]">Content type</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(['Movies', 'Series'] as const).map((type) => {
                      const isSelected = selectedContentTypes.includes(type);
                      return (
                        <button
                          key={type}
                          type="button"
                          onClick={() => toggleContentType(type)}
                          className={`glass-chip ${isSelected ? 'glass-chip--selected' : ''}`}
                        >
                          {type}
                        </button>
                      );
                    })}
                  </div>
                  <p className="pickle-subtitle mt-3 text-sm">
                    Select one or both to filter movies and series.
                  </p>
                </div>
              </div>
            </GlassPanel>

            <GlassPanel>
              <div className="space-y-5 text-left">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-[var(--pickle-text-muted)]">Streaming providers</p>
                    <p className="pickle-subtitle mt-1 text-sm">Tap to include or exclude providers.</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={selectAllProviders} className="glass-chip">
                      Select all
                    </button>
                    <button type="button" onClick={clearProviders} className="glass-chip">
                      Clear
                    </button>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {providerOptions.map((provider) => {
                    const isSelected = selectedProviders.includes(provider.id);
                    return (
                      <button
                        key={provider.id}
                        type="button"
                        onClick={() => toggleProvider(provider.id)}
                        className={`glass-tile ${isSelected ? 'glass-tile--selected' : ''}`}
                      >
                        <div className="pickle-provider-logo mx-auto flex h-12 w-12 items-center justify-center rounded-2xl text-sm font-bold">
                          {provider.logoPath ? (
                            <img src={provider.logoPath} alt={provider.name} className="h-full w-full object-contain" />
                          ) : (
                            provider.name.slice(0, 2).toUpperCase()
                          )}
                        </div>
                        <p className="mt-3 text-sm font-semibold">{provider.name}</p>
                        <p className="mt-1 text-xs text-[var(--pickle-text-soft)]">{isSelected ? 'Included' : 'Excluded'}</p>
                      </button>
                    );
                  })}
                </div>
                <p className="pickle-subtitle text-sm">{providerSummary}</p>
              </div>
            </GlassPanel>

            <GlassPanel>
              <div className="space-y-5 text-left">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-[var(--pickle-text-muted)]">Genres</p>
                    <p className="pickle-subtitle mt-1 text-sm">Select genres that matter most.</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={selectAllGenres} className="glass-chip">
                      Select all
                    </button>
                    <button type="button" onClick={clearGenres} className="glass-chip">
                      Clear
                    </button>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {genreOptions.map((genre) => {
                    const genreId = String(genre.id);
                    const isSelected = selectedGenres.includes(genreId);
                    return (
                      <button
                        key={genre.id}
                        type="button"
                        onClick={() => toggleGenre(genreId)}
                        className={`glass-tile text-left ${isSelected ? 'glass-tile--selected' : ''}`}
                      >
                        <p className="text-sm font-semibold">{genre.name}</p>
                      </button>
                    );
                  })}
                </div>
                <p className="pickle-subtitle text-sm">{genreSummary}</p>
              </div>
            </GlassPanel>

            <GlassPanel>
              <div className="flex flex-col gap-5 text-left">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-[var(--pickle-text-muted)]">Pickling status</p>
                    <p className="pickle-subtitle mt-1 text-sm">Activate the room when you are ready.</p>
                  </div>
                  <span className="glass-chip glass-chip--selected">
                    {selectedContentTypes.length === 1 ? selectedContentTypes[0] : 'Both'}
                  </span>
                </div>
                <GlassButton block accent disabled={starting} onClick={startPickling}>
                  {starting ? 'Starting pickling…' : 'Start Pickling'}
                </GlassButton>
                {error ? <div className="glass-alert">{error}</div> : null}
                {!error && statusMessage ? (
                  <p className="pickle-subtitle text-sm">{statusMessage}</p>
                ) : null}
              </div>
            </GlassPanel>
          </div>
        ) : (
          <GlassPanel>
            <div className="text-center">
              <p className="pickle-title text-xl">Waiting for host to start…</p>
              <p className="pickle-subtitle mx-auto mt-3 max-w-lg text-sm">
                The room creator is setting the locale, providers, genres, and content type. You will be able to join once they activate the room.
              </p>
            </div>
          </GlassPanel>
        )}

        <div className="flex flex-wrap gap-4 justify-center">
          <ShareButton code={code} />
          <GlassButton compact onClick={onBack}>
            Leave room
          </GlassButton>
        </div>
      </div>
    </AppShell>
  );
}
