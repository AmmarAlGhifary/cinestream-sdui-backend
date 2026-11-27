import { TMDB_BASE_URL, getTmdbApiKey } from '../../config/tmdb';
import { tmdbGet } from './client';
import type { TmdbMovie, TmdbMovieDetail, TmdbMoviePage } from './dtos';

/** A raw query-string value; repeated parameters arrive as an array. */
type QueryParam = string | string[];

function endpoint(path: string): string {
    return `${TMDB_BASE_URL}${path}?api_key=${getTmdbApiKey()}`;
}

async function getMovies(url: string): Promise<TmdbMovie[]> {
    const response = await tmdbGet<TmdbMoviePage>(url);
    return response.data.results;
}

export function getTrending(): Promise<TmdbMovie[]> {
    return getMovies(endpoint('/trending/movie/week'));
}

export function getUpcoming(): Promise<TmdbMovie[]> {
    return getMovies(endpoint('/movie/upcoming'));
}

export async function getMovie(movieId: QueryParam): Promise<TmdbMovieDetail> {
    const response = await tmdbGet<TmdbMovieDetail>(endpoint(`/movie/${movieId}`));
    return response.data;
}

export function getSimilar(movieId: QueryParam | undefined): Promise<TmdbMovie[]> {
    return getMovies(endpoint(`/movie/${movieId}/similar`));
}

export function searchMovies(query: QueryParam): Promise<TmdbMovie[]> {
    const encoded = encodeURIComponent(String(query));
    return getMovies(`${TMDB_BASE_URL}/search/movie?query=${encoded}&api_key=${getTmdbApiKey()}`);
}
