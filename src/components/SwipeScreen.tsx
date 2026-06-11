import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { collection, doc, getDocs, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';
import MatchOverlay, { type MatchDetails } from './MatchOverlay.tsx';
import { db, ensureAuth } from '../firebase.ts';
import { fetchTmdbCards, type ProviderInfo } from '../tmdb.ts';
import AppShell, { GlassPanel } from './AppShell.tsx';
import GlassButton from './GlassButton.tsx';
import ShareButton from './ShareButton.tsx';

type RoomSettings = {
  status?: string;
  locale?: string;
  providers?: string[];
  providerNames?: string[];
  genres?: string[];
  contentTypes?: ('Movies' | 'Series')[];
  contentType?: 'Movies' | 'Series';
  activeUsers?: string[];
  matchedMovie?: MatchDetails;
};

type MovieCard = {
  id: string;
  title: string;
  year: number;
  description: string;
  image: string;
  providers: ProviderInfo[];
  genres: string[];
  type: 'Movies' | 'Series';
};

function shuffleArray<T>(items: T[]) {
  return [...items].sort(() => Math.random() - 0.5);
}

interface SwipeScreenProps {
  code: string;
  isHost: boolean;
  onBack: () => void;
  onEditSettings: () => void;
}

export default function SwipeScreen({ code, isHost, onBack, onEditSettings }: SwipeScreenProps) {
  const [roomSettings, setRoomSettings] = useState<RoomSettings | null>(null);
  const [cards, setCards] = useState<MovieCard[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [swipeAction, setSwipeAction] = useState<'yes' | 'no' | null>(null);
  const [isAnimatingSwipe, setIsAnimatingSwipe] = useState(false);
  const [flashVote, setFlashVote] = useState<'yes' | 'no' | null>(null);
  const [returningToSettings, setReturningToSettings] = useState(false);
  const startPoint = useRef<{ x: number; y: number } | null>(null);
  const usedIdsRef = useRef<Set<string>>(new Set());
  const cardCacheRef = useRef<Record<string, MovieCard>>({});
  const tmdbPage = useRef(1);

  const normalizeVoteValue = (value: unknown): boolean | null => {
    if (value === true || value === 'yes' || value === 'true' || value === 1) {
      return true;
    }
    if (value === false || value === 'no' || value === 'false' || value === 0) {
      return false;
    }
    return null;
  };

  const attemptMatchForMovie = async (codeToMatch: string, movieId: string): Promise<void> => {
    await ensureAuth();
    const roomRef = doc(db, 'rooms', codeToMatch);
    const votesCollection = collection(db, 'rooms', codeToMatch, 'votes');

    try {
      const voteSnapshot = await getDocs(votesCollection);
      const voteDocs = voteSnapshot.docs;
      const roomUsers = Array.isArray(roomSettings?.activeUsers)
        ? roomSettings.activeUsers.map((userId) => String(userId).trim()).filter(Boolean)
        : [];
      const activeUsers = roomUsers.length > 0
        ? roomUsers
        : voteDocs.map((voteDoc) => voteDoc.id);

      if (activeUsers.length === 0) {
        return;
      }

      const yesCounts = voteDocs.reduce((counts: Map<string, number>, voteDoc) => {
        const voteData = voteDoc.data() as Record<string, unknown>;
        Object.entries(voteData).forEach(([id, value]) => {
          const normalized = normalizeVoteValue(value);
          if (normalized === true) {
            counts.set(id, (counts.get(id) ?? 0) + 1);
          }
        });
        return counts;
      }, new Map<string, number>());

      if ((yesCounts.get(movieId) ?? 0) !== activeUsers.length) {
        return;
      }

      const matchedCard = cardCacheRef.current[movieId];
      if (!matchedCard) {
        return;
      }

      await updateDoc(roomRef, {
        status: 'matched',
        matchedMovie: {
          id: matchedCard.id,
          title: matchedCard.title,
          year: matchedCard.year,
          image: matchedCard.image,
          providers: matchedCard.providers,
          type: matchedCard.type,
        },
      });
    } catch (error) {
      console.error('Match detection failed', error);
    }
  };

  useEffect(() => {
    let unsubscribe = () => {};

    const subscribeToRoom = async () => {
      try {
        await ensureAuth();
        const roomRef = doc(db, 'rooms', code);
        unsubscribe = onSnapshot(
          roomRef,
          (snapshot) => {
            if (!snapshot.exists()) {
              setError('Room not found.');
              return;
            }
            const data = snapshot.data() as RoomSettings;
            setRoomSettings(data);
          },
          (err) => {
            console.error('Room snapshot failed', err);
            setError(`Could not load room data. ${err.message}`);
          },
        );
      } catch (err) {
        console.error('Room subscription failed', err);
        const message = err instanceof Error ? err.message : String(err);
        setError(`Could not subscribe to room data. ${message}`);
      }
    };

    subscribeToRoom();
    return () => unsubscribe();
  }, [code]);

  useEffect(() => {
    if (!roomSettings || roomSettings.status !== 'active') {
      return;
    }

    let unsubscribe = () => {};

    const subscribeToVotes = async () => {
      try {
        await ensureAuth();
        const votesCollection = collection(db, 'rooms', code, 'votes');
        unsubscribe = onSnapshot(
          votesCollection,
          (snapshot) => {
            if (roomSettings.matchedMovie) {
              return;
            }

            const roomUsers = Array.isArray(roomSettings.activeUsers)
              ? roomSettings.activeUsers.map((userId) => String(userId).trim()).filter(Boolean)
              : [];
            const voteUsers = snapshot.docs.map((voteDoc) => String(voteDoc.id).trim()).filter(Boolean);
            const joinedUserIds = new Set<string>([...roomUsers, ...voteUsers]);
            const activeUsers = Array.from(joinedUserIds);

            const summary: Record<string, { yes: number; no: number }> = {};
            snapshot.docs.forEach((voteDoc) => {
              const voteData = voteDoc.data() as Record<string, unknown>;
              Object.entries(voteData).forEach(([cardId, value]) => {
                const normalized = normalizeVoteValue(value);
                if (normalized !== null) {
                  const entry = summary[cardId] ?? { yes: 0, no: 0 };
                  if (normalized) {
                    entry.yes += 1;
                  } else {
                    entry.no += 1;
                  }
                  summary[cardId] = entry;
                }
              });
            });

            for (const [movieId, count] of Object.entries(summary)) {
              if (count.yes === activeUsers.length && activeUsers.length > 0) {
                attemptMatchForMovie(code, movieId);
                break;
              }
            }
          },
          (err) => {
            console.error('Vote snapshot failed', err);
            setError(`Could not load vote updates. ${err.message}`);
          },
        );
      } catch (err) {
        console.error('Vote subscription failed', err);
        const message = err instanceof Error ? err.message : String(err);
        setError(`Could not subscribe to vote updates. ${message}`);
      }
    };

    subscribeToVotes();
    return () => unsubscribe();
  }, [code, roomSettings]);

  useEffect(() => {
    if (!roomSettings) {
      return;
    }

    usedIdsRef.current.clear();
    cardCacheRef.current = {};
    tmdbPage.current = 1;
    setCards([]);
    loadMoreCards();
  }, [roomSettings?.contentTypes?.join(','), roomSettings?.contentType, roomSettings?.locale, roomSettings?.providers?.join(','), roomSettings?.genres?.join(',')] );

  useEffect(() => {
    if (!roomSettings || cards.length > 3 || loadingMore) {
      return;
    }
    loadMoreCards();
  }, [cards.length, roomSettings, loadingMore]);

  const topCard = cards[0];
  const fullDragOffset = isAnimatingSwipe && swipeAction
    ? { x: swipeAction === 'yes' ? 220 : -220, y: 0 }
    : dragOffset;

  const handleButtonVote = (vote: boolean) => {
    if (!topCard || isAnimatingSwipe) {
      return;
    }

    const action = vote ? 'yes' : 'no';
    setSwipeAction(action);
    setIsAnimatingSwipe(true);
    setFlashVote(action);

    window.setTimeout(async () => {
      await handleSwipe(vote);
      setSwipeAction(null);
      setIsAnimatingSwipe(false);
      window.setTimeout(() => setFlashVote(null), 200);
    }, 180);
  };

  const loadMoreCards = async () => {
    if (!roomSettings) {
      return;
    }

    setError('');
    setLoadingMore(true);
    let nextCards: MovieCard[] = [];
    try {
      const tmdbCards = await fetchTmdbCards(roomSettings, tmdbPage.current);
      tmdbPage.current += 1;
      nextCards = shuffleArray(tmdbCards).filter((card) => !usedIdsRef.current.has(card.id));
    } catch (err) {
      console.error('TMDB fetch failed', err);
      const message = err instanceof Error ? err.message : String(err);
      setError(`Could not load cards from TMDB. ${message}`);
    }

    if (!nextCards.length) {
      setLoadingMore(false);
      setCards((current) => {
        if (current.length === 0) {
          setError(
            'No titles match this criteria. Try broadening the filters or selecting fewer genres/providers.',
          );
        }
        return current;
      });
      return;
    }

    nextCards.forEach((card) => {
      usedIdsRef.current.add(card.id);
      cardCacheRef.current[card.id] = card;
    });
    setCards((current) => [...current, ...nextCards]);
    setLoadingMore(false);
  };

  const recordVote = async (cardId: string, vote: boolean) => {
    try {
      const user = await ensureAuth();
      const voteRef = doc(db, 'rooms', code, 'votes', user.uid);
      await setDoc(voteRef, { [cardId]: vote }, { merge: true });
    } catch (err) {
      console.error('Vote save failed', err);
      const message = err instanceof Error ? err.message : String(err);
      setError(`Could not save vote. ${message}`);
    }
  };

  const handleSwipe = async (vote: boolean) => {
    if (!topCard) {
      return;
    }

    await recordVote(topCard.id, vote);
    if (vote) {
      await attemptMatchForMovie(code, topCard.id);
    }

    setCards((current) => current.slice(1));
    setDragOffset({ x: 0, y: 0 });
    setIsDragging(false);
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    startPoint.current = { x: event.clientX, y: event.clientY };
    setIsDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!isDragging || !startPoint.current) {
      return;
    }
    setDragOffset({ x: event.clientX - startPoint.current.x, y: event.clientY - startPoint.current.y });
  };

  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (!isDragging) {
      return;
    }
    event.currentTarget.releasePointerCapture(event.pointerId);
    if (!isDragging) {
      return;
    }
    const threshold = 120;
    if (dragOffset.x > threshold) {
      setFlashVote('yes');
      window.setTimeout(() => setFlashVote(null), 240);
      handleSwipe(true);
    } else if (dragOffset.x < -threshold) {
      setFlashVote('no');
      window.setTimeout(() => setFlashVote(null), 240);
      handleSwipe(false);
    } else {
      setDragOffset({ x: 0, y: 0 });
    }
    setIsDragging(false);
    startPoint.current = null;
  };

  const isMatchedCelebration = roomSettings?.status === 'matched' && !!roomSettings?.matchedMovie;
  const canEditSettings = isHost && roomSettings?.status === 'active';

  const handleEditSettings = async () => {
    setError('');
    setReturningToSettings(true);
    try {
      await ensureAuth();
      await updateDoc(doc(db, 'rooms', code), { status: 'pending' });
      onEditSettings();
    } catch (err) {
      console.error('Return to settings failed', err);
      const message = err instanceof Error ? err.message : String(err);
      setError(`Could not open settings. ${message}`);
    } finally {
      setReturningToSettings(false);
    }
  };

  if (isMatchedCelebration && roomSettings?.matchedMovie) {
    return (
      <AppShell isHost={isHost} screen="swipe">
        <MatchOverlay movie={roomSettings.matchedMovie} />
      </AppShell>
    );
  }

  return (
    <AppShell isHost={isHost} screen="swipe">
      <div className="flex flex-col gap-8">
        <GlassPanel>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between text-left">
            <div>
              <p className="pickle-eyebrow">Pickle</p>
              <h1 className="pickle-title mt-2 text-3xl sm:text-4xl">Swipe the next pick</h1>
              <p className="pickle-subtitle mt-3 max-w-2xl text-sm sm:text-base">
                Swiping right means yes, left means no. Your choices are saved to the room vote history.
              </p>
            </div>
            <div className="flex w-full flex-col gap-3 sm:w-auto sm:min-w-[12rem]">
              {canEditSettings ? (
                <GlassButton compact disabled={returningToSettings} onClick={handleEditSettings}>
                  {returningToSettings ? 'Opening settings…' : 'Edit settings'}
                </GlassButton>
              ) : null}
              <ShareButton code={code} />
              <GlassButton compact onClick={onBack}>
                Leave room
              </GlassButton>
            </div>
          </div>
        </GlassPanel>

        <GlassPanel>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-left">
            <div>
              <p className="text-sm font-medium text-[var(--pickle-text-muted)]">Room code</p>
              <p className="pickle-title mt-1 text-xl">{code}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-[var(--pickle-text-muted)]">Room status</p>
              <p className="mt-1 font-medium">{roomSettings?.status || 'Loading'}{roomSettings?.activeUsers && `, ${roomSettings.activeUsers.length} ${roomSettings.activeUsers.length === 1 ? 'person' : 'people'}`}</p>
            </div>
          </div>
        </GlassPanel>

        {!roomSettings ? (
          <GlassPanel>
            <p className="pickle-subtitle text-center">Loading room settings…</p>
          </GlassPanel>
        ) : roomSettings.status !== 'active' && roomSettings.status !== 'matched' ? (
          <GlassPanel>
            <div className="text-center">
              <p className="pickle-title text-xl">Waiting for host to activate the room</p>
              <p className="pickle-subtitle mt-3 text-sm">
                Once the host starts pickling, the card stack will appear here.
              </p>
            </div>
          </GlassPanel>
        ) : (
          <>
            <GlassPanel className="!p-0">
              <div className="glass-panel__inner glass-swipe-stage !pt-14 !pb-16">
                <div className="absolute inset-x-0 top-4 mx-auto flex w-full max-w-3xl justify-between px-6 text-sm text-[var(--pickle-text-soft)]">
                  <span>Swipe left for no</span>
                  <span>Swipe right for yes</span>
                </div>

                <div className="absolute inset-x-0 bottom-4 mx-auto flex w-full max-w-3xl justify-end px-6">
                  <span className="glass-chip">{roomSettings?.locale || 'US'}</span>
                </div>

                <div className="absolute inset-x-0 top-12 bottom-12 mx-auto flex w-full max-w-3xl items-center justify-center px-4">
                  {!topCard ? (
                    <div className="glass-empty-state flex h-full w-full items-center justify-center rounded-[var(--glass-radius-md)] border border-dashed text-center px-6">
                      <div className="max-w-md space-y-3">
                        {error ? (
                          <div className="glass-alert text-left">{error}</div>
                        ) : loadingMore ? (
                          <>
                            <p className="pickle-title text-xl">Loading picks…</p>
                            <p className="pickle-subtitle text-sm">Finding titles that match your room filters.</p>
                          </>
                        ) : (
                          <>
                            <p className="pickle-title text-xl">No more cards right now.</p>
                            <p className="pickle-subtitle text-sm">
                              Generating more picks based on the room filters.
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="glass-movie-card-slot min-h-[24rem]">
                      <div
                        key={topCard.id}
                        className="glass-movie-card glass-movie-card--swipe cursor-grab"
                        style={{
                          transform: `translate(${fullDragOffset.x}px, ${fullDragOffset.y}px) rotate(${fullDragOffset.x * 0.06}deg)`,
                          touchAction: 'none',
                          transition: isAnimatingSwipe ? 'transform 0.24s ease-out' : undefined,
                        }}
                        onPointerDown={onPointerDown}
                        onPointerMove={onPointerMove}
                        onPointerUp={onPointerUp}
                      >
                        <div className="glass-movie-card__media">
                          <img src={topCard.image} alt={topCard.title} />
                        </div>
                        <div className="glass-movie-card__info absolute inset-x-0 bottom-0 z-[2] text-white">
                          <div className="glass-movie-card__header flex items-start justify-between gap-4">
                            <div className="min-w-0">
                              <p className="text-2xl font-medium tracking-tight">{topCard.title}</p>
                              <p className="mt-1 text-sm text-white/80">
                                {topCard.year} · {topCard.type}
                              </p>
                            </div>
                            {topCard.genres.length ? (
                              <span className="glass-chip glass-chip--selected shrink-0 !text-white/90">
                                {topCard.genres.join(' · ')}
                              </span>
                            ) : null}
                          </div>
                          {topCard.description ? (
                            <p className="glass-movie-card__description mt-3 text-sm leading-6 text-white/90">
                              {topCard.description}
                            </p>
                          ) : null}
                        </div>
                        <div className="glass-movie-card__vote-hints pointer-events-none absolute inset-0 z-[3] flex items-center justify-center">
                          <div className="flex gap-4">
                            <span
                              className={`glass-chip glass-chip--selected px-4 py-2 !text-sm !normal-case !tracking-normal ${
                                dragOffset.x > 80 ? 'opacity-100' : 'opacity-0'
                              } transition`}
                            >
                              Yes
                            </span>
                            <span
                              className={`glass-chip px-4 py-2 !text-sm !normal-case !tracking-normal ${
                                dragOffset.x < -80 ? 'opacity-100' : 'opacity-0'
                              } transition`}
                            >
                              No
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </GlassPanel>

            <div className="grid gap-4 sm:grid-cols-2">
              <GlassButton
                block
                active={flashVote === 'no'}
                onClick={() => handleButtonVote(false)}
              >
                No
              </GlassButton>
              <GlassButton
                block
                accent
                active={flashVote === 'yes'}
                onClick={() => handleButtonVote(true)}
              >
                Yes
              </GlassButton>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
