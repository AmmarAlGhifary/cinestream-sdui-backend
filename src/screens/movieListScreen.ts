import type { TmdbMovie } from '../data/tmdb/dtos';
import { appBar, movieListItem, screen, verticalList } from '../sdui/builders';
import type { MovieListItem, Screen } from '../sdui/models';
import { displayTitle, posterUrl } from './shared';

function toListItem(movie: TmdbMovie): MovieListItem {
    return movieListItem(
        movie.id.toString(),
        posterUrl(movie.poster_path),
        displayTitle(movie),
        `${movie.vote_average.toFixed(1)} | ${movie.release_date}`,
    );
}

export function buildMovieListScreen(pageTitle: string, movies: TmdbMovie[]): Screen {
    return screen(
        "movie_list_screen",
        verticalList("movie_list", movies.map(toListItem)),
        appBar(pageTitle),
    );
}
