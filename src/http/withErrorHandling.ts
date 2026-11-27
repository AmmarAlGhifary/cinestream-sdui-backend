import type { VercelRequest, VercelResponse } from '@vercel/node';
import { logger } from '../logging/logger';
import { logRequest } from './logRequest';

interface HandlerOptions {
    /** Route name used in request logs. */
    route: string;
    /** Log line written when the handler throws. */
    errorLog: string;
    /** `error` text of the 500 response. */
    errorMessage: string;
}

type Handle = (req: VercelRequest, res: VercelResponse) => Promise<unknown>;

/** Wrap an endpoint with request logging and a shared error-to-500 response. */
export function withErrorHandling({ route, errorLog, errorMessage }: HandlerOptions, handle: Handle) {
    return async function handler(req: VercelRequest, res: VercelResponse) {
        logRequest(route, req, res);
        try {
            await handle(req, res);
        } catch (error) {
            const { message, stack } = error as Error;
            logger.error(errorLog, { message, stack });
            res.status(500).json({ error: errorMessage });
        }
    };
}
