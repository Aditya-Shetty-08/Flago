"use client";

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';

interface MovieWithPoster {
  id: string;
  title: string;
  genres: string[];
  elo_rating?: number;
  expected_score?: number;
  poster?: string | null;
  rank: number;
}

export default function FinalPage() {
  const [topMovies, setTopMovies] = useState<MovieWithPoster[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const searchParams = useSearchParams();

  useEffect(() => {
    fetchTopMovies();
  }, []);

  const fetchTopMovies = async () => {
    try {
      setLoading(true);
      setError(null);

      // Try to get data from URL params first
      const dataParam = searchParams.get('data');
      let movies: MovieWithPoster[] = [];

      if (dataParam) {
        try {
          const decodedData = decodeURIComponent(dataParam);
          const parsedData = JSON.parse(decodedData);
          movies = parsedData.movies || parsedData.rankings || [];
        } catch (parseError) {
          console.error("Error parsing data from URL:", parseError);
        }
      }

      // If no data in URL, try fetching from a results API
      if (movies.length === 0) {
        // You can add an API endpoint here if needed
        // const response = await fetch('/api/results');
        // const data = await response.json();
        // movies = data.rankings || [];
      }

      // Get top 3 movies sorted by rating (elo_rating or expected_score)
      const top3 = movies
        .slice(0, 10) // Get more to ensure we have enough
        .sort((a: any, b: any) => {
          const ratingA = a.elo_rating ?? a.expected_score ?? 0;
          const ratingB = b.elo_rating ?? b.expected_score ?? 0;
          return ratingB - ratingA;
        })
        .slice(0, 3)
        .map((movie: any, index: number) => ({
          ...movie,
          rank: index + 1,
        }));

      // Fetch poster images for top 3 movies
      if (top3.length > 0) {
        const movieNames = top3.map((m: any) => m.title);
        try {
          const posterResponse = await fetch('/api/movie-info', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ names: movieNames }),
          });

          if (posterResponse.ok) {
            const { movies: movieInfos } = await posterResponse.json();
            const posterMap: Record<string, string | null> = {};

            // Normalize titles for matching
            const normalize = (s: string) =>
              s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

            const normalizedInfos = (movieInfos || []).map((mi: any) => ({
              norm: normalize(mi.title),
              data: mi,
            }));

            for (const movie of top3) {
              const normTitle = normalize(movie.title);
              const exact = normalizedInfos.find((x: any) => x.norm === normTitle)?.data;
              const partial = exact
                ? undefined
                : normalizedInfos.find((x: any) =>
                    x.norm.includes(normTitle) || normTitle.includes(x.norm)
                  )?.data;
              const chosen = exact ?? partial;
              posterMap[movie.title] = chosen?.poster ?? null;
            }

            // Merge poster data into top 3
            const top3WithPosters = top3.map((movie: any) => ({
              ...movie,
              poster: posterMap[movie.title] || null,
            }));

            setTopMovies(top3WithPosters);
          } else {
            setTopMovies(top3.map((m: any) => ({ ...m, poster: null })));
          }
        } catch (posterError) {
          console.warn('Failed to fetch movie posters:', posterError);
          setTopMovies(top3.map((m: any) => ({ ...m, poster: null })));
        }
      } else {
        setTopMovies([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load results');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white text-xl">Loading results...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white text-xl text-red-400">Error: {error}</div>
      </div>
    );
  }

  if (topMovies.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white text-xl">No results available</div>
      </div>
    );
  }

  // Podium positions: 2nd (left), 1st (center), 3rd (right)
  const podiumOrder = [
    topMovies.find((m) => m.rank === 2), // 2nd place (left)
    topMovies.find((m) => m.rank === 1), // 1st place (center)
    topMovies.find((m) => m.rank === 3), // 3rd place (right)
  ].filter(Boolean) as MovieWithPoster[];

  const getPodiumHeight = (rank: number) => {
    switch (rank) {
      case 1:
        return 'h-64'; // Tallest for 1st place
      case 2:
        return 'h-48'; // Medium for 2nd place
      case 3:
        return 'h-32'; // Shortest for 3rd place
      default:
        return 'h-32';
    }
  };

  const getMedalColor = (rank: number) => {
    switch (rank) {
      case 1:
        return 'bg-gradient-to-br from-yellow-400 to-yellow-600'; // Gold
      case 2:
        return 'bg-gradient-to-br from-gray-300 to-gray-500'; // Silver
      case 3:
        return 'bg-gradient-to-br from-amber-600 to-amber-800'; // Bronze
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div className="min-h-screen relative">
      <div className="container mx-auto px-6 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-5xl lg:text-6xl font-bold text-white mb-4">
            Top 3 Movies
          </h1>
          <p className="text-lg text-white/90">
            Your personalized recommendations
          </p>
        </div>

        {/* Podium Display */}
        <div className="flex items-end justify-center gap-4 lg:gap-8 max-w-6xl mx-auto">
          {podiumOrder.map((movie, index) => {
            const isFirst = movie.rank === 1;
            const podiumHeight = getPodiumHeight(movie.rank);
            const medalColor = getMedalColor(movie.rank);

            return (
              <div
                key={movie.id}
                className={`flex flex-col items-center ${
                  isFirst ? 'order-2' : index === 0 ? 'order-1' : 'order-3'
                }`}
              >
                {/* Movie Card */}
                <div
                  className={`
                  relative
                  ${isFirst ? 'w-48 lg:w-64' : 'w-40 lg:w-52'}
                  ${isFirst ? 'mb-4' : 'mb-2'}
                  bg-white/10 backdrop-blur-md
                  rounded-2xl
                  border border-white/20
                  overflow-hidden
                  shadow-2xl
                  transition-transform duration-300
                  hover:scale-105
                `}
                >
                  {/* Medal Badge */}
                  <div
                    className={`
                    absolute top-2 right-2
                    ${medalColor}
                    w-10 h-10
                    rounded-full
                    flex items-center justify-center
                    text-white font-bold text-lg
                    z-10
                    shadow-lg
                  `}
                  >
                    {movie.rank}
                  </div>

                  {/* Poster or Placeholder */}
                  {movie.poster ? (
                    <div className="relative w-full aspect-[2/3]">
                      <Image
                        src={movie.poster}
                        alt={movie.title}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    </div>
                  ) : (
                    <div className="w-full aspect-[2/3] bg-gradient-to-br from-sky-400/20 to-purple-400/20 flex items-center justify-center">
                      <div className="text-white/50 text-center px-4">
                        <div className="text-4xl mb-2">🎬</div>
                        <div className="text-sm font-medium">{movie.title}</div>
                      </div>
                    </div>
                  )}

                  {/* Movie Info */}
                  <div className="p-4">
                    <h3 className="text-white font-bold text-lg mb-1 line-clamp-2">
                      {movie.title}
                    </h3>
                    <div className="flex flex-wrap gap-1 mb-2">
                      {movie.genres.slice(0, 2).map((genre, idx) => (
                        <span
                          key={idx}
                          className="text-xs px-2 py-1 bg-white/10 rounded text-white/80"
                        >
                          {genre}
                        </span>
                      ))}
                    </div>
                    <div className="text-sky-300 text-sm font-semibold">
                      {movie.elo_rating
                        ? `Rating: ${Math.round(movie.elo_rating)}`
                        : movie.expected_score
                        ? `Score: ${(movie.expected_score * 100).toFixed(0)}%`
                        : ''}
                    </div>
                  </div>
                </div>

                {/* Podium Base */}
                <div
                  className={`
                  ${podiumHeight}
                  w-full
                  ${isFirst ? 'max-w-48 lg:max-w-64' : 'max-w-40 lg:max-w-52'}
                  bg-gradient-to-t from-white/20 to-white/10
                  backdrop-blur-md
                  border-t border-white/30
                  rounded-t-2xl
                  flex items-center justify-center
                  shadow-lg
                `}
                >
                  <div className="text-white font-bold text-2xl lg:text-3xl">
                    #{movie.rank}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

