/** The only place TMDB connection settings are defined. */
export const TMDB_BASE_URL = "https://api.themoviedb.org/3";

export const TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p";

export const TMDB_IMAGE_SIZES = {
    poster: "w500",
    backdrop: "w780",
} as const;

/**
 * Read when a request is built, not at import time, so a missing key surfaces
 * as a failed request that the endpoint can log and answer.
 */
export function getTmdbApiKey(): string {
    const apiKey = process.env.TMDB_API_KEY;
    if (!apiKey) {
        throw new Error("TMDB_API_KEY is not set");
    }
    return apiKey;
}
