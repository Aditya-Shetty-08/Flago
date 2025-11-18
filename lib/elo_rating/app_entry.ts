import { 
    Movie, 
    Stack, 
    EloRatingSystem, 
    MovieRating 
} from './movie_rating'; // This is the crucial line!

console.log("--- Movie Match ELO System Simulation (Main App) ---");

// Mock data: 
// The AI has now added an 'expected_score' to each movie.
const aiMovieSuggestions: Movie[] = [
    { id: "m1", title: "Dune: Part Two", genres: ["Sci-Fi", "Action"], expected_score: 0.85 }, // AI expects user to like this
    { id: "m2", title: "The Godfather", genres: ["Drama", "Crime"], expected_score: 0.60 }, // AI is neutral
    { id: "m3", title: "Oppenheimer", genres: ["Biography", "Drama", "History"], expected_score: 0.75 }, // AI expects user to like this
    { id: "m4", title: "Little Miss Sunshine", genres: ["Comedy", "Drama"], expected_score: 0.30 }, // AI thinks user will dislike this
];

// --- SETUP ---
const ratingSystem = new EloRatingSystem();
ratingSystem.loadMovies(aiMovieSuggestions);

const movieStack = new Stack<Movie>();

// Load movies onto the stack in REVERSE order
// Stack will be (bottom-to-top): [m4, m3, m2, m1]
for (let i = aiMovieSuggestions.length - 1; i >= 0; i--) {
  movieStack.push(aiMovieSuggestions[i]);
}

console.log(`\nMovie stack initialized with ${movieStack.size()} movies.`);

// --- SWIPE SESSION (FIXED) ---
console.log("\n--- Starting Swipe Session ---");

// We'll pop from the stack until it's empty
let currentMovie = movieStack.pop();

while (currentMovie) {
    // In a real app, you'd *await* a user's swipe here.
    // For the simulation, we'll assign swipes manually.
    
    let swipe: 'right' | 'left' = 'left'; // default swipe
    
    // Manually assign swipes for this test run
    if (currentMovie.id === 'm1') swipe = 'right'; // Popped 1st (Dune)
    if (currentMovie.id === 'm2') swipe = 'left';  // Popped 2nd (Godfather)
    if (currentMovie.id === 'm3') swipe = 'right'; // Popped 3rd (Oppenheimer)
    if (currentMovie.id === 'm4') swipe = 'right'; // Popped 4th (Little Miss Sunshine)

    // Handle the swipe in the ELO system
    ratingSystem.handleSwipe(currentMovie.id, swipe);

    // Get the next movie from the stack
    currentMovie = movieStack.pop();
}

// --- RESULTS ---
console.log("\n--- Swipe Session Over (Rankings) ---");
const finalRankings = ratingSystem.getRankings();

console.log("Movie ELO Rankings (Highest to Lowest):");
// RUNNING THIS WILL SHOW:
// 1. Little Miss Sunshine (+22.40 boost, a "surprise" like)
// 2. Oppenheimer (+8.00 boost)
// 3. Dune (+4.80 boost, was already expected)
// 4. The Godfather (-19.20, was disliked)
finalRankings.forEach((r, i) => {
  console.log(`#${i + 1}: ${r.movie.title} (ELO: ${r.elo.toFixed(0)})`);
});

console.log("\nYour Top 3 Recommended Matches:");
const top3 = finalRankings.slice(0, 3);
top3.forEach((r, i) => {
  console.log(`#${i + 1}: ${r.movie.title} (ELO: ${r.elo.toFixed(0)})`);
});