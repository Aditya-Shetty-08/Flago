import { NextRequest, NextResponse } from 'next/server';
import { getPartyBySlug } from '@/lib/party/party-service';
import { createPartyWithUserId } from '@/lib/party/anonymous-service';
import { getUserId } from '@/lib/party/session';

/**
 * POST /api/party - Create a new party (anonymous)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, max_members, min_members, userId } = body;

    // userId should come from client (via session)
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const party = await createPartyWithUserId(userId, name);

    return NextResponse.json({ party }, { status: 201 });
  } catch (error) {
    console.error('Error creating party:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create party' },
      { status: 400 }
    );
  }
}

/**
 * GET /api/party?slug=xxx - Get party by slug
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');

    if (!slug) {
      return NextResponse.json(
        { error: 'Slug parameter is required' },
        { status: 400 }
      );
    }

    const party = await getPartyBySlug(slug);
    return NextResponse.json({ party }, { status: 200 });
  } catch (error) {
    console.error('Error getting party:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get party' },
      { status: 404 }
    );
  }
}

