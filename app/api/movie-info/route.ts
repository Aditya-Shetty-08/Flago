import { NextRequest, NextResponse } from 'next/server';
import { getMovieInfo } from '@/lib/getMovieInfo';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { names, name } = body as { names?: string[]; name?: string };

    if ((!names || !Array.isArray(names)) && (typeof name !== 'string' || !name)) {
      return NextResponse.json(
        { error: 'Provide "names": string[] or "name": string in the request body.' },
        { status: 400 }
      );
    }

    // Support both single and multiple names
    if (Array.isArray(names)) {
      const movies = await getMovieInfo(names);
      return NextResponse.json({ movies });
    } else {
      const movie = await getMovieInfo(name!);
      return NextResponse.json({ movie });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


