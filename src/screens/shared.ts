import { TMDB_IMAGE_BASE_URL, TMDB_IMAGE_SIZES } from '../config/tmdb';
import type { TmdbMovie } from '../data/tmdb/dtos';
import { apiPost, iconButton, movieCard } from '../sdui/builders';
import type { IconButton, MovieCard } from '../sdui/models';

export const APP_TITLE = "CineStream";

// A null or missing path is interpolated as-is, matching the existing contract.
export function posterUrl(path: string | null): string {
    return `${TMDB_IMAGE_BASE_URL}/${TMDB_IMAGE_SIZES.poster}${path}`;
}

export function backdropUrl(path: string | null): string {
    return `${TMDB_IMAGE_BASE_URL}/${TMDB_IMAGE_SIZES.backdrop}${path}`;
}

export function displayTitle(movie: TmdbMovie): string {
    return movie.title || movie.name!;
}

export function toMovieCard(movie: TmdbMovie): MovieCard {
    return movieCard(movie.id.toString(), posterUrl(movie.poster_path), displayTitle(movie));
}

/** The toolbar heart. Its action sets the opposite of the current state. */
export function favoriteButton(movieId: string, isFavorite: boolean): IconButton {
    return iconButton(
        isFavorite ? "favorite" : "favorite_border",
        apiPost("/api/favorite", { movie_id: movieId, favorite: !isFavorite }),
    );
}
