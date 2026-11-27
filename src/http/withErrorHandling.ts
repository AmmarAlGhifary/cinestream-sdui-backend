import type { VercelRequest, VercelResponse } from '@vercel/node';
import { isMaintenanceMode } from '../config/maintenance';
import { AppError, ERROR_CATALOG } from '../errors/appError';
import { logger } from '../logging/logger';
import { redactApiKey } from '../logging/redact';
import { logRequest } from './logRequest';
import { ALLOWED_METHODS, sendError } from './sendError';
import { toAppError } from './toAppError';

interface HandlerOptions {
    /** Route name used in request logs. */
    route: string;
    /** Keep answering while maintenance mode is on. */
    availableDuringMaintenance?: boolean;
}

type Handle = (req: VercelRequest, res: VercelResponse) => unknown;

function logFailure(route: string, error: AppError) {
    const { status } = ERROR_CATALOG[error.code];
    const cause = (error.cause ?? error) as Partial<Error>;
    const data = {
        code: error.code,
        status,
        detail: error.message,
        cause: redactApiKey(String(cause.message ?? cause)),
    };

    if (status < 500) {
        logger.warn(`${route} failed`, data);
    } else {
        logger.error(`${route} failed`, { ...data, stack: cause.stack && redactApiKey(cause.stack) });
    }
}

/**
 * Wrap an endpoint with request logging, the method and maintenance checks,
 * and the shared error envelope for anything the handler throws.
 */
export function withErrorHandling(
    { route, availableDuringMaintenance = false }: HandlerOptions,
    handle: Handle,
) {
    return async function handler(req: VercelRequest, res: VercelResponse) {
        logRequest(route, req, res);
        try {
            if (!ALLOWED_METHODS.includes(req.method ?? "")) {
                throw new AppError("METHOD_NOT_ALLOWED", { detail: `Method ${req.method} is not allowed` });
            }
            if (!availableDuringMaintenance && isMaintenanceMode()) {
                throw new AppError("MAINTENANCE");
            }
            await handle(req, res);
        } catch (error) {
            const failure = toAppError(error);
            logFailure(route, failure);
            sendError(res, req, failure.code, { retryAfter: failure.retryAfter });
        }
    };
}
