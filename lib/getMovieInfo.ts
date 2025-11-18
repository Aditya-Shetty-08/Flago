/* eslint-disable @typescript-eslint/no-explicit-any */

export interface MovieBasicInfo {
    title: string;
    poster: string | null;
    genres: string[];
    production: string[];
    directors: string[];
    description: string;
    rating: number | null;
}

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';

function getTmdbApiKey(): string {
    const key = process.env.TMDB_API_KEY;
    if (!key) {
        throw new Error('TMDB_API_KEY is not set');
    }
    return key;
}

async function fetchJson(url: string): Promise<any> {
    const res = await fetch(url, { next: { revalidate: 60 } });
    if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`TMDB request failed: ${res.status} ${res.statusText} ${text}`);
    }
    return res.json();
}

async function fetchSingleMovieInfo(name: string): Promise<MovieBasicInfo | null> {
    const apiKey = getTmdbApiKey();
    const searchUrl = `${TMDB_BASE_URL}/search/movie?api_key=${apiKey}&query=${encodeURIComponent(
        name
    )}&language=en-US&include_adult=false&page=1`;

    const searchData = await fetchJson(searchUrl);
    const first = Array.isArray(searchData?.results) ? searchData.results[0] : undefined;
    if (!first) {
        return null;
    }

    const movieId = first.id;
    const detailsUrl = `${TMDB_BASE_URL}/movie/${movieId}?api_key=${apiKey}&language=en-US&append_to_response=credits`;
    const details = await fetchJson(detailsUrl);

    const title: string = details?.title ?? first?.title ?? name;
    const posterPath: string | null = details?.poster_path ?? first?.poster_path ?? null;
    const poster: string | null = posterPath ? `${TMDB_IMAGE_BASE}${posterPath}` : null;
    const genres: string[] = Array.isArray(details?.genres)
        ? details.genres.map((g: any) => String(g?.name)).filter(Boolean)
        : [];
    const production: string[] = Array.isArray(details?.production_companies)
        ? details.production_companies.map((c: any) => String(c?.name)).filter(Boolean)
        : [];
    const directors: string[] = Array.isArray(details?.credits?.crew)
        ? details.credits.crew
            .filter((c: any) => c?.job === 'Director')
            .map((c: any) => String(c?.name))
            .filter(Boolean)
        : [];
    const description: string = details?.overview ?? '';
    const rating: number | null = typeof details?.vote_average === 'number' ? details.vote_average : null;

    return {
        title,
        poster,
        genres,
        production,
        directors,
        description,
        rating,
    };
}

export async function getMovieInfo(names: string[] | string): Promise<MovieBasicInfo[] | MovieBasicInfo | null> {
    if (Array.isArray(names)) {
        if (names.length === 0) return [];
        const results = await Promise.all(
            names.map(async (n) => {
                try {
                    return await fetchSingleMovieInfo(n);
                } catch {
                    return null;
                }
            })
        );
        return results.filter((r): r is MovieBasicInfo => r !== null);
    } else {
        try {
            return await fetchSingleMovieInfo(names);
        } catch {
            return null;
        }
    }
}


(async () => {
    const examples = ['Inception', 'Interstellar'];
    const results = await getMovieInfo(examples);
    console.log(JSON.stringify(results, null, 2));
})().catch((err) => {
    console.error('getMovieInfo test failed:', err);
    process.exit?.(1);
});


