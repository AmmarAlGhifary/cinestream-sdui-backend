import axios, { type AxiosError } from 'axios';
import { TMDB_TIMEOUT_MS } from '../../config/tmdb';
import { logger } from '../../logging/logger';
import { redactApiKey } from '../../logging/redact';

/**
 * GET a TMDB URL and log endpoint, status, duration and result count.
 * Failures are logged with the upstream status and body, then re-thrown.
 */
export async function tmdbGet<T>(url: string) {
    const safeUrl = redactApiKey(url);
    const start = Date.now();
    try {
        const response = await axios.get<T>(url, { timeout: TMDB_TIMEOUT_MS });
        const results = (response.data as { results?: unknown } | undefined)?.results;
        logger.info('TMDB request OK', {
            url: safeUrl,
            status: response.status,
            ms: Date.now() - start,
            results: Array.isArray(results) ? results.length : undefined,
        });
        return response;
    } catch (error) {
        const failure = error as AxiosError;
        logger.error('TMDB request FAILED', {
            url: safeUrl,
            status: failure.response?.status,
            ms: Date.now() - start,
            message: redactApiKey(String(failure.message)),
            body: failure.response?.data,
        });
        throw error;
    }
}
