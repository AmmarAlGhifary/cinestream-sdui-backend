/** TMDB movie ids are positive integers. */
const MOVIE_ID = /^[1-9][0-9]{0,9}$/;

export type MovieIdParam =
    | { ok: true; movieId: string }
    | { ok: false; error: string };

/**
 * Validate the `movie_id` query value before it reaches a TMDB path.
 * An absent or empty value is "missing"; anything else that is not a single
 * positive integer, including a repeated parameter (an array), is "invalid".
 */
export function parseMovieId(value: string | string[] | undefined): MovieIdParam {
    if (!value) {
        return { ok: false, error: "Missing movie_id parameter" };
    }
    if (typeof value !== "string" || !MOVIE_ID.test(value)) {
        return { ok: false, error: "Invalid movie_id parameter" };
    }
    return { ok: true, movieId: value };
}
