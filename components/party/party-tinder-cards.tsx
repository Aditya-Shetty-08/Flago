"use client";

import { useEffect, useState, useMemo, useRef } from 'react';
import { TinderCards } from '@/components/tinder-cards';
import { moviesToCardData } from '@/lib/elo_rating/movieToCardData';
import { subscribeToParty, unsubscribeFromParty } from '@/lib/party/realtime';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface PartyTinderCardsProps {
  partySlug: string;
  onComplete: () => void;
}

export function PartyTinderCards({ partySlug, onComplete }: PartyTinderCardsProps) {
  const [movies, setMovies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [swipedMovies, setSwipedMovies] = useState<Set<string>>(new Set());
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);
  const swipingInProgress = useRef<Set<string>>(new Set()); // Track swipes currently being processed
  
  // State for poster images and extra info (same as test-recommendations-page)
  const [titleToPoster, setTitleToPoster] = useState<Record<string, string | null>>({});
  const [titleToProduction, setTitleToProduction] = useState<Record<string, string>>({});
  const [titleToDirectors, setTitleToDirectors] = useState<Record<string, string[]>>({});
  const [titleToDescription, setTitleToDescription] = useState<Record<string, string>>({});
  const [titleToRating, setTitleToRating] = useState<Record<string, number | null>>({});

  // Fetch movies
  useEffect(() => {
    fetchMovies();
  }, [partySlug]);

  // Set up realtime for movie updates
  useEffect(() => {
    if (!movies.length) return;

    // Get party ID from first movie
    const partyId = movies[0]?.party_id;
    if (!partyId) return;

    const ch = subscribeToParty(partyId, {
      onMovieUpdate: (updatedMovie) => {
        setMovies((prev) =>
          prev.map((m) =>
            m.movie_id === updatedMovie.movie_id ? updatedMovie : m
          )
        );
      },
    });

    setChannel(ch);

    return () => {
      if (ch) {
        unsubscribeFromParty(ch);
      }
    };
  }, [movies]);

  const fetchMovies = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/party/${partySlug}/movies`);
      if (!response.ok) {
        throw new Error('Failed to fetch movies');
      }

      const { movies: moviesData } = await response.json();
      
      // Convert to Movie format for TinderCards
      const convertedMovies = moviesData.map((m: any) => ({
        id: m.movie_id,
        title: m.title,
        genres: m.genres,
        expected_score: Number(m.expected_score),
      }));

      setMovies(convertedMovies);

      // Enrich posters via our TMDB-backed endpoint using only names (same as test-recommendations-page)
      try {
        const names = convertedMovies.map((m: any) => m.title);
        const infoRes = await fetch('/api/movie-info', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ names }),
        });
        if (infoRes.ok) {
          const infoJson: { movies?: any[] } = await infoRes.json();
          const infos = infoJson.movies ?? [];
          // Helper to normalize titles for resilient matching
          const normalize = (s: string) =>
            s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
          const posterMap: Record<string, string | null> = {};
          const productionMap: Record<string, string> = {};
          const directorsMap: Record<string, string[]> = {};
          const descriptionMap: Record<string, string> = {};
          const ratingMap: Record<string, number | null> = {};
          const normalizedInfos = infos.map((mi) => ({
            norm: normalize(mi.title),
            data: mi,
          }));
          for (const m of convertedMovies) {
            const normTitle = normalize(m.title);
            const exact = normalizedInfos.find((x) => x.norm === normTitle)?.data;
            const partial = exact
              ? undefined
              : normalizedInfos.find((x) => x.norm.includes(normTitle) || normTitle.includes(x.norm))?.data;
            const chosen = exact ?? partial;
            posterMap[m.title] = chosen?.poster ?? null;
            productionMap[m.title] = (chosen?.production ?? [])[0] ?? '';
            directorsMap[m.title] = chosen?.directors ?? [];
            descriptionMap[m.title] = chosen?.description ?? '';
            ratingMap[m.title] = chosen?.rating ?? null;
          }
          setTitleToPoster(posterMap);
          setTitleToProduction(productionMap);
          setTitleToDirectors(directorsMap);
          setTitleToDescription(descriptionMap);
          setTitleToRating(ratingMap);
        } else {
          console.warn('Failed to fetch movie posters from /api/movie-info');
        }
      } catch (e) {
        console.warn('Poster enrichment failed', e);
      }

      // Get user's existing swipes
      const { getUserId } = await import('@/lib/party/session');
      const userId = await getUserId();
      
      const swipesRes = await fetch(`/api/party/${partySlug}/swipes?userId=${encodeURIComponent(userId)}`);
      if (swipesRes.ok) {
        const { swipes } = await swipesRes.json();
        setSwipedMovies(new Set(swipes.map((s: any) => s.movie_id)));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load movies');
    } finally {
      setLoading(false);
    }
  };

  const handleSwipe = async (cardId: string | undefined, direction: 'right' | 'left') => {
    if (!cardId) return;

    // Don't swipe if already swiped OR if currently being processed
    if (swipedMovies.has(cardId) || swipingInProgress.current.has(cardId)) {
      console.log('[SWIPE] Skipping - already swiped or in progress:', cardId);
      return;
    }

    // Mark as in progress to prevent duplicate calls
    swipingInProgress.current.add(cardId);

    // Optimistically update UI to prevent double swipes
    const newSwipedSet = new Set([...swipedMovies, cardId]);
    setSwipedMovies(newSwipedSet);

    try {
      const { getUserId } = await import('@/lib/party/session');
      const userId = await getUserId();
      
      const response = await fetch(`/api/party/${partySlug}/swipes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          movieId: cardId,
          direction,
          userId,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        // If swipe already exists, that's okay - just log it
        if (data.error && data.error.includes('already recorded')) {
          console.log('Swipe already recorded (this is fine)');
          // Check if all movies swiped (using the new set)
          if (newSwipedSet.size >= movies.length) {
            onComplete();
          }
          // Remove from in-progress set
          swipingInProgress.current.delete(cardId);
          return;
        }
        // Revert optimistic update on other errors
        setSwipedMovies(swipedMovies);
        // Remove from in-progress set
        swipingInProgress.current.delete(cardId);
        throw new Error(data.error || 'Failed to record swipe');
      }

      // Check if all movies swiped (using the new set)
      if (newSwipedSet.size >= movies.length) {
        onComplete();
      }

      // Remove from in-progress set after successful swipe
      swipingInProgress.current.delete(cardId);
    } catch (err) {
      console.error('Error recording swipe:', err);
      // Revert optimistic update on error
      setSwipedMovies((prev) => {
        const next = new Set(prev);
        next.delete(cardId);
        return next;
      });
      // Remove from in-progress set
      swipingInProgress.current.delete(cardId);
    }
  };

  // Convert movies to CardData format, supplying poster and details from TMDB info (same as test-recommendations-page)
  const cardsData = useMemo(() => {
    if (movies.length === 0) return [];
    
    // Filter out already swiped movies
    const unswipedMovies = movies.filter(m => !swipedMovies.has(m.id));
    
    return moviesToCardData(
      unswipedMovies,
      (movie) => {
        const poster = titleToPoster[movie.title];
        return poster ?? `https://via.placeholder.com/300x400?text=${encodeURIComponent(movie.title)}`;
      },
      (movie) => ({
        production: titleToProduction[movie.title],
        directors: titleToDirectors[movie.title],
        description: titleToDescription[movie.title],
        rating: titleToRating[movie.title],
      })
    );
  }, [movies, swipedMovies, titleToPoster, titleToProduction, titleToDirectors, titleToDescription, titleToRating]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-12 text-center">
          <div className="inline-block w-12 h-12 border-4 border-white/30 border-t-sky-400 rounded-full animate-spin mb-4"></div>
          <p className="text-white text-lg font-medium">Loading movies...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="bg-red-500/10 backdrop-blur-md border border-red-500/30 rounded-2xl p-12 text-center max-w-md">
          <div className="text-red-400 text-4xl mb-4">⚠️</div>
          <p className="text-red-300 text-lg font-medium">{error}</p>
        </div>
      </div>
    );
  }

  if (movies.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-12 text-center max-w-md">
          <div className="text-white/70 text-4xl mb-4">🎬</div>
          <p className="text-white text-lg font-medium">
            No movies available. The host needs to generate movies first.
          </p>
        </div>
      </div>
    );
  }

  const remainingCount = movies.length - swipedMovies.size;
  const progressPercentage = ((movies.length - remainingCount) / movies.length) * 100;

  return (
    <div className="space-y-6">
      {/* Enhanced Header Card */}
      <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-white mb-2">
              Swipe through movies
            </h2>
            <div className="flex items-center gap-3">
              <div className="flex-1 bg-white/10 rounded-full h-3 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-sky-400 to-blue-500 transition-all duration-500 ease-out rounded-full"
                  style={{ width: `${progressPercentage}%` }}
                ></div>
              </div>
              <div className="text-white/90 font-semibold text-lg min-w-[80px] text-right">
                {remainingCount} left
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-sky-400/20 rounded-lg border border-sky-400/30">
            <div className="w-2 h-2 bg-sky-400 rounded-full animate-pulse"></div>
            <span className="text-sky-300 text-sm font-medium">
              {Math.round(progressPercentage)}% complete
            </span>
          </div>
        </div>
      </div>

      {/* Swipe Instructions */}
      {remainingCount > 0 && remainingCount === movies.length && (
        <div className="bg-gradient-to-r from-sky-500/20 to-blue-500/20 backdrop-blur-md border border-sky-400/30 rounded-xl p-4">
          <div className="flex items-center gap-3 text-white/90">
            <div className="text-2xl">👆</div>
            <div className="flex-1">
              <p className="font-medium">Swipe right to like, left to pass</p>
              <p className="text-sm text-white/70 mt-1">Or use the buttons below</p>
            </div>
          </div>
        </div>
      )}

      {/* Tinder Cards */}
      {remainingCount > 0 ? (
        <div className="relative">
          <TinderCards
            cardsData={cardsData}
            onSwipe={handleSwipe}
          />
        </div>
      ) : (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="bg-gradient-to-br from-sky-500/20 to-purple-500/20 backdrop-blur-md border border-white/20 rounded-2xl p-12 text-center max-w-md shadow-xl">
            <div className="text-6xl mb-4 animate-bounce">🎉</div>
            <p className="text-white text-2xl font-bold mb-2">All done!</p>
            <p className="text-white/80 text-lg">
              Waiting for other members to finish swiping...
            </p>
            <div className="mt-6 flex items-center justify-center gap-2">
              <div className="w-2 h-2 bg-sky-400 rounded-full animate-pulse"></div>
              <div className="w-2 h-2 bg-sky-400 rounded-full animate-pulse [animation-delay:0.2s]"></div>
              <div className="w-2 h-2 bg-sky-400 rounded-full animate-pulse [animation-delay:0.4s]"></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

