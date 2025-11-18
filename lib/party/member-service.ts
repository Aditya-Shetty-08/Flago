import { createClient } from '@/lib/supabase/server';

export interface PartyMember {
  id: string;
  party_id: string;
  user_id: string;
  role: 'host' | 'member';
  joined_at: string;
  status: 'active' | 'left' | 'removed';
  preferences: Record<string, any> | null;
  spotify_urls: string[] | null;
  has_submitted_preferences: boolean;
  has_completed_swiping: boolean;
  swipes_completed: number;
}

export interface SubmitPreferencesInput {
  preferences: Record<string, string[]>;
  spotifyUrls?: string[];
}

/**
 * Join a party by slug
 */
export async function joinParty(slug: string) {
  const supabase = await createClient();
  
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new Error('User not authenticated');
  }

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
    .eq('user_id', user.id)
    .single();

  if (existingMember) {
    // User is already a member, return existing membership
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
      user_id: user.id,
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
 * Get all members of a party
 */
export async function getPartyMembers(partyId: string) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('party_members')
    .select('*')
    .eq('party_id', partyId)
    .eq('status', 'active')
    .order('joined_at', { ascending: true });

  if (error) {
    throw new Error(`Failed to get party members: ${error.message}`);
  }

  return data;
}

/**
 * Get current user's membership in a party
 */
export async function getMyMembership(partyId: string) {
  const supabase = await createClient();
  
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return null;
  }

  const { data, error } = await supabase
    .from('party_members')
    .select('*')
    .eq('party_id', partyId)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Not a member
    }
    throw new Error(`Failed to get membership: ${error.message}`);
  }

  return data;
}

/**
 * Submit user preferences for a party
 */
export async function submitPreferences(partyId: string, input: SubmitPreferencesInput) {
  const supabase = await createClient();
  
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new Error('User not authenticated');
  }

  // Update member preferences (NO aggregation here - host will aggregate when generating movies)
  const { data, error } = await supabase
    .from('party_members')
    .update({
      preferences: input.preferences,
      spotify_urls: input.spotifyUrls || [],
      has_submitted_preferences: true,
    })
    .eq('party_id', partyId)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to submit preferences: ${error.message}`);
  }

  // Don't aggregate here - aggregation happens on host machine when generating movies
  return data;
}

/**
 * Update member's swipe progress
 */
export async function updateSwipeProgress(partyId: string, swipesCompleted: number) {
  const supabase = await createClient();
  
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new Error('User not authenticated');
  }

  const hasCompleted = swipesCompleted >= 10;

  const { data, error } = await supabase
    .from('party_members')
    .update({
      swipes_completed: swipesCompleted,
      has_completed_swiping: hasCompleted,
    })
    .eq('party_id', partyId)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update swipe progress: ${error.message}`);
  }

  return data;
}

