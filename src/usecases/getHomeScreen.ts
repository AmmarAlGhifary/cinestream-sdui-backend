import { getTrending, getUpcoming } from '../data/tmdb/repository';
import { logger } from '../logging/logger';
import { logMissingImages } from '../logging/missingImages';
import { buildHomeScreen } from '../screens/homeScreen';
import { displayTitle } from '../screens/shared';
import type { Screen } from '../sdui/models';

const CAROUSEL_SIZE = 10;

/** Resolves to `null` when TMDB returns no trending movies. */
export async function getHomeScreen(): Promise<Screen | null> {
    const trendingMovies = await getTrending();
    const upcomingMovies = await getUpcoming();

    if (!trendingMovies || trendingMovies.length === 0) {
        logger.warn('No movies found from TMDB response');
        return null;
    }

    logMissingImages('home trending', trendingMovies, ['poster_path', 'backdrop_path']);
    logMissingImages('home upcoming', upcomingMovies);

    // The first trending movie is the hero, so the carousel starts after it.
    const hero = trendingMovies[0];
    const trending = trendingMovies.slice(1, CAROUSEL_SIZE + 1);
    const upcoming = upcomingMovies.slice(0, CAROUSEL_SIZE);

    const homeScreen = buildHomeScreen({ hero, trending, upcoming });

    logger.info('Successfully generated SDUI blueprint', {
        hero: displayTitle(hero),
        trending: trending.length,
        upcoming: upcoming.length,
    });
    return homeScreen;
}
