import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ERROR_CATALOG, type ErrorCode } from '../errors/appError';

export const ALLOWED_METHODS = ["GET", "HEAD"];

/** Write the error envelope, with its status and headers, for `code`. */
export function sendError(
    res: VercelResponse,
    req: VercelRequest,
    code: ErrorCode,
    { retryAfter }: { retryAfter?: number } = {},
) {
    const spec = ERROR_CATALOG[code];
    const requestId = req.headers["x-vercel-id"];
    const retrySeconds = retryAfter ?? spec.retryAfter;

    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    if (retrySeconds !== undefined) {
        res.setHeader("Retry-After", String(retrySeconds));
    }
    if (code === "METHOD_NOT_ALLOWED") {
        res.setHeader("Allow", ALLOWED_METHODS.join(", "));
    }

    return res.status(spec.status).json({
        error: {
            code,
            title: spec.title,
            message: spec.message,
            retryable: spec.retryable,
            ...(typeof requestId === "string" && requestId && { request_id: requestId }),
        },
    });
}
