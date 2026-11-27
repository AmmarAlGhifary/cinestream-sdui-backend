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
