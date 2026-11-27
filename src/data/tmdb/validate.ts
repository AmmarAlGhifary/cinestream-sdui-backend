import { AppError } from '../../errors/appError';
import type { TmdbMovie } from './dtos';

/**
 * Throw `UPSTREAM_ERROR` unless every movie has what its screen cannot be built
 * without: an `id`, plus a numeric `vote_average` when `rating` is set.
 * Check only the movies that are actually shown.
 */
export function requireMovieFields(movies: TmdbMovie[], { rating = false } = {}) {
    const usable = movies.every(
        (movie) => movie?.id != null && (!rating || typeof movie.vote_average === "number"),
    );
    if (!usable) {
        throw new AppError("UPSTREAM_ERROR", { detail: "TMDB returned a movie without the expected fields" });
    }
}
