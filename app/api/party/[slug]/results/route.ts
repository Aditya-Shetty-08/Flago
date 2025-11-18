import { NextRequest, NextResponse } from 'next/server';
import { getPartyBySlug } from '@/lib/party/party-service';
import { getPartyRankings } from '@/lib/party/movie-service';

/**
 * GET /api/party/[slug]/results - Get final rankings
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> | { slug: string } }
) {
  try {
    const resolvedParams = params instanceof Promise ? await params : params;
    const slug = resolvedParams.slug;
    const party = await getPartyBySlug(slug);
    const rankings = await getPartyRankings(party.id);
    return NextResponse.json({ rankings }, { status: 200 });
  } catch (error) {
    console.error('Error getting results:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get results' },
      { status: 400 }
    );
  }
}

