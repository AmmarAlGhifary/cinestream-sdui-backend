import type { TmdbMovie } from '../data/tmdb/dtos';
import { getSimilar, getTrending, getUpcoming } from '../data/tmdb/repository';
import { requireMovieFields } from '../data/tmdb/validate';
import { logger } from '../logging/logger';
import { logMissingImages } from '../logging/missingImages';
import { buildMovieListScreen } from '../screens/movieListScreen';
import type { Screen } from '../sdui/models';

export type ListType = "trending" | "upcoming" | "similar";

interface ListSource {
    pageTitle: string;
    fetch: (movieId: string | undefined) => Promise<TmdbMovie[]>;
}

const LIST_SOURCES: Record<ListType, ListSource> = {
    trending: { pageTitle: "Trending Movies", fetch: () => getTrending() },
    upcoming: { pageTitle: "Upcoming Movies", fetch: () => getUpcoming() },
    similar: { pageTitle: "Similar Movies", fetch: fetchSimilar },
};

async function fetchSimilar(movieId: string | undefined): Promise<TmdbMovie[]> {
    if (movieId === undefined) {
        throw new Error('The "similar" list needs a movieId');
    }
    return getSimilar(movieId);
}

export function isListType(value: unknown): value is ListType {
    // Own keys only, so values such as "toString" are rejected.
    return typeof value === "string" && Object.hasOwn(LIST_SOURCES, value);
}

/** `movieId` is required by the "similar" list, already validated, and unused by the others. */
export async function getMovieListScreen(
    listType: ListType,
    movieId?: string,
): Promise<Screen> {
    const { pageTitle, fetch } = LIST_SOURCES[listType];
    const movies = await fetch(movieId);

    logMissingImages(`list ${listType}`, movies);

    requireMovieFields(movies, { rating: true });

    const listScreen = buildMovieListScreen(pageTitle, movies);

    logger.info(`Successfully generated List blueprint for ${listType}`, { items: movies.length });
    return listScreen;
}
