/**
 * Service layer for anonymous (non-authenticated) operations
 * Replaces auth-based services with session-based identification
 */

import { createClient } from '@/lib/supabase/server';
import { getUserId } from './session';

/**
 * Get current anonymous user ID from request headers
 */
export async function getAnonymousUserId(request?: Request): Promise<string> {
  // For server-side, we need to get it from headers or generate
  // For client-side, use the session utility
  if (typeof window !== 'undefined') {
    return await getUserId();
  }

  // Server-side: try to get from headers
  if (request) {
    const sessionId = request.headers.get('x-session-id');
    if (sessionId) {
      return sessionId;
    }
  }

  // Fallback: generate temporary ID (client will provide real one)
  return `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create party (anonymous)
 */
export async function createPartyAnonymous(name?: string) {
  const supabase = await createClient();
  
  // Generate unique slug
  const { generatePartySlug } = await import('./slug');
  const slug = await generatePartySlug(supabase);

  // For server-side, we'll need the user_id passed in
  // This will be called from API route which has access to headers
  throw new Error('Use createPartyWithUserId instead');
}

/**
 * Create party with user ID
 */
export async function createPartyWithUserId(userId: string, name?: string) {
  console.log('[PARTY] createPartyWithUserId called with userId:', userId, 'name:', name);
  const supabase = await createClient();

  // Generate unique slug
  const { generatePartySlug } = await import('./slug');
  const slug = await generatePartySlug(supabase);
  console.log('[PARTY] Generated slug:', slug);

  // Create party
  const { data, error } = await supabase
    .from('parties')
    .insert({
      slug,
      name: name || null,
      created_by: userId,
      max_members: 10,
      min_members: 1,
      status: 'waiting',
    })
    .select()
    .single();

  if (error) {
    console.error('[PARTY] Error creating party:', error);
    throw new Error(`Failed to create party: ${error.message}`);
  }

  console.log('[PARTY] Party created:', data.id, 'slug:', data.slug);

  // Add creator as host member
  const { error: memberError } = await supabase
    .from('party_members')
    .insert({
      party_id: data.id,
      user_id: userId,
      role: 'host',
      status: 'active',
    });

  if (memberError) {
    console.error('[PARTY] Error adding host member:', memberError);
    // Rollback party creation
    await supabase.from('parties').delete().eq('id', data.id);
    throw new Error(`Failed to add host to party: ${memberError.message}`);
  }

  console.log('[PARTY] Host member added successfully with userId:', userId);
  return data;
}

/**
 * Join party (anonymous)
 */
export async function joinPartyAnonymous(slug: string, userId: string) {
  const supabase = await createClient();

  // Get party by slug
  const { data: party, error: partyError } = await supabase
    .from('parties')
    .select('*')
    .eq('slug', slug)
    .single();

  if (partyError || !party) {
    throw new Error('Party not found');
  }

  // Check if user is already a member
  const { data: existingMember } = await supabase
    .from('party_members')
    .select('*')
    .eq('party_id', party.id)
    .eq('user_id', userId)
    .single();

  if (existingMember) {
    return existingMember;
  }

  // Check if party is full
  const { count } = await supabase
    .from('party_members')
    .select('*', { count: 'exact', head: true })
    .eq('party_id', party.id)
    .eq('status', 'active');

  if (count && count >= party.max_members) {
    throw new Error('Party is full');
  }

  // Add user as member
  const { data, error } = await supabase
    .from('party_members')
    .insert({
      party_id: party.id,
      user_id: userId,
      role: 'member',
      status: 'active',
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to join party: ${error.message}`);
  }

  return data;
}

/**
 * Get my membership (anonymous)
 */
export async function getMyMembershipAnonymous(partyId: string, userId: string) {
  console.log('[MEMBERSHIP] getMyMembershipAnonymous called with partyId:', partyId, 'userId:', userId);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('party_members')
    .select('*')
    .eq('party_id', partyId)
    .eq('user_id', userId)
    .eq('status', 'active')
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      console.log('[MEMBERSHIP] No membership found (PGRST116)');
      return null; // Not a member
    }
    console.error('[MEMBERSHIP] Error getting membership:', error);
    throw new Error(`Failed to get membership: ${error.message}`);
  }

  console.log('[MEMBERSHIP] Found membership:', data);
  return data;
}

/**
 * Submit preferences (anonymous)
 * NOTE: This only stores individual preferences. Aggregation happens when host generates movies.
 */
export async function submitPreferencesAnonymous(
  partyId: string,
  userId: string,
  preferences: Record<string, string[]>,
  spotifyUrls?: string[]
) {
  const supabase = await createClient();

  // Update member preferences (NO aggregation here - host will aggregate when generating movies)
  const { data, error } = await supabase
    .from('party_members')
    .update({
      preferences,
      spotify_urls: spotifyUrls || [],
      has_submitted_preferences: true,
    })
    .eq('party_id', partyId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to submit preferences: ${error.message}`);
  }

  // Don't aggregate here - aggregation happens on host machine when generating movies
  return data;
}

/**
 * Record swipe (anonymous)
 */
export async function recordSwipeAnonymous(
  partyId: string,
  userId: string,
  movieId: string,
  direction: 'left' | 'right'
) {
  const supabase = await createClient();

  // Check if swipe already exists
  const { data: existingSwipe } = await supabase
    .from('user_swipes')
    .select('*')
    .eq('party_id', partyId)
    .eq('user_id', userId)
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
      user_id: userId,
      movie_id: movieId,
      direction,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to record swipe: ${error.message}`);
  }

  // Get the actual number of movies for this party
  const { count: movieCount } = await supabase
    .from('party_movies')
    .select('*', { count: 'exact', head: true })
    .eq('party_id', partyId);

  // Update member's swipe progress
  const { data: member } = await supabase
    .from('party_members')
    .select('swipes_completed')
    .eq('party_id', partyId)
    .eq('user_id', userId)
    .single();

  if (member) {
    const newCount = (member.swipes_completed || 0) + 1;
    const totalMovies = movieCount || 10; // Fallback to 10 if count fails
    const hasCompleted = newCount >= totalMovies;
    
    await supabase
      .from('party_members')
      .update({ swipes_completed: newCount, has_completed_swiping: hasCompleted })
      .eq('party_id', partyId)
      .eq('user_id', userId);

    // Check if all active members have completed swiping
    if (hasCompleted) {
      const { data: allMembers } = await supabase
        .from('party_members')
        .select('has_completed_swiping')
        .eq('party_id', partyId)
        .eq('status', 'active');

      const allCompleted = allMembers?.every(m => m.has_completed_swiping) ?? false;
      
      if (allCompleted) {
        // Calculate and store final ELO rankings using checkAll()
        const { calculateAndStoreFinalRankings } = await import('@/lib/party/movie-service');
        try {
          await calculateAndStoreFinalRankings(partyId);
        } catch (error) {
          console.error('[RECORD SWIPE] Error calculating final rankings:', error);
          // Continue anyway - we'll still mark as completed
        }
        
        // Update party status to completed
        await supabase
          .from('parties')
          .update({ status: 'completed' })
          .eq('id', partyId);
      }
    }
  }

  return data;
}

/**
 * Update party status (check ownership)
 */
export async function updatePartyStatusAnonymous(
  partyId: string,
  userId: string,
  status: string
) {
  console.log('[UPDATE STATUS] updatePartyStatusAnonymous called with partyId:', partyId, 'userId:', userId, 'status:', status);
  const supabase = await createClient();

  // Verify user is the creator
  const { data: party, error: partyError } = await supabase
    .from('parties')
    .select('*')
    .eq('id', partyId)
    .single();

  if (partyError || !party) {
    console.error('[UPDATE STATUS] Party not found:', partyError);
    throw new Error('Party not found');
  }

  console.log('[UPDATE STATUS] Party found - created_by:', party.created_by, 'userId:', userId);
  console.log('[UPDATE STATUS] Match?', party.created_by === userId);

  if (party.created_by !== userId) {
    console.error('[UPDATE STATUS] User is not the creator!');
    throw new Error('Only party creator can update status');
  }

  console.log('[UPDATE STATUS] Updating party status...');
  const { data, error } = await supabase
    .from('parties')
    .update({ status })
    .eq('id', partyId)
    .select()
    .single();

  if (error) {
    console.error('[UPDATE STATUS] Error updating status:', error);
    throw new Error(`Failed to update party status: ${error.message}`);
  }

  console.log('[UPDATE STATUS] Status updated successfully:', data);
  return data;
}

/**
 * Store generated movies in party (anonymous)
 */
export async function storePartyMoviesAnonymous(
  partyId: string,
  userId: string,
  movies: any[]
) {
  console.log('[STORE MOVIES] storePartyMoviesAnonymous called with partyId:', partyId, 'userId:', userId, 'movies count:', movies.length);
  const supabase = await createClient();

  // Verify user is the creator
  const { data: party, error: partyError } = await supabase
    .from('parties')
    .select('*')
    .eq('id', partyId)
    .single();

  if (partyError || !party) {
    console.error('[STORE MOVIES] Party not found:', partyError);
    throw new Error('Party not found');
  }

  if (party.created_by !== userId) {
    console.error('[STORE MOVIES] User is not the creator!');
    throw new Error('Only party creator can store movies');
  }

  // Store movies in party.movies JSONB field
  const { data, error } = await supabase
    .from('parties')
    .update({ movies })
    .eq('id', partyId)
    .select()
    .single();

  if (error) {
    console.error('[STORE MOVIES] Error storing movies:', error);
    throw new Error(`Failed to store movies: ${error.message}`);
  }

  // Check if movies already exist for this party
  const { data: existingMovies } = await supabase
    .from('party_movies')
    .select('movie_id')
    .eq('party_id', partyId);

  if (existingMovies && existingMovies.length > 0) {
    console.log('[STORE MOVIES] Movies already exist for this party, skipping insert');
    return data;
  }

  // Also create party_movies records
  const movieRecords = movies.map((movie, index) => ({
    party_id: partyId,
    movie_id: `m${index + 1}`,
    title: movie.title,
    genres: movie.genre || movie.genres || [],
    expected_score: movie.expectedScore || movie.expected_score || 0.5,
    elo_rating: 1200.0,
  }));

  const { error: moviesError } = await supabase
    .from('party_movies')
    .insert(movieRecords);

  if (moviesError) {
    console.error('[STORE MOVIES] Error creating movie records:', moviesError);
    throw new Error(`Failed to create movie records: ${moviesError.message}`);
  }

  console.log('[STORE MOVIES] Movies stored successfully');
  return data;
}

