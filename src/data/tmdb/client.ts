import axios, { type AxiosError } from 'axios';
import { TMDB_TIMEOUT_MS } from '../../config/tmdb';
import { logger } from '../../logging/logger';

export type TmdbMethod = 'GET' | 'POST' | 'DELETE';

/**
 * Call a TMDB URL, optionally with a JSON body, and log the method, endpoint,
 * status, duration and result count. Failures are logged with the upstream
 * status and body, then re-thrown. Request bodies are never logged, and the
 * logger redacts credentials from everything else.
 */
export async function tmdbRequest<T>(method: TmdbMethod, url: string, body?: object) {
    const start = Date.now();
    try {
        const response = await axios.request<T>({ method, url, data: body, timeout: TMDB_TIMEOUT_MS });
        const results = (response.data as { results?: unknown } | undefined)?.results;
        logger.info('TMDB request OK', {
            method,
            url,
            status: response.status,
            ms: Date.now() - start,
            results: Array.isArray(results) ? results.length : undefined,
        });
        return response;
    } catch (error) {
        const failure = error as AxiosError;
        logger.error('TMDB request FAILED', {
            method,
            url,
            status: failure.response?.status,
            ms: Date.now() - start,
            message: String(failure.message),
            body: failure.response?.data,
        });
        throw error;
    }
}

export function tmdbGet<T>(url: string) {
    return tmdbRequest<T>('GET', url);
}
