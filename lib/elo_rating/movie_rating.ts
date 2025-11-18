// --- 1. Data Types and Stack Definition ---

/**
 * Defines the structure for a movie object retrieved from the initial AI selection.
 * NOW INCLUDES the AI-generated expected_score.
 */
export type Movie = {
  id: string;
  title: string;
  genres: string[];
  expected_score: number; // AI's prediction (0.0 to 1.0) of user liking it
};

/**
 * Interface for the basic stack operations.
 */
export interface IStack<T> {
  push(item: T): void;
  pop(): T | undefined;
  size(): number;
}

/**
 * Stack class used to hold movies and pop them one by one for the swiping interface.
 */
export class Stack<T> implements IStack<T> {
  private storage: T[] = [];
  
  constructor(private capacity: number = Infinity) {} 

  public push(item: T): void {
    if (this.size() === this.capacity) {
      throw new Error("Stack has reached max capacity, you cannot add more items");
    }
    this.storage.push(item);
  }

  public pop(): T | undefined {
    return this.storage.pop();
  }

  public peek(): T | undefined {
    return this.storage[this.size() - 1];
  }

  public size(): number {
    return this.storage.length;
  }
}

// --- 2. MovieRating Class ---

/**
 * Wraps the Movie object and holds its current ELO score.
 */
export class MovieRating {
  public movie: Movie;
  public elo: number;

  constructor(movie: Movie, baseElo: number = 1200) {
    this.movie = movie;
    this.elo = baseElo;
  }
}

// --- 3. EloRatingSystem Class (Core Logic) ---

/**
 * Manages the ELO calculation logic for all movies.
 */
export class EloRatingSystem {
  
  // Class-level constants
  private static K_FACTOR: number = 32;
  // USER_BASE_ELO is no longer needed for the calculation, but
  // we could still keep it if we wanted to.
  // private static USER_BASE_ELO: number = 1200.0;

  // Map to store MovieRating objects: Key=movie ID, Value=MovieRating object
  public movieRatings: Map<string, MovieRating>;

  constructor() {
    this.movieRatings = new Map<string, MovieRating>();
  }

  public loadMovies(movies: Movie[]): void {
    movies.forEach(movie => {
      const movieRating = new MovieRating(movie);
      this.movieRatings.set(movie.id, movieRating);
    });
    console.log(`Loaded ${movies.length} movies into ELO system.`);
  }

  public handleSwipe(movieId: string, swipeDirection: 'right' | 'left'): void {
    const movieRating = this.movieRatings.get(movieId);

    if (!movieRating) {
      console.error(`Error: Movie with ${movieId} does not exist in the ELO system.`);
      return;
    }

    // 1. Determine Actual Score (1.0 for right, 0.0 for left)
    const actualScore = (swipeDirection === 'right') ? 1.0 : 0.0;

    // 2. Get Player ELOs and AI-provided expected score
    const movieElo = movieRating.elo; // Still needed for the console log
    
    // --- THIS IS THE NEW LOGIC ---
    // 3. Get the AI-provided Expected Score
    // This score is the probability (0.0 to 1.0) the AI thinks the user
    // will like this movie *before* the swipe.
    const expectedScore = movieRating.movie.expected_score;
    // --- END OF NEW LOGIC ---

    // 4. Calculate ELO Change (This formula is now even more powerful)
    const eloChange = EloRatingSystem.K_FACTOR * (actualScore - expectedScore);

    // 5. Update Movie ELO
    movieRating.elo += eloChange;

    console.log(`Swiped ${swipeDirection} on "${movieRating.movie.title}"`);
    console.log(`   - AI Expected: ${expectedScore.toFixed(2)}, Actual: ${actualScore}`);
    console.log(`   - Movie ELO: ${movieElo.toFixed(0)} -> ${movieRating.elo.toFixed(0)} (Change: ${eloChange.toFixed(2)})`);
  }

  public getRankings(): MovieRating[] {
    // Convert Map values to an Array
    const ratingsArray = Array.from(this.movieRatings.values());
    // Sort descending by ELO
    ratingsArray.sort((a, b) => b.elo - a.elo); 
    return ratingsArray;
  }
}