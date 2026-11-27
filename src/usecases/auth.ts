import { createRequestToken, createSession, deleteSession, getAccount } from '../data/tmdb/accountRepository';
import { getAuthRedirectUrl } from '../config/auth';
import { TMDB_WEB_BASE_URL } from '../config/tmdb';
import { logger } from '../logging/logger';

/** Start a sign-in: a request token and the page where the user approves it. */
export async function startSignIn() {
    const { request_token, expires_at } = await createRequestToken();
    const redirectTo = encodeURIComponent(getAuthRedirectUrl());

    logger.info('Created a sign-in request');
    return {
        request_token,
        expires_at,
        approve_url: `${TMDB_WEB_BASE_URL}/authenticate/${encodeURIComponent(request_token)}?redirect_to=${redirectTo}`,
    };
}

/** Finish a sign-in with an approved request token. The session is not stored. */
export async function signIn(requestToken: string) {
    const sessionId = await createSession(requestToken);
    const { id, username } = await getAccount(sessionId);

    logger.info('Signed in');
    return { session_id: sessionId, account: { id, username } };
}

export async function signOut(sessionId: string): Promise<void> {
    await deleteSession(sessionId);
    logger.info('Signed out');
}
