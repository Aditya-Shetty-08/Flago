import { NextRequest, NextResponse } from 'next/server';
import { getPartyBySlug } from '@/lib/party/party-service';
import { getPartyMovies, generatePartyMovies } from '@/lib/party/movie-service';

/**
 * GET /api/party/[slug]/movies - Get party movies
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> | { slug: string } }
) {
  try {
    const resolvedParams = params instanceof Promise ? await params : params;
    const slug = resolvedParams.slug;
    
    console.log('[API] GET /api/party/[slug]/movies - slug:', slug);
    const party = await getPartyBySlug(slug);
    const movies = await getPartyMovies(party.id);
    return NextResponse.json({ movies }, { status: 200 });
  } catch (error) {
    console.error('[API] Error getting movies:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get movies' },
      { status: 400 }
    );
  }
}

/**
 * POST /api/party/[slug]/movies - Generate movies for party (anonymous)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> | { slug: string } }
) {
  try {
    const resolvedParams = params instanceof Promise ? await params : params;
    const slug = resolvedParams.slug;
    
    console.log('[API] POST /api/party/[slug]/movies - slug:', slug);
    
    const body = await request.json();
    const { userId } = body;
    
    console.log('[API] POST movies - userId:', userId);

    if (!userId) {
      console.error('[API] No userId provided');
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    if (!slug) {
      console.error('[API] No slug in params');
      return NextResponse.json(
        { error: 'Slug is required' },
        { status: 400 }
      );
    }

    console.log('[API] Getting party by slug:', slug);
    const party = await getPartyBySlug(slug);
    console.log('[API] Party found:', party.id, 'created_by:', party.created_by);
    
    // Verify user is the creator
    if (party.created_by !== userId) {
      console.error('[API] User is not the creator!', 'created_by:', party.created_by, 'userId:', userId);
      return NextResponse.json(
        { error: 'Only party creator can generate movies' },
        { status: 403 }
      );
    }
    
    console.log('[API] Generating movies for party:', party.id);
    // Generate movies (pass userId for anonymous storage)
    const movies = await generatePartyMovies(party.id, userId);
    console.log('[API] Movies generated:', movies.length);
    
    // Update party status to 'swiping'
    console.log('[API] Updating party status to swiping');
    const { updatePartyStatusAnonymous } = await import('@/lib/party/anonymous-service');
    await updatePartyStatusAnonymous(party.id, userId, 'swiping');
    console.log('[API] Party status updated to swiping');

    return NextResponse.json({ movies }, { status: 200 });
  } catch (error) {
    console.error('[API] Error generating movies:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate movies';
    console.error('[API] Error message:', errorMessage);
    return NextResponse.json(
      { error: errorMessage },
      { status: 400 }
    );
  }
}

