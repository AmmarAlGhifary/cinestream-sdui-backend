import type { VercelRequest, VercelResponse } from '@vercel/node';
import { logger } from '../logging/logger';

/**
 * Log the start of a request and, when the response finishes, its status,
 * duration and payload size. Call once at the top of a handler.
 */
export function logRequest(name: string, req: VercelRequest, res: VercelResponse) {
    const start = Date.now();
    logger.info(`--> ${req.method} ${name}`, { query: req.query });

    const originalJson = res.json.bind(res);
    res.json = (body: unknown) => {
        logger.info(`<-- ${name} ${res.statusCode}`, {
            ms: Date.now() - start,
            bytes: Buffer.byteLength(JSON.stringify(body)),
        });
        return originalJson(body);
    };
}

/** Answer 204. `res.json` is not called, so the response is logged here. */
export function sendNoContent(name: string, res: VercelResponse) {
    logger.info(`<-- ${name} 204`);
    res.status(204).end();
}
