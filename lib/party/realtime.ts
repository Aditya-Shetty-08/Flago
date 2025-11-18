import { createClient } from '@/lib/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface PartyRealtimeCallbacks {
  onPartyUpdate?: (party: any) => void;
  onMemberJoin?: (member: any) => void;
  onMemberLeave?: (member: any) => void;
  onMemberUpdate?: (member: any) => void;
  onMovieUpdate?: (movie: any) => void;
  onNewSwipe?: (swipe: any) => void;
}

/**
 * Subscribe to party real-time updates
 */
export function subscribeToParty(
  partyId: string,
  callbacks: PartyRealtimeCallbacks
): RealtimeChannel {
  const supabase = createClient();
  
  const channel = supabase
    .channel(`party:${partyId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'parties',
        filter: `id=eq.${partyId}`,
      },
      (payload) => {
        callbacks.onPartyUpdate?.(payload.new);
      }
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'party_members',
        filter: `party_id=eq.${partyId}`,
      },
      (payload) => {
        if (payload.eventType === 'INSERT') {
          callbacks.onMemberJoin?.(payload.new);
        } else if (payload.eventType === 'DELETE') {
          callbacks.onMemberLeave?.(payload.old);
        } else if (payload.eventType === 'UPDATE') {
          callbacks.onMemberUpdate?.(payload.new);
        }
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'party_movies',
        filter: `party_id=eq.${partyId}`,
      },
      (payload) => {
        callbacks.onMovieUpdate?.(payload.new);
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'user_swipes',
        filter: `party_id=eq.${partyId}`,
      },
      (payload) => {
        callbacks.onNewSwipe?.(payload.new);
      }
    )
    .subscribe();

  return channel;
}

/**
 * Unsubscribe from party real-time updates
 */
export function unsubscribeFromParty(channel: RealtimeChannel) {
  const supabase = createClient();
  supabase.removeChannel(channel);
}

