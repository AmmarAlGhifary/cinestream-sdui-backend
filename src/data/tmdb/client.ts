import axios, { type AxiosError } from 'axios';
import { logger } from '../../logging/logger';

/** Remove the TMDB api_key from a URL so it never lands in logs. */
function redact(url: string): string {
    return url.replace(/([?&]api_key=)[^&]+/, '$1***');
}

/**
 * GET a TMDB URL and log endpoint, status, duration and result count.
 * Failures are logged with the upstream status and body, then re-thrown.
 */
export async function tmdbGet<T>(url: string) {
    const safeUrl = redact(url);
    const start = Date.now();
    try {
        const response = await axios.get<T>(url);
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
            message: failure.message,
            body: failure.response?.data,
        });
        throw error;
    }
}
