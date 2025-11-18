import { NextResponse } from "next/server";
import { getMovies, userInputSchema } from "@/lib/getMovies";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Validate the input
    const validatedInput = userInputSchema.parse(body);
    
    // Get movies
    const movies = await getMovies(validatedInput);
    
    return NextResponse.json({ movies }, { status: 200 });
  } catch (error) {
    console.error("Error in /api/movies:", error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: "Failed to fetch movies" },
      { status: 500 }
    );
  }
}

