import { createClient } from '@/lib/supabase/server';

export type PartyStatus = 'waiting' | 'collecting_preferences' | 'swiping' | 'completed';

export interface Party {
  id: string;
  slug: string;
  name: string | null;
  created_by: string;
  status: PartyStatus;
  created_at: string;
  updated_at: string;
  max_members: number;
  min_members: number;
  aggregated_preferences: Record<string, any> | null;
  movies: any[] | null;
  settings: Record<string, any>;
}

export interface CreatePartyInput {
  name?: string;
  max_members?: number;
  min_members?: number;
}

/**
 * Create a new party
 */
export async function createParty(input: CreatePartyInput = {}) {
  const supabase = await createClient();
  
  // Get current user
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new Error('User not authenticated');
  }

  // Generate unique slug
  const { generatePartySlug } = await import('./slug');
  const slug = await generatePartySlug(supabase);

  // Create party
  const { data, error } = await supabase
    .from('parties')
    .insert({
      slug,
      name: input.name || null,
      created_by: user.id,
      max_members: input.max_members || 10,
      min_members: input.min_members || 1,
      status: 'waiting',
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create party: ${error.message}`);
  }

  // Add creator as host member
  const { error: memberError } = await supabase
    .from('party_members')
    .insert({
      party_id: data.id,
      user_id: user.id,
      role: 'host',
      status: 'active',
    });

  if (memberError) {
    // Rollback party creation
    await supabase.from('parties').delete().eq('id', data.id);
    throw new Error(`Failed to add host to party: ${memberError.message}`);
  }

  return data;
}

/**
 * Get party by slug
 */
export async function getPartyBySlug(slug: string) {
  console.log('[PARTY SERVICE] getPartyBySlug called with slug:', slug);
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('parties')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error) {
    console.error('[PARTY SERVICE] Error getting party:', error);
    if (error.code === 'PGRST116') {
      throw new Error('Party not found');
    }
    throw new Error(`Failed to get party: ${error.message}`);
  }

  console.log('[PARTY SERVICE] Party found:', data?.id);
  return data;
}

/**
 * Get party by ID
 */
export async function getPartyById(partyId: string) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('parties')
    .select('*')
    .eq('id', partyId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      throw new Error('Party not found');
    }
    throw new Error(`Failed to get party: ${error.message}`);
  }

  return data;
}

/**
 * Update party status
 */
export async function updatePartyStatus(partyId: string, status: PartyStatus) {
  const supabase = await createClient();
  
  // Get current user
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new Error('User not authenticated');
  }

  // Verify user is the creator
  const party = await getPartyById(partyId);
  if (party.created_by !== user.id) {
    throw new Error('Only party creator can update status');
  }

  const { data, error } = await supabase
    .from('parties')
    .update({ status })
    .eq('id', partyId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update party status: ${error.message}`);
  }

  return data;
}

/**
 * Update party aggregated preferences
 */
export async function updatePartyPreferences(partyId: string, preferences: Record<string, any>) {
  const supabase = await createClient();
  
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new Error('User not authenticated');
  }

  // Verify user is the creator
  const party = await getPartyById(partyId);
  if (party.created_by !== user.id) {
    throw new Error('Only party creator can update preferences');
  }

  const { data, error } = await supabase
    .from('parties')
    .update({ aggregated_preferences: preferences })
    .eq('id', partyId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update party preferences: ${error.message}`);
  }

  return data;
}

/**
 * Store generated movies in party
 */
export async function storePartyMovies(partyId: string, movies: any[]) {
  const supabase = await createClient();
  
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new Error('User not authenticated');
  }

  // Verify user is the creator
  const party = await getPartyById(partyId);
  if (party.created_by !== user.id) {
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
    throw new Error(`Failed to store movies: ${error.message}`);
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
    throw new Error(`Failed to create movie records: ${moviesError.message}`);
  }

  return data;
}

