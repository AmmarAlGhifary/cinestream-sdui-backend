import { getFavoriteState } from '../data/tmdb/accountRepository';
import { getMovie, getSimilar } from '../data/tmdb/repository';
import { requireMovieFields } from '../data/tmdb/validate';
import { AppError } from '../errors/appError';
import { logger } from '../logging/logger';
import { logMissingImages } from '../logging/missingImages';
import { buildMovieDetailScreen } from '../screens/movieDetailScreen';
import type { Screen } from '../sdui/models';

const SIMILAR_LIMIT = 10;

export interface MovieDetailResult {
    screen: Screen;
    /** A session was sent and TMDB rejected it, so the screen is the signed-out one. */
    sessionInvalid: boolean;
}

/** A rejected session never fails the screen; other failures do. */
async function favoriteState(movieId: string, sessionId: string | undefined) {
    if (sessionId === undefined) {
        return { isFavorite: false, sessionInvalid: false };
    }
    try {
        return { isFavorite: await getFavoriteState(movieId, sessionId), sessionInvalid: false };
    } catch (error) {
        if (error instanceof AppError && error.code === "SESSION_EXPIRED") {
            logger.warn(`Invalid session on detail ${movieId}, rendering signed out`);
            return { isFavorite: false, sessionInvalid: true };
        }
        throw error;
    }
}

export async function getMovieDetailScreen(movieId: string, sessionId?: string): Promise<MovieDetailResult> {
    logger.info(`Fetching details for movie: ${movieId}`);

    const movie = await getMovie(movieId);
    const similarMovies = await getSimilar(movieId);

    logMissingImages(`detail ${movieId}`, [movie], ['poster_path', 'backdrop_path']);
    logMissingImages(`detail ${movieId} similar`, similarMovies);

    const similar = similarMovies.slice(0, SIMILAR_LIMIT);
    requireMovieFields(similar);

    const { isFavorite, sessionInvalid } = await favoriteState(movieId, sessionId);

    const detailScreen = buildMovieDetailScreen(movieId, movie, similar, isFavorite);

    logger.info(`Successfully generated Detail blueprint for ${movieId}`);
    return { screen: detailScreen, sessionInvalid };
}
