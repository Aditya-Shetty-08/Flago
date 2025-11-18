import { NextRequest, NextResponse } from 'next/server';
import { getPartyBySlug } from '@/lib/party/party-service';
import { getMyMembershipAnonymous } from '@/lib/party/anonymous-service';

/**
 * GET /api/party/[slug]/members/me - Get current user's membership (anonymous)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> | { slug: string } }
) {
  try {
    // Handle both Next.js 15+ (Promise) and older versions
    const resolvedParams = params instanceof Promise ? await params : params;
    const slug = resolvedParams.slug;
    
    if (!slug) {
      console.error('[API] No slug in params:', resolvedParams);
      return NextResponse.json(
        { error: 'Slug is required' },
        { status: 400 }
      );
    }
    
    console.log('[API] GET /api/party/[slug]/members/me - slug:', slug);
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    console.log('[API] userId from query:', userId);

    if (!userId) {
      console.error('[API] No userId provided');
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    console.log('[API] Getting party by slug:', slug);
    const party = await getPartyBySlug(slug);
    console.log('[API] Party found:', party.id, 'created_by:', party.created_by);
    
    console.log('[API] Getting membership for partyId:', party.id, 'userId:', userId);
    const membership = await getMyMembershipAnonymous(party.id, userId);
    console.log('[API] Membership result:', membership);
    
    return NextResponse.json({ membership }, { status: 200 });
  } catch (error) {
    console.error('[API] Error getting membership:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to get membership';
    console.error('[API] Error message:', errorMessage);
    return NextResponse.json(
      { error: errorMessage },
      { status: 400 }
    );
  }
}

