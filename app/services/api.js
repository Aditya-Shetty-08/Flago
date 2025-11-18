const API_KEY = "ac531d986cfac69e12c6077fbf41b089";
const BASE_URL = "https://api.themoviedb.org/3";

//Searching for movies

export const getPopularMovies = async () => {
  const response = await fetch(`${BASE_URL}/movie/popular?api_key=${API_KEY}`);
  const data = await response.json();
  return data.results;
};

export const searchMovies = async (query) => {
  const response = await fetch(
    `${BASE_URL}/search/movie?api_key=${API_KEY}&query=${encodeURIComponent(
      query
    )}`
  );
  const data = await response.json();
  return data.results;
};

export const getTopRatedMovies = async () => {
    const respone = await fetch(
        `${BASE_URL}/movie/top-rated?api_key=${API_KEY}`);
};