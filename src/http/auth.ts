import type { VercelRequest } from '@vercel/node';
import { AppError } from '../errors/appError';

const BEARER = /^Bearer +(.*)$/i;

/** The session id from `Authorization: Bearer <session_id>`, if there is one. */
export function readSessionId(req: VercelRequest): string | undefined {
    return BEARER.exec(req.headers.authorization ?? "")?.[1].trim() || undefined;
}

export function requireSessionId(req: VercelRequest): string {
    const sessionId = readSessionId(req);
    if (sessionId === undefined) {
        throw new AppError("SIGN_IN_REQUIRED", { detail: "No session id in the Authorization header" });
    }
    return sessionId;
}
