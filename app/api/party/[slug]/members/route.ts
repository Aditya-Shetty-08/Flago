import { NextRequest, NextResponse } from 'next/server';
import { getPartyBySlug } from '@/lib/party/party-service';
import { getPartyMembers } from '@/lib/party/member-service';
import { 
  joinPartyAnonymous, 
  submitPreferencesAnonymous,
  getMyMembershipAnonymous 
} from '@/lib/party/anonymous-service';

/**
 * GET /api/party/[slug]/members - Get all party members
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> | { slug: string } }
) {
  try {
    // Handle both Next.js 15+ (Promise) and older versions
    const resolvedParams = params instanceof Promise ? await params : params;
    const slug = resolvedParams.slug;
    
    console.log('[API] GET /api/party/[slug]/members - slug:', slug);
    
    if (!slug) {
      return NextResponse.json(
        { error: 'Slug is required' },
        { status: 400 }
      );
    }
    
    const party = await getPartyBySlug(slug);
    console.log('[API] Party found, getting members for partyId:', party.id);
    const members = await getPartyMembers(party.id);
    console.log('[API] Members found:', members.length);
    return NextResponse.json({ members }, { status: 200 });
  } catch (error) {
    console.error('[API] Error getting members:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get members' },
      { status: 400 }
    );
  }
}

/**
 * POST /api/party/[slug]/members - Join party or submit preferences (anonymous)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> | { slug: string } }
) {
  try {
    // Handle both Next.js 15+ (Promise) and older versions
    const resolvedParams = params instanceof Promise ? await params : params;
    const slug = resolvedParams.slug;
    
    console.log('[API] POST /api/party/[slug]/members - slug:', slug);
    
    const body = await request.json();
    const { action, preferences, spotifyUrls, userId } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    if (action === 'join') {
      const member = await joinPartyAnonymous(slug, userId);
      return NextResponse.json({ member }, { status: 200 });
    }

    if (action === 'submit-preferences') {
      if (!preferences) {
        return NextResponse.json(
          { error: 'Preferences are required' },
          { status: 400 }
        );
      }

      const party = await getPartyBySlug(slug);
      const member = await submitPreferencesAnonymous(
        party.id,
        userId,
        preferences,
        spotifyUrls
      );

      return NextResponse.json({ member }, { status: 200 });
    }

    return NextResponse.json(
      { error: 'Invalid action. Use "join" or "submit-preferences"' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error in members route:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process request' },
      { status: 400 }
    );
  }
}

