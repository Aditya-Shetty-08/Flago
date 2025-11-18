import { ChatPerplexity } from "@langchain/community/chat_models/perplexity";
import { PromptTemplate } from "@langchain/core/prompts";
import { StructuredOutputParser } from "@langchain/core/output_parsers";
import { z } from "zod";

interface SongDetails {
  name: string;
  artist: string;
  genre: string;
}

// Flexible preferences schema - allows any key-value pairs where values are string arrays
// This makes it easy to add new preference types without changing the schema
// All fields are optional - if empty, the model will return random movies
export const userInputSchema = z.object({
  preferences: z.record(z.string(), z.array(z.string())).optional().default({}).describe("An optional flexible object with preference keys and string array values (e.g., { preferredGenres: ['drama'], preferredEra: ['2000s'] }). If empty or not provided, return random movies."),
  spotifyUrls: z.array(z.string().url()).optional().describe("An optional array of Spotify track URLs (requires special processing)"),
});

const movieRecommendationsSchema = z.object({
  movies: z.array(z.object({
    title: z.string().min(1, "Movie title is required"),
    genre: z.array(z.string()).min(1, "At least one genre is required").describe("An array of movie genres"),
    expectedScore: z.number().min(0).max(1).describe("The probability (0-1) that the user will like this movie based on their preferences"),
  })).length(10, "Exactly 10 movies are required").describe("An array of exactly 10 recommended movies with title, genre, and expectedScore"),
});

const parser = StructuredOutputParser.fromZodSchema(movieRecommendationsSchema);

// Function to get song details from Spotify URL
async function getSongDetailsFromSpotify(spotifyUrl: string): Promise<SongDetails | null> {
  try {
    const baseUrl = 'http://localhost:3000';
    const apiUrl = `${baseUrl}/api/spotify`;
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url: spotifyUrl }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      console.error('Error fetching song details:', error);
      return null;
    }

    const songInfo = await response.json();
    return songInfo;
  } catch (error) {
    console.error('Error in getSongDetailsFromSpotify:', error);
    return null;
  }
}

// Function to convert Spotify URLs to song details
async function getSongsFromUrls(spotifyUrls: string[]): Promise<SongDetails[]> {
  const songs: SongDetails[] = [];
  
  for (const url of spotifyUrls) {
    const songDetails = await getSongDetailsFromSpotify(url);
    if (songDetails) {
      songs.push(songDetails);
    }
  }
  
  return songs;
}

const promptTemplate = PromptTemplate.fromTemplate(`
You are an expert at creating movie recommendations based on a user's preferences. Your task is to recommend exactly 10 movies that match the user's taste.

USER PREFERENCES:
{preferencesSection}
{songsSection}

REQUIREMENTS:
1. Return exactly 10 movies - no more, no less. If you cannot find 10 suitable movies, still return 10 by including movies that are tangentially related or have thematic connections.

2. Movie Selection Criteria:
   {selectionCriteria}

3. Genre Assignment:
   - Each movie must have at least one genre
   - If user preferences include genres, prioritize movies that match or are closely related to those preferred genres
   - If no preferences are provided, assign genres that accurately describe each movie
   - Use standard, widely-recognized genre names (e.g., "Drama", "Comedy", "Action", "Thriller", "Romance", "Sci-Fi", "Horror", "Fantasy", "Crime", "Mystery")
   - Provide 1-3 genres per movie as an array
   - If a movie spans multiple genres, include all relevant ones

4. ExpectedScore Calculation (0.0 to 1.0):
   - 0.8-1.0: Excellent match - movie strongly aligns with preferred genres AND music taste (if provided), highly rated, well-known
   - 0.6-0.79: Good match - movie aligns well with preferences, solid recommendation
   - 0.4-0.59: Moderate match - movie has some connection to preferences but may be a stretch or niche
   - 0.2-0.39: Weak match - movie has tangential connection, included for diversity or as a wildcard
   - 0.0-0.19: Minimal match - only include if you must reach 10 movies, very loose connection
   - When songs are provided, give higher scores to movies whose themes/mood match the music
   - When only genres are provided, base scores primarily on genre alignment
   - Distribute scores across the range - don't give all movies the same score

5. Edge Cases:
   - If preferences are very niche or obscure, still find 10 movies by expanding to related options
   - If songs and other preferences seem contradictory, prioritize the listed preferences but consider music mood for scoring
   - If no songs are provided, rely solely on the user preferences listed above
   - If multiple songs are provided, consider the overall musical theme/pattern
   - If multiple preference types are provided, try to find movies that satisfy as many as possible

6. Output Format:
   - Return ONLY valid JSON matching the exact schema specified in the format instructions
   - Do not include any explanatory text, markdown, code blocks, or additional commentary
   - Do not include any text before or after the JSON
   - Ensure all movie titles are strings (not null or empty)
   - Ensure all genre arrays contain at least one string
   - Ensure all expectedScore values are numbers between 0.0 and 1.0 (inclusive)
   - Use proper JSON syntax - all strings must be properly quoted, arrays properly formatted

7. Validation:
   - Before returning, verify you have exactly 10 movies
   - Verify each movie has a non-empty title
   - Verify each movie has at least one genre
   - Verify each expectedScore is a number between 0.0 and 1.0
   - Verify the JSON is valid and parseable

{format_instructions}

CRITICAL: Return ONLY the JSON object with exactly 10 movies. No additional text, explanations, or formatting outside the JSON structure.
`);

export async function generateMovieRecommendations(userInput: z.infer<typeof userInputSchema>) {
  if (!process.env.PERPLEXITY_API_KEY) {
    throw new Error("PERPLEXITY_API_KEY is not set in environment variables");
  }

  const model = new ChatPerplexity({
    apiKey: process.env.PERPLEXITY_API_KEY,
    model: "sonar",
  });

  const validatedInput = userInputSchema.parse(userInput);

  // Convert Spotify URLs to song details
  let songs: SongDetails[] = [];
  if (validatedInput.spotifyUrls && validatedInput.spotifyUrls.length > 0) {
    songs = await getSongsFromUrls(validatedInput.spotifyUrls);
  }

  const formatInstructions = parser.getFormatInstructions();

  // Check if preferences are empty
  const hasPreferences = validatedInput.preferences && Object.keys(validatedInput.preferences).length > 0;
  const hasSongs = songs.length > 0;

  // Dynamically build preferences section from the flexible preferences object
  let preferencesSection: string;
  let selectionCriteria: string;

  if (!hasPreferences && !hasSongs) {
    // No preferences or songs - return random movies
    preferencesSection = 'No preferences provided. The user wants random movie recommendations.';
    selectionCriteria = `- Return a diverse mix of 10 random, well-known movies from different genres, eras, and styles
   - Include a variety of genres: Action, Comedy, Drama, Thriller, Romance, Sci-Fi, Horror, Fantasy, Crime, Mystery, etc.
   - Include movies from different decades (classic, modern, recent) for variety
   - Include a mix of well-known popular movies (60-70%) and critically acclaimed films (30-40%)
   - Only recommend actual, real movies that exist - do not invent or make up movie titles
   - Use the exact, official movie title as it appears in databases (e.g., "The Shawshank Redemption" not "Shawshank Redemption")
   - Distribute expectedScore values randomly across the 0.3-0.7 range since there are no preferences to match`;
  } else {
    // Has preferences or songs - use preference-based selection
    preferencesSection = Object.entries(validatedInput.preferences || {})
      .map(([key, values]) => {
        // Format key nicely (e.g., "preferredGenres" -> "Preferred Genres")
        const formattedKey = key
          .replace(/([A-Z])/g, ' $1')
          .replace(/^./, str => str.toUpperCase())
          .trim();
        return `${formattedKey}: ${values.join(', ')}`;
      })
      .join('\n') || 'No specific preferences listed.';
    
    selectionCriteria = `- Prioritize movies that match ALL the user's preferences listed above
   - If "Preferred Genres" is specified, prioritize movies in those genres
   - If "Preferred Era" or similar time-based preferences are specified, prioritize movies from those time periods
   - Consider all preference types when making recommendations
   - If songs are provided, consider the mood, themes, and emotional tone of the music when selecting movies
   - Include a mix of well-known popular movies (60-70%) and lesser-known hidden gems (30-40%)
   - Include movies from different decades (classic, modern, recent) for variety
   - Ensure genre diversity within the recommendations (not all the same sub-genre)
   - Only recommend actual, real movies that exist - do not invent or make up movie titles
   - Use the exact, official movie title as it appears in databases (e.g., "The Shawshank Redemption" not "Shawshank Redemption")`;
  }

  const songsSection = hasSongs
    ? `User's favorite songs:\n${songs
        .map(song => `- "${song.name}" by ${song.artist} (Genre: ${song.genre})`)
        .join('\n')}\n\nUse these songs to understand the user's musical taste, mood preferences, and emotional themes when selecting movies.`
    : 'No favorite songs provided.';

  const prompt = await promptTemplate.format({
    preferencesSection,
    songsSection,
    selectionCriteria,
    format_instructions: formatInstructions,
  });

  try {
    const response = await model.invoke(prompt);
    const responseContent = response.content.toString();
    
    // Clean up the response content in case it has markdown code blocks or extra text
    let cleanedContent = responseContent.trim();
    
    // Remove markdown code blocks if present
    if (cleanedContent.startsWith('```json')) {
      cleanedContent = cleanedContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleanedContent.startsWith('```')) {
      cleanedContent = cleanedContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }
    
    // Try to extract JSON if there's extra text
    const jsonMatch = cleanedContent.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      cleanedContent = jsonMatch[0];
    }
    
    const parsedOutput = await parser.parse(cleanedContent);
    
    // Validate that we got exactly 10 movies
    if (parsedOutput.movies.length !== 10) {
      console.warn(`Expected 10 movies but got ${parsedOutput.movies.length}`);
    }
    
    return parsedOutput.movies;
  } catch (error) {
    console.error("Error generating movie recommendations:", error);
    if (error instanceof Error) {
      throw new Error(`Failed to generate movie recommendations: ${error.message}`);
    }
    throw new Error("Failed to generate movie recommendations: Unknown error");
  }
}

export async function getMovies(userInput: z.infer<typeof userInputSchema>) {
  const movies = await generateMovieRecommendations(userInput);
  return movies;
}

// (async () => {
//   try {
//     const movies = await getMovies({
//       preferences: {
//         preferredGenres: ["drama", "romance"],
//         preferredEra: ["2000s"],
//         // You can add any new preference type here without changing code!
//         // preferredDirectors: ["Christopher Nolan"],
//         // preferredActors: ["Leonardo DiCaprio"],
//         // etc.
//       },
//       spotifyUrls: [
//         "https://open.spotify.com/track/0bYg9bo50gSsH3LtXe2SQn?si=a615e44cba56420b",
//       ],
//     });
//     console.log("Recommended movies:", movies);
//   } catch (error) {
//     console.error("Error:", error);
//   }
// })();

// (async () => {
//     try {
//       const songs = await getSongsFromUrls([
//         "https://open.spotify.com/track/4nCNS9SexVaW62PGIbAjtF?si=397c3e21d80e42ff",
//         "https://open.spotify.com/track/57Xjny5yNzAcsxnusKmAfA?si=27e44096761245ef",
//       ]);
//       console.log("Songs:", songs);
//     } catch (error) {
//     console.error("Error:", error);
//   }
// })();

// (async () => {
//   const movies = await getMovies({
//     preferredGenres: ["sci-fi", "space"]
//   });
//   console.log("Recommended movies:", movies);
// })();