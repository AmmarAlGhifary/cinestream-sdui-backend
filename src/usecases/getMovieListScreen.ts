import type { TmdbMovie } from '../data/tmdb/dtos';
import { getSimilar, getTrending, getUpcoming } from '../data/tmdb/repository';
import { logger } from '../logging/logger';
import { logMissingImages } from '../logging/missingImages';
import { buildMovieListScreen } from '../screens/movieListScreen';
import type { Screen } from '../sdui/models';

export type ListType = "trending" | "upcoming" | "similar";

interface ListSource {
    pageTitle: string;
    fetch: (movieId: string | string[] | undefined) => Promise<TmdbMovie[]>;
}

const LIST_SOURCES: Record<ListType, ListSource> = {
    trending: { pageTitle: "Trending Movies", fetch: () => getTrending() },
    upcoming: { pageTitle: "Upcoming Movies", fetch: () => getUpcoming() },
    similar: { pageTitle: "Similar Movies", fetch: (movieId) => getSimilar(movieId) },
};

export function isListType(value: unknown): value is ListType {
    // Own keys only, so values such as "toString" are rejected.
    return typeof value === "string" && Object.hasOwn(LIST_SOURCES, value);
}

/** `movieId` is only used by the "similar" list and is not validated. */
export async function getMovieListScreen(
    listType: ListType,
    movieId: string | string[] | undefined,
): Promise<Screen> {
    const { pageTitle, fetch } = LIST_SOURCES[listType];
    const movies = await fetch(movieId);

    logMissingImages(`list ${listType}`, movies);

    const listScreen = buildMovieListScreen(pageTitle, movies);

    logger.info(`Successfully generated List blueprint for ${listType}`, { items: movies.length });
    return listScreen;
}
