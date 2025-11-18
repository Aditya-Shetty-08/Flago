import { createClient } from '@/lib/supabase/server';
import { generateMovieRecommendations, userInputSchema } from '@/lib/getMovies';

export interface PartyMovie {
  id: string;
  party_id: string;
  movie_id: string;
  title: string;
  genres: string[];
  expected_score: number;
  elo_rating: number;
  total_swipes: number;
  right_swipes: number;
  left_swipes: number;
  created_at: string;
  updated_at: string;
}

/**
 * Get all movies for a party
 */
export async function getPartyMovies(partyId: string) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('party_movies')
    .select('*')
    .eq('party_id', partyId)
    .order('elo_rating', { ascending: false });

  if (error) {
    throw new Error(`Failed to get party movies: ${error.message}`);
  }

  return data;
}

/**
 * Generate movies for a party based on aggregated preferences
 * This function aggregates preferences FIRST, then generates movies
 */
export async function generatePartyMovies(partyId: string, userId?: string) {
  const supabase = await createClient();
  
  // Get party
  const { data: party, error: partyError } = await supabase
    .from('parties')
    .select('*')
    .eq('id', partyId)
    .single();

  if (partyError || !party) {
    throw new Error('Party not found');
  }

  // AGGREGATE preferences on the host machine (this is the key change!)
  console.log('[MOVIE SERVICE] Aggregating preferences for party:', partyId);
  const { data: aggregated, error: aggError } = await supabase
    .rpc('aggregate_party_preferences', { party_uuid: partyId });

  if (aggError) {
    console.error('[MOVIE SERVICE] Error aggregating preferences:', aggError);
    throw new Error(`Failed to aggregate preferences: ${aggError.message}`);
  }

  if (!aggregated) {
    throw new Error('No preferences found. All members must submit preferences first.');
  }

  // Store aggregated preferences in party
  await supabase
    .from('parties')
    .update({ aggregated_preferences: aggregated })
    .eq('id', partyId);

  console.log('[MOVIE SERVICE] Preferences aggregated successfully:', aggregated);

  // Get all member Spotify URLs
  const { data: members } = await supabase
    .from('party_members')
    .select('spotify_urls')
    .eq('party_id', partyId)
    .eq('status', 'active')
    .eq('has_submitted_preferences', true);

  const allSpotifyUrls: string[] = [];
  members?.forEach(member => {
    if (member.spotify_urls) {
      allSpotifyUrls.push(...member.spotify_urls);
    }
  });

  // Generate movies using the aggregated preferences we just computed
  // Ensure preferences are in the correct format (Record<string, string[]>)
  const aggregatedPrefs = aggregated as Record<string, any>;
  
  // Convert any nested arrays or non-array values to string arrays
  const normalizedPreferences: Record<string, string[]> = {};
  if (aggregatedPrefs) {
    for (const [key, value] of Object.entries(aggregatedPrefs)) {
      if (Array.isArray(value)) {
        // Flatten nested arrays and convert to strings
        normalizedPreferences[key] = value.flatMap((v: any) => 
          Array.isArray(v) ? v.map(String) : [String(v)]
        );
      } else if (value !== null && value !== undefined) {
        normalizedPreferences[key] = [String(value)];
      }
    }
  }
  
  console.log('[MOVIE SERVICE] Normalized preferences:', normalizedPreferences);
  
  const userInput = {
    preferences: normalizedPreferences,
    spotifyUrls: allSpotifyUrls.length > 0 ? allSpotifyUrls : undefined,
  };

  const movies = await generateMovieRecommendations(userInput);

  // Store movies in party - use anonymous version if userId provided
  if (userId) {
    const { storePartyMoviesAnonymous } = await import('./anonymous-service');
    await storePartyMoviesAnonymous(partyId, userId, movies);
  } else {
    const { storePartyMovies } = await import('./party-service');
    await storePartyMovies(partyId, movies);
  }

  return movies;
}

/**
 * Record a swipe on a movie
 */
export async function recordSwipe(
  partyId: string,
  movieId: string,
  direction: 'left' | 'right'
) {
  const supabase = await createClient();
  
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new Error('User not authenticated');
  }

  // Check if swipe already exists
  const { data: existingSwipe } = await supabase
    .from('user_swipes')
    .select('*')
    .eq('party_id', partyId)
    .eq('user_id', user.id)
    .eq('movie_id', movieId)
    .single();

  if (existingSwipe) {
    throw new Error('Swipe already recorded for this movie');
  }

  // Insert swipe (trigger will update movie ELO)
  const { data, error } = await supabase
    .from('user_swipes')
    .insert({
      party_id: partyId,
      user_id: user.id,
      movie_id: movieId,
      direction,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to record swipe: ${error.message}`);
  }

  // Update member's swipe progress
  const { data: member } = await supabase
    .from('party_members')
    .select('swipes_completed')
    .eq('party_id', partyId)
    .eq('user_id', user.id)
    .single();

  if (member) {
    const newCount = (member.swipes_completed || 0) + 1;
    await supabase
      .from('party_members')
      .update({ swipes_completed: newCount, has_completed_swiping: newCount >= 10 })
      .eq('party_id', partyId)
      .eq('user_id', user.id);
  }

  return data;
}

/**
 * Get user's swipes for a party
 */
export async function getUserSwipes(partyId: string) {
  const supabase = await createClient();
  
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new Error('User not authenticated');
  }

  const { data, error } = await supabase
    .from('user_swipes')
    .select('*')
    .eq('party_id', partyId)
    .eq('user_id', user.id);

  if (error) {
    throw new Error(`Failed to get user swipes: ${error.message}`);
  }

  return data;
}

/**
 * Calculate individual ELO for a member based on their swipes
 */
function calculateMemberElo(
  movies: PartyMovie[],
  memberSwipes: Array<{ movie_id: string; direction: 'left' | 'right' }>
): Array<{ title: string; elo: number }> {
  const K_FACTOR = 32;
  const BASE_ELO = 1200;
  
  // Create a map of movie_id -> MovieRating
  const movieRatings = new Map<string, { elo: number; expected_score: number; title: string }>();
  
  // Initialize all movies with base ELO
  for (const movie of movies) {
    movieRatings.set(movie.movie_id, {
      elo: BASE_ELO,
      expected_score: movie.expected_score,
      title: movie.title,
    });
  }
  
  // Apply each swipe to calculate ELO
  for (const swipe of memberSwipes) {
    const movieRating = movieRatings.get(swipe.movie_id);
    if (!movieRating) continue;
    
    const actualScore = swipe.direction === 'right' ? 1.0 : 0.0;
    const eloChange = K_FACTOR * (actualScore - movieRating.expected_score);
    movieRating.elo += eloChange;
  }
  
  // Convert to array format for checkAll
  return Array.from(movieRatings.values()).map(m => ({
    title: m.title,
    elo: m.elo,
  }));
}

/**
 * Calculate and store final ELO rankings for a party using checkAll()
 * This should be called once when the party is completed
 */
export async function calculateAndStoreFinalRankings(partyId: string) {
  const supabase = await createClient();
  
  // Get all party movies
  const { data: movies, error: moviesError } = await supabase
    .from('party_movies')
    .select('*')
    .eq('party_id', partyId);

  if (moviesError || !movies || movies.length === 0) {
    throw new Error(`Failed to get party movies: ${moviesError?.message || 'No movies found'}`);
  }

  // Get all active members
  const { data: members, error: membersError } = await supabase
    .from('party_members')
    .select('user_id')
    .eq('party_id', partyId)
    .eq('status', 'active');

  if (membersError || !members || members.length === 0) {
    // If no members, keep existing ELOs
    return;
  }

  // Get all swipes for all members
  const { data: allSwipes, error: swipesError } = await supabase
    .from('user_swipes')
    .select('user_id, movie_id, direction')
    .eq('party_id', partyId);

  if (swipesError) {
    throw new Error(`Failed to get swipes: ${swipesError.message}`);
  }

  // Group swipes by member
  const swipesByMember = new Map<string, Array<{ movie_id: string; direction: 'left' | 'right' }>>();
  for (const member of members) {
    swipesByMember.set(member.user_id, []);
  }
  
  for (const swipe of allSwipes || []) {
    const memberSwipes = swipesByMember.get(swipe.user_id);
    if (memberSwipes) {
      memberSwipes.push({
        movie_id: swipe.movie_id,
        direction: swipe.direction as 'left' | 'right',
      });
    }
  }

  // Calculate ELO for each member
  const memberEloArrays: Array<Array<{ title: string; elo: number }>> = [];
  for (const [userId, memberSwipes] of swipesByMember.entries()) {
    const memberElos = calculateMemberElo(movies, memberSwipes);
    // Sort by title to ensure consistent ordering across all members
    memberElos.sort((a, b) => a.title.localeCompare(b.title));
    memberEloArrays.push(memberElos);
  }
  
  // Ensure all arrays have the same movies (in case a member didn't swipe on all movies)
  if (memberEloArrays.length > 0) {
    const firstArray = memberEloArrays[0];
    const allTitles = new Set(firstArray.map(m => m.title));
    
    // For each member's array, ensure it has all movies (fill missing with base ELO)
    const BASE_ELO = 1200;
    for (let i = 0; i < memberEloArrays.length; i++) {
      const memberArray = memberEloArrays[i];
      const memberTitles = new Set(memberArray.map(m => m.title));
      
      // Add missing movies with base ELO
      for (const title of allTitles) {
        if (!memberTitles.has(title)) {
          memberArray.push({ title, elo: BASE_ELO });
        }
      }
      
      // Re-sort to maintain consistent order
      memberArray.sort((a, b) => a.title.localeCompare(b.title));
    }
  }

  // Use checkAll to aggregate all members' ELOs
  const { checkAll } = await import('@/lib/elo_rating/compare_elo');
  const aggregatedElos = checkAll(memberEloArrays);

  // Create a map of title -> aggregated ELO
  const eloMap = new Map(aggregatedElos.map(m => [m.title, m.elo]));
  
  // Update all movies with final aggregated ELO
  for (const movie of movies) {
    const finalElo = eloMap.get(movie.title) || movie.elo_rating || 1200;
    await supabase
      .from('party_movies')
      .update({ elo_rating: finalElo })
      .eq('party_id', partyId)
      .eq('movie_id', movie.movie_id);
  }
}

/**
 * Get final rankings for a party
 * Returns the stored ELO ratings (calculated when party completed)
 */
export async function getPartyRankings(partyId: string) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('party_movies')
    .select('*')
    .eq('party_id', partyId)
    .order('elo_rating', { ascending: false });

  if (error) {
    throw new Error(`Failed to get party rankings: ${error.message}`);
  }

  return data || [];
}

