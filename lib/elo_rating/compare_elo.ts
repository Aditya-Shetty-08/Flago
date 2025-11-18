// Define the shape of the movie object
export type MovieObject = {
    title: string;
    elo: number;
  };
  
  /**
   * Calculates the sum of ELOs for a specific movie name across a 2D list of movies.
   * @param movieList - A 2D array (List of Lists) of MovieObjects
   * @param movieName - The title of the movie to search for
   * @returns The total ELO sum
   */
  function calculateTotalElo(movieList: MovieObject[][], movieName: string): number {
    let totalElo = 0;
  
    // Traversing through the 2D array (equivalent to 'for x in movieList')
    for (const row of movieList) {
      // Equivalent to 'for y in x'
      for (const movie of row) {
        if (movie.title === movieName) {
          totalElo += movie.elo;
        }
      }
    }
  
    return totalElo;
  }
  
  /**
   * Iterates through the first list in the 2D array, calculates totals for those movies,
   * and returns a new list of aggregated MovieObjects.
   * @param movieList - A 2D array of MovieObjects
   * @returns A list of MovieObjects with aggregated ELOs
   */
  export function checkAll(movieList: MovieObject[][]): MovieObject[] {
    // Initialize the list that will store the results (reset on each call)
    const newList: MovieObject[] = [];
    
    // Guard clause to prevent errors if list is empty
    if (movieList.length === 0 || movieList[0].length === 0) {
      return [];
    }
  
    // Iterate through the range of the first sub-list (movieList[0])
    for (let i = 0; i < movieList[0].length; i++) {
      const currentTitle = movieList[0][i].title;
      
      // Calculate the new total ELO
      const newElo = calculateTotalElo(movieList, currentTitle);
  
      // Create the new object
      const movieObj: MovieObject = {
        title: currentTitle,
        elo: newElo
      };
  
      // Append to the list
      newList.push(movieObj);
    }
  
    return newList;
  }