import { TMDB_IMAGE_BASE_URL, TMDB_IMAGE_SIZES } from '../config/tmdb';
import type { TmdbMovie } from '../data/tmdb/dtos';
import { movieCard } from '../sdui/builders';
import type { MovieCard } from '../sdui/models';

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
