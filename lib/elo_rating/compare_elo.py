from typing import TypedDict, List
newList = [];

class MovieObject(TypedDict):
    title: str
    elo: int

def calculateTotalElo(movieList: List[List[MovieObject]], movieName: str) -> int:
    totalElo = 0
    # traversing through a 2D array
    for x in movieList:
        for y in x:
            if y.title == movieName:
                totalElo += y.elo;

    return totalElo;

def checkAll(movieList):
    for i in range(len(movieList[0])):
        newElo = calculateTotalElo(movieList, movieList[0][i].title)
        movieObj = MovieObject(title=movieList[0][i].title, elo=newElo)
        newList.append(movieObj)
    return newList
