import { searchMovies } from '../data/tmdb/repository';
import { requireMovieFields } from '../data/tmdb/validate';
import { logger } from '../logging/logger';
import { logMissingImages } from '../logging/missingImages';
import { buildEmptySearchScreen, buildSearchScreen } from '../screens/searchScreen';
import type { Screen } from '../sdui/models';

export async function getSearchScreen(query: string | undefined): Promise<Screen> {
    if (!query) {
        return buildEmptySearchScreen();
    }

    const movies = await searchMovies(query);

    logMissingImages(`search "${query}"`, movies);

    requireMovieFields(movies);

    const searchScreen = buildSearchScreen(movies);

    logger.info('Successfully generated Search blueprint', { query, items: movies.length });
    return searchScreen;
}
