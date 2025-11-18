"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Lottie from 'lottie-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface PartyResultsProps {
  partySlug: string;
}

interface MovieWithPoster {
  id: string;
  title: string;
  genres: string[];
  elo_rating: number;
  right_swipes: number;
  left_swipes: number;
  poster?: string | null;
}

export function PartyResults({ partySlug }: PartyResultsProps) {
  const [rankings, setRankings] = useState<MovieWithPoster[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confettiData, setConfettiData] = useState<any>(null);

  useEffect(() => {
    fetchResults();
  }, [partySlug]);

  // Load confetti animation
  useEffect(() => {
    fetch('/confetti.json')
      .then((res) => res.json())
      .then((data) => setConfettiData(data))
      .catch((err) => console.error('Error loading confetti animation:', err));
  }, []);

  const fetchResults = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/party/${partySlug}/results`);
      if (!response.ok) {
        throw new Error('Failed to fetch results');
      }

      const { rankings: rankingsData } = await response.json();
      
      // Limit to top 5
      const top5 = rankingsData.slice(0, 5);
      
      // Fetch poster images for top 5 movies
      const movieNames = top5.map((m: any) => m.title);
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
          
          for (const movie of top5) {
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
          
          // Merge poster data into rankings
          const rankingsWithPosters = top5.map((movie: any) => ({
            ...movie,
            poster: posterMap[movie.title] || null,
          }));
          
          setRankings(rankingsWithPosters);
        } else {
          // If poster fetch fails, just use rankings without posters
          setRankings(top5.map((m: any) => ({ ...m, poster: null })));
        }
      } catch (posterError) {
        console.warn('Failed to fetch movie posters:', posterError);
        setRankings(top5.map((m: any) => ({ ...m, poster: null })));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load results');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p>Loading results...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-red-600">
          <p>{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="relative">
      {/* Confetti Animation Overlay */}
      {confettiData && !loading && !error && rankings.length > 0 && (
        <div className="fixed inset-0 pointer-events-none z-50">
          <Lottie
            animationData={confettiData}
            loop={false}
            autoplay={true}
            className="w-full h-full"
          />
        </div>
      )}
      
      <Card>
        <CardHeader>
          <CardTitle className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold">We think you should watch...</CardTitle>
        </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {rankings.map((movie, index) => {
            // First movie: vertical on mobile, horizontal on larger screens
            if (index === 0) {
              return (
                <div
                  key={movie.id}
                  className="relative w-full min-h-64 sm:min-h-48 h-auto rounded-lg shadow-lg"
                  style={{
                    backgroundImage: movie.poster
                      ? `linear-gradient(to bottom, rgba(0, 0, 0, 0.85) 0%, rgba(0, 0, 0, 0.7) 50%, rgba(0, 0, 0, 0.85) 100%), url(${movie.poster})`
                      : 'linear-gradient(to bottom, rgba(0, 0, 0, 0.85), rgba(0, 0, 0, 0.7))',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat',
                  }}
                >
                  <div className="absolute inset-0 flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 sm:p-4 md:p-6 text-white gap-4">
                    <div className="flex items-start gap-3 sm:gap-4 md:gap-6 flex-1 min-w-0 w-full sm:w-auto">
                      <div className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-white/90 flex-shrink-0">
                        #1
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-base sm:text-lg md:text-xl lg:text-2xl xl:text-3xl mb-2 line-clamp-2 break-words">
                          {movie.title}
                        </h3>
                        <div className="flex gap-1 sm:gap-2 flex-wrap mb-3 sm:mb-0">
                          {movie.genres.map((genre: string) => (
                            <Badge
                              key={genre}
                              variant="outline"
                              className="text-[10px] sm:text-xs bg-white/20 text-white border-white/30"
                            >
                              {genre}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="text-left sm:text-right ml-0 sm:ml-4 md:ml-6 flex-shrink-0 w-full sm:w-auto flex sm:block items-center sm:items-end justify-between sm:justify-end gap-4 sm:gap-0">
                      <div className="flex flex-col">
                        <div className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-white">
                          {Math.round(movie.elo_rating)}
                        </div>
                        <div className="text-[10px] sm:text-xs md:text-sm text-white/80">ELO Rating</div>
                      </div>
                      <div className="text-[10px] sm:text-xs text-white/70">
                        {movie.right_swipes} likes, {movie.left_swipes} passes
                      </div>
                    </div>
                  </div>
                </div>
              );
            }
            
            // Remaining movies: normal formatting
            return (
              <div
                key={movie.id}
                className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 sm:p-4 rounded-lg gap-3 sm:gap-4"
              >
                <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                  <div className="text-lg sm:text-xl md:text-2xl font-bold text-gray-400 w-6 sm:w-8 flex-shrink-0">
                    #{index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm sm:text-base md:text-lg line-clamp-2 break-words">
                      {movie.title}
                    </h3>
                    <div className="flex gap-1 sm:gap-2 mt-1 flex-wrap">
                      {movie.genres.map((genre: string) => (
                        <Badge key={genre} variant="outline" className="text-[10px] sm:text-xs">
                          {genre}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="text-left sm:text-right flex-shrink-0">
                  <div className="text-lg sm:text-xl md:text-2xl font-bold">
                    {Math.round(movie.elo_rating)}
                  </div>
                  <div className="text-[10px] sm:text-xs md:text-sm text-gray-600">ELO Rating</div>
                  <div className="text-[10px] sm:text-xs text-gray-500 mt-0.5 sm:mt-1">
                    {movie.right_swipes} likes, {movie.left_swipes} passes
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Back to Home Button */}
        <div className="mt-8 pt-6 border-t border-white/20">
          <Link
            href="/"
            className="
              inline-flex items-center justify-center gap-2
              w-full sm:w-auto
              px-8 py-4 text-lg font-semibold
              bg-sky-400 hover:bg-sky-500
              text-white rounded-lg
              shadow-lg shadow-sky-400/30
              transition-all transform hover:scale-105
              focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-2
              cursor-pointer
            "
          >
            Back to Home
            <svg 
              className="w-5 h-5" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" 
              />
            </svg>
          </Link>
        </div>
      </CardContent>
    </Card>
    </div>
  );
}

