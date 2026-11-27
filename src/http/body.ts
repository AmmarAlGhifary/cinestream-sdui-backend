import type { VercelRequest } from '@vercel/node';
import { AppError } from '../errors/appError';

/**
 * The request body as a JSON object. The parse error is deliberately dropped: it
 * can quote the body, which may hold a request token.
 */
export function readJsonBody(req: VercelRequest): Record<string, unknown> {
    let body: unknown;
    try {
        // Vercel parses lazily, so reading `req.body` can throw.
        body = req.body;
        if (typeof body === "string") {
            body = JSON.parse(body);
        }
    } catch {
        throw new AppError("INVALID_PARAMETER", { detail: "Malformed JSON body" });
    }
    if (typeof body !== "object" || body === null || Array.isArray(body)) {
        throw new AppError("INVALID_PARAMETER", { detail: "The body is not a JSON object" });
    }
    return body as Record<string, unknown>;
}
