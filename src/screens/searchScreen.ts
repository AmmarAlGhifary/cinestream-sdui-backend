import type { TmdbMovie } from '../data/tmdb/dtos';
import { column, movieListItem, screen, verticalList } from '../sdui/builders';
import type { MovieListItem, Screen } from '../sdui/models';
import { displayTitle, posterUrl } from './shared';

const NO_POSTER_URL = "https://via.placeholder.com/100x150?text=No+Image";

// Search results differ from list screens in poster fallback and subtitle format.
function toSearchResult(movie: TmdbMovie): MovieListItem {
    return movieListItem(
        movie.id.toString(),
        movie.poster_path ? posterUrl(movie.poster_path) : NO_POSTER_URL,
        displayTitle(movie),
        `⭐ ${movie.vote_average?.toFixed(1) || "N/A"} | 📅 ${movie.release_date || "Unknown"}`,
    );
}

/** Shown before the user has typed a query. */
export function buildEmptySearchScreen(): Screen {
    return screen("search_screen", column([]));
}

export function buildSearchScreen(movies: TmdbMovie[]): Screen {
    return screen("search_screen", verticalList("search_results", movies.map(toSearchResult)));
}
