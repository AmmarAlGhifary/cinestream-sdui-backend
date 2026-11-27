import { getMovie, getSimilar } from '../data/tmdb/repository';
import { requireMovieFields } from '../data/tmdb/validate';
import { logger } from '../logging/logger';
import { logMissingImages } from '../logging/missingImages';
import { buildMovieDetailScreen } from '../screens/movieDetailScreen';
import type { Screen } from '../sdui/models';

const SIMILAR_LIMIT = 10;

export async function getMovieDetailScreen(movieId: string): Promise<Screen> {
    logger.info(`Fetching details for movie: ${movieId}`);

    const movie = await getMovie(movieId);
    const similarMovies = await getSimilar(movieId);

    logMissingImages(`detail ${movieId}`, [movie], ['poster_path', 'backdrop_path']);
    logMissingImages(`detail ${movieId} similar`, similarMovies);

    const similar = similarMovies.slice(0, SIMILAR_LIMIT);
    requireMovieFields(similar);

    const detailScreen = buildMovieDetailScreen(movieId, movie, similar);

    logger.info(`Successfully generated Detail blueprint for ${movieId}`);
    return detailScreen;
}
