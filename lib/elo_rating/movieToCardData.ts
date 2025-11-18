import { Movie } from './movie_rating';
import { CardData } from '@/components/tinder-cards';

/**
 * Converts a Movie object to CardData format for use with TinderCards component.
 * 
 * @param movie - The Movie object to convert
 * @param index - The index/number of the card (optional, defaults to 0)
 * @param getImageUrl - Optional function to get image URL for a movie. 
 *                      If not provided, uses a placeholder.
 * @returns CardData object ready for TinderCards
 */
export function movieToCardData(
  movie: Movie,
  index: number = 0,
  getImageUrl?: (movie: Movie) => string,
  getExtraInfo?: (movie: Movie) => {
    production?: string;
    directors?: string[];
    description?: string;
    rating?: number | null;
  }
): CardData {
  const extra = getExtraInfo ? getExtraInfo(movie) : {};
  return {
    id: movie.id,
    number: index + 1,
    category: movie.genres.join(', '),
    question: movie.title,
    imageUrl: getImageUrl ? getImageUrl(movie) : `https://via.placeholder.com/300x400?text=${encodeURIComponent(movie.title)}`,
    production: extra.production,
    directors: extra.directors,
    description: extra.description,
    rating: extra.rating,
  };
}

/**
 * Converts an array of Movie objects to CardData array.
 * 
 * @param movies - Array of Movie objects
 * @param getImageUrl - Optional function to get image URL for a movie
 * @returns Array of CardData objects
 */
export function moviesToCardData(
  movies: Movie[],
  getImageUrl?: (movie: Movie) => string,
  getExtraInfo?: (movie: Movie) => {
    production?: string;
    directors?: string[];
    description?: string;
    rating?: number | null;
  }
): CardData[] {
  return movies.map((movie, index) => movieToCardData(movie, index, getImageUrl, getExtraInfo));
}

