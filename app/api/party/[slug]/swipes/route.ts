import { NextRequest, NextResponse } from 'next/server';
import { getPartyBySlug } from '@/lib/party/party-service';
import { getUserSwipes } from '@/lib/party/movie-service';
import { recordSwipeAnonymous } from '@/lib/party/anonymous-service';

/**
 * GET /api/party/[slug]/swipes - Get user's swipes (anonymous)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> | { slug: string } }
) {
  const resolvedParams = params instanceof Promise ? await params : params;
  const slug = resolvedParams.slug;
  
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    if (!slug) {
      return NextResponse.json(
        { error: 'Slug is required' },
        { status: 400 }
      );
    }

    const party = await getPartyBySlug(slug);
    
    // Get swipes for this user
    const { createClient } = await import('@/lib/supabase/server');
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('user_swipes')
      .select('*')
      .eq('party_id', party.id)
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Failed to get swipes: ${error.message}`);
    }

    return NextResponse.json({ swipes: data || [] }, { status: 200 });
  } catch (error) {
    console.error('Error getting swipes:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get swipes' },
      { status: 400 }
    );
  }
}

/**
 * POST /api/party/[slug]/swipes - Record a swipe (anonymous)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> | { slug: string } }
) {
  const resolvedParams = params instanceof Promise ? await params : params;
  const slug = resolvedParams.slug;
  try {
    const body = await request.json();
    const { movieId, direction, userId } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    if (!movieId || !direction) {
      return NextResponse.json(
        { error: 'movieId and direction are required' },
        { status: 400 }
      );
    }

    if (direction !== 'left' && direction !== 'right') {
      return NextResponse.json(
        { error: 'direction must be "left" or "right"' },
        { status: 400 }
      );
    }

    const party = await getPartyBySlug(slug);
    const swipe = await recordSwipeAnonymous(party.id, userId, movieId, direction);

    return NextResponse.json({ swipe }, { status: 201 });
  } catch (error) {
    console.error('Error recording swipe:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to record swipe' },
      { status: 400 }
    );
  }
}

