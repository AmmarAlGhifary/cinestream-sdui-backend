/**
 * The TMDB response fields this service reads. These describe what TMDB normally
 * sends; responses are not validated at runtime.
 */
export interface TmdbMovie {
    id: number;
    title: string;
    /** Used as a fallback when `title` is empty. */
    name?: string;
    overview: string;
    poster_path: string | null;
    backdrop_path: string | null;
    vote_average: number;
    release_date: string;
}

export interface TmdbMovieDetail extends TmdbMovie {
    runtime: number | null;
}

export interface TmdbMoviePage {
    results: TmdbMovie[];
}

export interface TmdbRequestToken {
    request_token: string;
    /** For example `2016-08-26 17:04:39 UTC`. */
    expires_at: string;
}

export interface TmdbSession {
    session_id: string;
}

export interface TmdbAccount {
    id: number;
    username: string;
}

export interface TmdbAccountStates {
    favorite: boolean;
}
