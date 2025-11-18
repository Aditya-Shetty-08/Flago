"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PartyHeader } from '@/components/party/party-header';
import { MemberList } from '@/components/party/member-list';
import { PreferenceForm } from '@/components/party/preference-form';
import { PartyTinderCards } from '@/components/party/party-tinder-cards';
import { PartyResults } from '@/components/party/party-results';
import { PartyStatusBanner } from '@/components/party/party-status-banner';
import { HostControls } from '@/components/party/host-controls';
import { subscribeToParty, unsubscribeFromParty } from '@/lib/party/realtime';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { RealtimeChannel } from '@supabase/supabase-js';
import Lottie from 'lottie-react';

/**
 * Loading screen component with animation and dynamic text
 */
function PartyLoadingScreen() {
  const [loadingText, setLoadingText] = useState('Loading Party...');
  const [animationData, setAnimationData] = useState<any>(null);

  // Load animation
  useEffect(() => {
    fetch('/loading.json')
      .then((res) => res.json())
      .then((data) => setAnimationData(data))
      .catch((err) => console.error('Error loading animation:', err));
  }, []);

  // Change text at intervals
  useEffect(() => {
    const messages = [
      'Loading Party...',
      'Gathering Preferences...',
      'Generating Results...',
      'Preparing Movies...',
      'Almost Ready...',
    ];

    let currentIndex = 0;
    const interval = setInterval(() => {
      currentIndex = (currentIndex + 1) % messages.length;
      setLoadingText(messages[currentIndex]);
    }, 2000); // Change text every 2 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center relative">
      <div className="flex flex-col items-center justify-center space-y-8">
        {/* Animation */}
        <div className="w-64 h-64 lg:w-96 lg:h-96">
          {animationData ? (
            <Lottie
              animationData={animationData}
              loop={true}
              autoplay={true}
              className="w-full h-full"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-white/50 text-4xl">🎬</div>
            </div>
          )}
        </div>

        {/* Dynamic Text */}
        <div className="text-center">
          <h2 className="text-3xl lg:text-4xl font-bold text-white mb-2">
            {loadingText}
          </h2>
          <div className="flex items-center justify-center space-x-2 mt-4">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
            <div className="w-2 h-2 bg-white rounded-full animate-pulse [animation-delay:0.2s]"></div>
            <div className="w-2 h-2 bg-white rounded-full animate-pulse [animation-delay:0.4s]"></div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PartyPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [party, setParty] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [myMembership, setMyMembership] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);
  const [totalMovies, setTotalMovies] = useState<number>(10);

  // Fetch initial data
  useEffect(() => {
    fetchPartyData();
  }, [slug]);


  // Set up realtime subscriptions
  useEffect(() => {
    if (!party) return;

    const ch = subscribeToParty(party.id, {
      onPartyUpdate: (updatedParty) => {
        setParty(updatedParty);
      },
      onMemberJoin: (member) => {
        setMembers((prev) => [...prev, member]);
      },
      onMemberLeave: (oldMember) => {
        setMembers((prev) => prev.filter((m) => m.id !== oldMember.id));
      },
      onMemberUpdate: (updatedMember) => {
        setMembers((prev) =>
          prev.map((m) => (m.id === updatedMember.id ? updatedMember : m))
        );
        if (updatedMember.user_id === myMembership?.user_id) {
          setMyMembership(updatedMember);
        }
      },
    });

    setChannel(ch);

    return () => {
      if (ch) {
        unsubscribeFromParty(ch);
      }
    };
  }, [party?.id, myMembership?.user_id]);

  const fetchPartyData = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('[PARTY PAGE] fetchPartyData - slug:', slug);
      
      // Fetch party
      const partyRes = await fetch(`/api/party?slug=${slug}`);
      console.log('[PARTY PAGE] Party fetch response status:', partyRes.status);
      
      if (!partyRes.ok) {
        const errorData = await partyRes.json().catch(() => ({}));
        console.error('[PARTY PAGE] Party fetch error:', errorData);
        throw new Error(errorData.error || 'Party not found');
      }
      const { party: partyData } = await partyRes.json();
      console.log('[PARTY PAGE] Party data received:', partyData);
      setParty(partyData);

      // Fetch members
      const membersRes = await fetch(`/api/party/${slug}/members`);
      let membersData: any[] = [];
      if (membersRes.ok) {
        const data = await membersRes.json();
        membersData = data.members || [];
        setMembers(membersData);
      }

      // Fetch movie count
      const moviesRes = await fetch(`/api/party/${slug}/movies`);
      if (moviesRes.ok) {
        const { movies: moviesData } = await moviesRes.json();
        setTotalMovies(moviesData?.length || 10);
      }

      // Get user ID and fetch membership
      const { getUserId } = await import('@/lib/party/session');
      const userId = await getUserId();
      console.log('[PARTY PAGE] Current userId:', userId);
      console.log('[PARTY PAGE] Party created_by:', partyData.created_by);
      
      const membershipRes = await fetch(`/api/party/${slug}/members/me?userId=${encodeURIComponent(userId)}`);
      console.log('[PARTY PAGE] Membership API response status:', membershipRes.status);
      console.log('[PARTY PAGE] Membership API URL:', `/api/party/${slug}/members/me?userId=${encodeURIComponent(userId)}`);
      
      if (membershipRes.ok) {
        const { membership } = await membershipRes.json();
        console.log('[PARTY PAGE] Membership result:', membership);
        setMyMembership(membership);
      } else {
        const errorText = await membershipRes.text();
        console.error('[PARTY PAGE] Membership API error - status:', membershipRes.status);
        console.error('[PARTY PAGE] Membership API error - response:', errorText);
        try {
          const errorData = JSON.parse(errorText);
          console.error('[PARTY PAGE] Membership API error (parsed):', errorData);
          if (errorData.error === 'Party not found') {
            console.error('[PARTY PAGE] ⚠️ Party not found! This might be a timing issue or slug mismatch.');
            console.error('[PARTY PAGE] Slug being used:', slug);
            console.error('[PARTY PAGE] Party data we have:', partyData);
          }
        } catch (e) {
          console.error('[PARTY PAGE] Could not parse error as JSON, raw text:', errorText);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load party');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    try {
      const { getUserId } = await import('@/lib/party/session');
      const userId = await getUserId();
      
      const response = await fetch(`/api/party/${slug}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          action: 'join',
          userId,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to join party');
      }

      await fetchPartyData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join party');
    }
  };

  if (loading) {
    return <PartyLoadingScreen />;
  }

  if (error || !party) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center text-red-600">{error || 'Party not found'}</div>
        <div className="text-center mt-4">
          <button
            onClick={() => router.push('/party/create')}
            className="text-blue-600 hover:underline"
          >
            Create a new party
          </button>
        </div>
      </div>
    );
  }

  // Check if user is a member
  const isMember = myMembership !== null;

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl min-h-screen">
      <PartyHeader party={party} />
      <PartyStatusBanner party={party} />

      {!isMember && (
        <div className="mt-4 p-6 border rounded-lg">
          <p className="mb-5 text-4xl">Wait I don't see you in my list... let's fix that.</p>
          <button
            onClick={handleJoin}
            className="px-6 py-4 bg-blue-600 text-white hover:bg-blue-700 rounded-full text-2xl"
          >
            Join this Party
          </button>
        </div>
      )}

      {isMember && (
        <>
          <MemberList members={members} totalMovies={totalMovies} />

          {party.status === 'waiting' && (
            <>
              {myMembership?.role === 'host' && (
                <Card className="mt-4">
                  <CardContent className="p-4">
                    <p className="mb-10 text-2xl">
                      Ready to start collecting preferences?
                    </p>
                    <Button
                      onClick={async () => {
                        try {
                          const { getUserId } = await import('@/lib/party/session');
                          const userId = await getUserId();
                          console.log('[BUTTON] Starting to collect preferences - userId:', userId, 'slug:', slug);
                          
                          const response = await fetch(`/api/party/${slug}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ 
                              status: 'collecting_preferences',
                              userId,
                            }),
                          });
                          
                          console.log('[BUTTON] Response status:', response.status);
                          
                          if (response.ok) {
                            console.log('[BUTTON] Status updated successfully');
                            fetchPartyData();
                          } else {
                            const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
                            console.error('[BUTTON] Failed to update status:', errorData);
                            setError(errorData.error || 'Failed to update party status');
                          }
                        } catch (err) {
                          console.error('[BUTTON] Error:', err);
                          setError(err instanceof Error ? err.message : 'Failed to start collecting preferences');
                        }
                      }}
                      className="w-full"
                    >
                      Start Collecting Preferences
                    </Button>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {party.status === 'collecting_preferences' && (
            <>
              <PreferenceForm
                partySlug={slug}
                hasSubmitted={myMembership?.has_submitted_preferences || false}
                onSubmitted={fetchPartyData}
              />
              {myMembership?.role === 'host' && (
                <HostControls
                  partySlug={slug}
                  members={members}
                  onStatusChange={fetchPartyData}
                />
              )}
            </>
          )}

          {party.status === 'swiping' && !myMembership?.has_completed_swiping && (
            <Card className="mt-4">
              <CardContent className="p-6 text-center">
                <h3 className="text-xl font-semibold mb-4">Ready to swipe?</h3>
                <p className="text-gray-600 mb-4">
                  Swipe through all the movies to help determine the group's favorites!
                </p>
                <Button
                  onClick={() => router.push(`/party/${slug}/swipe`)}
                  className="w-full"
                >
                  Start Swiping
                </Button>
              </CardContent>
            </Card>
          )}

          {party.status === 'swiping' && myMembership?.has_completed_swiping && (
            <Card className="mt-4">
              <CardContent className="p-6 text-center">
                <h3 className="text-xl font-semibold mb-4">All done! 🎉</h3>
                <p className="text-gray-600">
                  Waiting for other members to finish swiping...
                </p>
              </CardContent>
            </Card>
          )}

          {party.status === 'completed' && (
            <PartyResults partySlug={slug} />
          )}
        </>
      )}
    </div>
  );
}

