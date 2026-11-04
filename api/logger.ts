import axios from 'axios';
import type { VercelRequest, VercelResponse } from '@vercel/node';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

class Logger {
    private formatMessage(level: LogLevel, message: string, data?: any): string {
        const timestamp = new Date().toISOString();
        const dataStr = data ? ` | Data: ${JSON.stringify(data)}` : '';
        return `[${timestamp}] [${level.toUpperCase()}] ${message}${dataStr}`;
    }

    info(message: string, data?: any) {
        console.log(this.formatMessage('info', message, data));
    }

    warn(message: string, data?: any) {
        console.warn(this.formatMessage('warn', message, data));
    }

    error(message: string, data?: any) {
        console.error(this.formatMessage('error', message, data));
    }

    debug(message: string, data?: any) {
        console.debug(this.formatMessage('debug', message, data));
    }
}

export const logger = new Logger();

/** Remove the TMDB api_key from a URL so it never lands in logs. */
function redact(url: string): string {
    return url.replace(/([?&]api_key=)[^&]+/, '$1***');
}

/**
 * GET a TMDB URL and log endpoint, status, duration and result count.
 * Failures are logged with the upstream status and body, then re-thrown.
 */
export async function tmdbGet(url: string) {
    const safeUrl = redact(url);
    const start = Date.now();
    try {
        const response = await axios.get(url);
        const results = response.data?.results;
        logger.info('TMDB request OK', {
            url: safeUrl,
            status: response.status,
            ms: Date.now() - start,
            results: Array.isArray(results) ? results.length : undefined,
        });
        return response;
    } catch (error: any) {
        logger.error('TMDB request FAILED', {
            url: safeUrl,
            status: error.response?.status,
            ms: Date.now() - start,
            message: error.message,
            body: error.response?.data,
        });
        throw error;
    }
}

/**
 * Warn about movies whose image path is null. The image URLs are built as
 * `https://image.tmdb.org/t/p/<size><path>`, so a null path yields a broken URL.
 */
export function logMissingImages(label: string, movies: any[], fields: string[] = ['poster_path']) {
    for (const field of fields) {
        const missing = movies.filter((m) => !m?.[field]);
        if (missing.length > 0) {
            logger.warn(`${label}: ${missing.length}/${movies.length} movies have no ${field}`, {
                movies: missing.map((m) => ({ id: m?.id, title: m?.title || m?.name })),
            });
        }
    }
}

/**
 * Log the start of a request and, when the response finishes, its status,
 * duration and payload size. Call once at the top of a handler.
 */
export function logRequest(name: string, req: VercelRequest, res: VercelResponse) {
    const start = Date.now();
    logger.info(`--> ${req.method} ${name}`, { query: req.query });

    const originalJson = res.json.bind(res);
    res.json = (body: any) => {
        logger.info(`<-- ${name} ${res.statusCode}`, {
            ms: Date.now() - start,
            bytes: Buffer.byteLength(JSON.stringify(body)),
        });
        return originalJson(body);
    };
}
