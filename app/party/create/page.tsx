"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { getUserId } from '@/lib/party/session';

export default function CreatePartyPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    // Get user ID on mount
    getUserId().then((id) => {
      console.log('[CREATE PARTY] User ID loaded:', id);
      setUserId(id);
    });
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!userId) {
      setError('Loading session...');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('[CREATE PARTY] Creating party with userId:', userId, 'name:', name);
      const response = await fetch('/api/party', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name || undefined,
          userId,
        }),
      });

      console.log('[CREATE PARTY] Response status:', response.status);
      if (!response.ok) {
        const data = await response.json();
        console.error('[CREATE PARTY] Error response:', data);
        throw new Error(data.error || 'Failed to create party');
      }

      const { party } = await response.json();
      console.log('[CREATE PARTY] Party created successfully:', party);
      console.log('[CREATE PARTY] Redirecting to:', `/party/${party.slug}`);
      router.push(`/party/${party.slug}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create party');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-md h-screen flex items-center justify-center">
      <Card className="border-none">
        <CardHeader>
          <CardTitle className="text-6xl md:text-7xl lg:text-8xl font-bold">Who's watching?</CardTitle>
          <CardDescription>
            Start a new movie party and invite your friends!
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Party Name (Optional)</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Wong Kar Wai Night"
              />
            </div>

            {error && (
              <div className="text-red-600 text-sm">{error}</div>
            )}

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? (
                <>
                  <Spinner size="sm" />
                  Creating...
                </>
              ) : (
                'Create Party'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

