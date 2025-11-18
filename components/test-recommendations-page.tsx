"use client";

import { TinderCards } from '@/components/tinder-cards'
import React, { useMemo, useState, useEffect, Suspense } from 'react'
import { EloRatingSystem, Stack, Movie } from '@/lib/elo_rating/movie_rating'
import { moviesToCardData } from '@/lib/elo_rating/movieToCardData'
import { useSearchParams } from 'next/navigation'
import { userInputSchema } from '@/components/formcomp'
import { z } from 'zod'
import type { MovieBasicInfo } from '@/lib/getMovieInfo'

interface ApiMovieResponse {
  title: string;
  genre: string[];
  expectedScore: number;
}

const TestPageContent = () => {
  // Initialize ELO rating system
  const [ratingSystem] = useState(() => new EloRatingSystem());
  const [movieStack] = useState(() => new Stack<Movie>());
  const [movies, setMovies] = useState<Movie[]>([]);
  const [titleToPoster, setTitleToPoster] = useState<Record<string, string | null>>({});
  const [titleToProduction, setTitleToProduction] = useState<Record<string, string>>({});
  const [titleToDirectors, setTitleToDirectors] = useState<Record<string, string[]>>({});
  const [titleToDescription, setTitleToDescription] = useState<Record<string, string>>({});
  const [titleToRating, setTitleToRating] = useState<Record<string, number | null>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const searchParams = useSearchParams();

  // Fetch movies using API route
  useEffect(() => {
    const fetchMovies = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Get form data from URL query params
        const dataParam = searchParams.get('data');
        let formData: z.infer<typeof userInputSchema>;
        
        if (dataParam) {
          try {
            // Decode and parse the form data from URL
            const decodedData = decodeURIComponent(dataParam);
            const parsedData = JSON.parse(decodedData);
            formData = userInputSchema.parse(parsedData);
          } catch (parseError) {
            console.error("Error parsing form data from URL:", parseError);
            setError("Invalid form data. Please go back and submit the form again.");
            setLoading(false);
            return;
          }
        } else {
          // Fallback to dummy data if no form data is provided
          formData = {
            preferences: {
              preferredGenres: ["drama", "romance"],
              preferredEra: ["2000s"],
            },
            spotifyUrls: [],
          };
        }
        
        // Use the form data (either from URL or fallback)
        const response = await fetch('/api/movies', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formData),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch movies');
        }

        const data = await response.json();
        const movieRecommendations = data.movies;

        // Convert the returned format to Movie format
        // API returns: { title, genre, expectedScore }
        // Movie expects: { id, title, genres, expected_score }
        const convertedMovies: Movie[] = movieRecommendations.map((movie: ApiMovieResponse, index: number) => ({
          id: `m${index + 1}`,
          title: movie.title,
          genres: movie.genre,
          expected_score: movie.expectedScore,
        }));

        setMovies(convertedMovies);

        // Enrich posters via our TMDB-backed endpoint using only names
        try {
          const names = convertedMovies.map((m) => m.title);
          const infoRes = await fetch('/api/movie-info', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ names }),
          });
          if (infoRes.ok) {
            const infoJson: { movies?: MovieBasicInfo[] } = await infoRes.json();
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
      } catch (err) {
        console.error("Error fetching movies:", err);
        setError(err instanceof Error ? err.message : "Failed to fetch movies");
      } finally {
        setLoading(false);
      }
    };

    fetchMovies();
  }, [searchParams]);

  // Load movies into ELO system and stack
  useEffect(() => {
    if (movies.length === 0) return;

    ratingSystem.loadMovies(movies);
    
    // Load movies onto the stack in REVERSE order (so first movie is on top)
    for (let i = movies.length - 1; i >= 0; i--) {
      movieStack.push(movies[i]);
    }
  }, [ratingSystem, movieStack, movies]);

  // Convert movies to CardData format, supplying poster and details from TMDB info
  const cardsData = useMemo(() => {
    if (movies.length === 0) return [];
    return moviesToCardData(
      movies,
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
  }, [movies, titleToPoster, titleToProduction, titleToDirectors, titleToDescription, titleToRating]);

  // Handle swipe callback
  const handleSwipe = React.useCallback((cardId: string | undefined, direction: 'right' | 'left') => {
    if (!cardId) {
      console.warn('Card swiped but no ID provided');
      return;
    }
    
    // Update ELO rating system
    ratingSystem.handleSwipe(cardId, direction);
    
    // You can also get updated rankings if needed
    // const rankings = ratingSystem.getRankings();
    // console.log('Current rankings:', rankings);
  }, [ratingSystem]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-lg text-gray-600">Loading movie recommendations...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-lg text-red-600">Error: {error}</p>
        </div>
      </div>
    );
  }

  if (movies.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-lg text-gray-600">No movies found</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <TinderCards 
        cardsData={cardsData} 
        onSwipe={handleSwipe}
        getRankings={() => ratingSystem.getRankings()}
      />
    </div>
  )
}

const TestRecommendationsPage = () => {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-lg text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <TestPageContent />
    </Suspense>
  )
}

export default TestRecommendationsPage

