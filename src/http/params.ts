import { AppError } from '../errors/appError';

/** TMDB movie ids are positive integers. */
const MOVIE_ID = /^[1-9][0-9]{0,9}$/;

const MAX_QUERY_LENGTH = 200;

/**
 * Validate the `movie_id` query value before it reaches a TMDB path.
 * An absent or empty value is "missing"; anything else that is not a single
 * positive integer, including a repeated parameter (an array), is "invalid".
 */
export function parseMovieId(value: string | string[] | undefined): string {
    if (!value) {
        throw new AppError("MISSING_PARAMETER", { detail: "Missing movie_id parameter" });
    }
    if (typeof value !== "string" || !MOVIE_ID.test(value)) {
        throw new AppError("INVALID_PARAMETER", { detail: "Invalid movie_id parameter" });
    }
    return value;
}

/**
 * Validate the search `query` value. Resolves to `undefined` when there is
 * nothing to search for; the length limit counts characters (code points).
 */
export function parseSearchQuery(value: string | string[] | undefined): string | undefined {
    if (!value) {
        return undefined;
    }
    if (typeof value !== "string" || [...value].length > MAX_QUERY_LENGTH) {
        throw new AppError("INVALID_PARAMETER", { detail: "Invalid search query parameter" });
    }
    return value;
}
