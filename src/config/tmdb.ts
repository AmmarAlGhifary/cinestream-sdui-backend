/** The only place TMDB connection settings are defined. */
export const TMDB_API_KEY = "fa2c849fca1204cdc46abea78adbbb86";

export const TMDB_BASE_URL = "https://api.themoviedb.org/3";

export const TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p";

export const TMDB_IMAGE_SIZES = {
    poster: "w500",
    backdrop: "w780",
} as const;
