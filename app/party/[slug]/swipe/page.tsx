"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PartyTinderCards } from '@/components/party/party-tinder-cards';
import { Card, CardContent } from '@/components/ui/card';

export default function SwipePage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Verify user is a member before allowing swiping
    const checkMembership = async () => {
      try {
        const { getUserId } = await import('@/lib/party/session');
        const userId = await getUserId();
        
        const membershipRes = await fetch(`/api/party/${slug}/members/me?userId=${encodeURIComponent(userId)}`);
        
        if (!membershipRes.ok) {
          throw new Error('You must be a member to swipe');
        }

        const { membership } = await membershipRes.json();
        if (!membership) {
          throw new Error('You must be a member to swipe');
        }

        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load swipe page');
        setLoading(false);
      }
    };

    if (slug) {
      checkMembership();
    }
  }, [slug]);

  const handleComplete = () => {
    // Redirect back to party page
    router.push(`/party/${slug}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card>
          <CardContent className="p-8 text-center">
            <p>Loading...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card>
          <CardContent className="p-8 text-center text-red-600">
            <p>{error}</p>
            <button
              onClick={() => router.push(`/party/${slug}`)}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Back to Party
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <PartyTinderCards partySlug={slug} onComplete={handleComplete} />
    </div>
  );
}

