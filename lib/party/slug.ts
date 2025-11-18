import { nanoid } from 'nanoid';

const adjectives = [
  'happy', 'cool', 'epic', 'awesome', 'funny', 'wild', 'crazy', 'chill',
  'rad', 'sweet', 'fresh', 'bold', 'swift', 'bright', 'calm', 'daring'
];

const nouns = [
  'movie', 'cinema', 'film', 'flick', 'show', 'night', 'party', 'crew',
  'squad', 'gang', 'team', 'group', 'club', 'session', 'event', 'gathering'
];

/**
 * Generates a URL-friendly slug for a party
 * Format: {adjective}-{noun}-{4char-id}
 * Example: "happy-movie-7k2x"
 */
export async function generatePartySlug(supabase: any): Promise<string> {
  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    const id = nanoid(4);
    const slug = `${adjective}-${noun}-${id}`;

    // Check if slug exists
    const { data, error } = await supabase
      .from('parties')
      .select('id')
      .eq('slug', slug)
      .single();

    if (error && error.code === 'PGRST116') {
      // No row found - slug is available
      return slug;
    }

    if (error && error.code !== 'PGRST116') {
      // Some other error occurred
      throw new Error(`Failed to check slug availability: ${error.message}`);
    }

    // Slug exists, try again
    attempts++;
  }

  // Fallback to nanoid-only slug if we can't find a unique one
  return `party-${nanoid(8)}`;
}

