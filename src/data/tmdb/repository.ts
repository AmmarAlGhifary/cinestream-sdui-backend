import type { AxiosError } from 'axios';
import { TMDB_BASE_URL, getTmdbApiKey } from '../../config/tmdb';
import { AppError } from '../../errors/appError';
import { tmdbGet } from './client';
import type { TmdbMovie, TmdbMovieDetail, TmdbMoviePage } from './dtos';
import { requireMovieFields } from './validate';

export function endpoint(path: string): string {
    return `${TMDB_BASE_URL}${path}?api_key=${getTmdbApiKey()}`;
}

async function getMovies(url: string): Promise<TmdbMovie[]> {
    const response = await tmdbGet<TmdbMoviePage>(url);
    const results = response.data?.results;
    if (!Array.isArray(results)) {
        throw new AppError("UPSTREAM_ERROR", { detail: "TMDB response has no results array" });
    }
    return results;
}

/** For requests about one movie, where a TMDB 404 means the movie does not exist. */
export async function forMovie<T>(request: () => Promise<T>): Promise<T> {
    try {
        return await request();
    } catch (error) {
        if ((error as AxiosError).response?.status === 404) {
            throw new AppError("MOVIE_NOT_FOUND", { cause: error });
        }
        throw error;
    }
}

export function getTrending(): Promise<TmdbMovie[]> {
    return getMovies(endpoint('/trending/movie/week'));
}

export function getUpcoming(): Promise<TmdbMovie[]> {
    return getMovies(endpoint('/movie/upcoming'));
}

export async function getMovie(movieId: string): Promise<TmdbMovieDetail> {
    const response = await forMovie(() =>
        tmdbGet<TmdbMovieDetail>(endpoint(`/movie/${encodeURIComponent(movieId)}`)),
    );
    requireMovieFields([response.data], { rating: true });
    return response.data;
}

export function getSimilar(movieId: string): Promise<TmdbMovie[]> {
    return forMovie(() => getMovies(endpoint(`/movie/${encodeURIComponent(movieId)}/similar`)));
}

export function searchMovies(query: string): Promise<TmdbMovie[]> {
    const encoded = encodeURIComponent(query);
    return getMovies(`${TMDB_BASE_URL}/search/movie?query=${encoded}&api_key=${getTmdbApiKey()}`);
}
