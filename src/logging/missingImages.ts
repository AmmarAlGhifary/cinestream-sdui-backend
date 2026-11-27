import type { TmdbMovie } from '../data/tmdb/dtos';
import { logger } from './logger';

type ImageField = 'poster_path' | 'backdrop_path';

/**
 * Warn about movies whose image path is null. The image URLs are built as
 * `<image base>/<size><path>`, so a null path yields a broken URL.
 */
export function logMissingImages(label: string, movies: TmdbMovie[], fields: ImageField[] = ['poster_path']) {
    for (const field of fields) {
        const missing = movies.filter((m) => !m?.[field]);
        if (missing.length > 0) {
            logger.warn(`${label}: ${missing.length}/${movies.length} movies have no ${field}`, {
                movies: missing.map((m) => ({ id: m?.id, title: m?.title || m?.name })),
            });
        }
    }
}
