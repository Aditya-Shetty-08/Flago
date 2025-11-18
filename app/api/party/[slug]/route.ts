import { NextRequest, NextResponse } from 'next/server';
import { getPartyBySlug, storePartyMovies } from '@/lib/party/party-service';
import { generatePartyMovies } from '@/lib/party/movie-service';
import { updatePartyStatusAnonymous } from '@/lib/party/anonymous-service';

/**
 * GET /api/party/[slug] - Get party details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> | { slug: string } }
) {
  try {
    const resolvedParams = params instanceof Promise ? await params : params;
    const slug = resolvedParams.slug;
    
    console.log('[API] GET /api/party/[slug] - slug:', slug);
    const party = await getPartyBySlug(slug);
    return NextResponse.json({ party }, { status: 200 });
  } catch (error) {
    console.error('[API] Error getting party:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Party not found' },
      { status: 404 }
    );
  }
}

/**
 * PUT /api/party/[slug] - Update party (anonymous)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> | { slug: string } }
) {
  try {
    const resolvedParams = params instanceof Promise ? await params : params;
    const slug = resolvedParams.slug;
    
    console.log('[API] PUT /api/party/[slug] - slug:', slug);
    
    const body = await request.json();
    const { status, movies, userId } = body;
    
    console.log('[API] PUT request body:', { status, movies: movies ? 'provided' : 'not provided', userId });

    if (!slug) {
      return NextResponse.json(
        { error: 'Slug is required' },
        { status: 400 }
      );
    }

    const party = await getPartyBySlug(slug);
    console.log('[API] Party found:', party.id, 'created_by:', party.created_by);

    if (status) {
      console.log('[API] Updating party status to:', status);
      if (!userId) {
        console.error('[API] No userId provided for status update');
        return NextResponse.json(
          { error: 'User ID is required to update status' },
          { status: 400 }
        );
      }
      console.log('[API] Calling updatePartyStatusAnonymous with partyId:', party.id, 'userId:', userId, 'status:', status);
      const updated = await updatePartyStatusAnonymous(party.id, userId, status);
      console.log('[API] Party status updated successfully');
      return NextResponse.json({ party: updated }, { status: 200 });
    }

    if (movies) {
      // Only party creator can store movies (checked in storePartyMovies)
      if (!userId) {
        return NextResponse.json(
          { error: 'User ID is required' },
          { status: 400 }
        );
      }
      // Verify ownership before storing
      if (party.created_by !== userId) {
        return NextResponse.json(
          { error: 'Only party creator can store movies' },
          { status: 403 }
        );
      }
      const updated = await storePartyMovies(party.id, movies);
      return NextResponse.json({ party: updated }, { status: 200 });
    }

    return NextResponse.json(
      { error: 'No valid update fields provided' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error updating party:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update party' },
      { status: 400 }
    );
  }
}

