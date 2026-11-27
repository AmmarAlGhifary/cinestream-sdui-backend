import { createRequestToken, createSession, deleteSession, getAccount } from '../data/tmdb/accountRepository';
import { getAuthRedirectUrl } from '../config/auth';
import { TMDB_WEB_BASE_URL } from '../config/tmdb';
import { logger } from '../logging/logger';

/** TMDB writes timestamps as `2026-11-27 08:00:00 UTC`. */
const TMDB_TIMESTAMP = /^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2}) UTC$/;

/** The ISO 8601 form of a TMDB timestamp, or the value unchanged if it is not one. */
function toIsoTimestamp(value: string): string {
    const match = TMDB_TIMESTAMP.exec(value);
    if (match) {
        const iso = `${match[1]}T${match[2]}.000Z`;
        const time = Date.parse(iso);
        // The round trip rejects dates that would roll over, such as 30 February.
        if (!Number.isNaN(time) && new Date(time).toISOString() === iso) {
            return iso;
        }
    }
    logger.warn('Passing through an unreadable expires_at from TMDB', { expires_at: value });
    return value;
}

/** Start a sign-in: a request token and the page where the user approves it. */
export async function startSignIn() {
    const { request_token, expires_at } = await createRequestToken();
    const redirectTo = encodeURIComponent(getAuthRedirectUrl());

    logger.info('Created a sign-in request');
    return {
        request_token,
        expires_at: toIsoTimestamp(expires_at),
        approve_url: `${TMDB_WEB_BASE_URL}/authenticate/${encodeURIComponent(request_token)}?redirect_to=${redirectTo}`,
    };
}

/** Delete a session the client will never receive. Failing to is logged, not thrown. */
async function discardSession(sessionId: string): Promise<void> {
    try {
        await deleteSession(sessionId);
    } catch (error) {
        logger.warn('Could not delete the session of a failed sign-in', { message: (error as Error).message });
    }
}

async function getNewAccount(sessionId: string) {
    try {
        return await getAccount(sessionId, { signingIn: true });
    } catch (error) {
        await discardSession(sessionId);
        throw error;
    }
}

/** Finish a sign-in with an approved request token. The session is not stored. */
export async function signIn(requestToken: string) {
    const sessionId = await createSession(requestToken);
    const { id, username } = await getNewAccount(sessionId);

    logger.info('Signed in');
    return { session_id: sessionId, account: { id, username } };
}

export async function signOut(sessionId: string): Promise<void> {
    await deleteSession(sessionId);
    logger.info('Signed out');
}
