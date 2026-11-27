/**
 * TMDB calls that sign a user in and act on their account. The session id is
 * sent only as TMDB documents it: the `session_id` query parameter, or the
 * request body when deleting the session.
 */
import type { AxiosError } from 'axios';
import { AppError, type ErrorCode } from '../../errors/appError';
import { tmdbGet, tmdbRequest } from './client';
import type {
    TmdbAccount,
    TmdbAccountStates,
    TmdbRequestToken,
    TmdbSession,
} from './dtos';
import { endpoint, forMovie } from './repository';

/**
 * TMDB `status_code`s that reject the user's session: 3 and 14 authentication
 * failed, 17 session denied, 37 session not found. A rejected API key (7, or 10
 * when suspended) is deliberately absent and stays `SERVICE_MISCONFIGURED`.
 */
const SESSION_REJECTED = [3, 14, 17, 37];

/**
 * TMDB `status_code`s that reject a request token: the codes above that apply,
 * 33 invalid or expired request token, 35 invalid token, 41 token not approved.
 */
const TOKEN_REJECTED = [3, 14, 17, 33, 35, 41];

/** Anything longer or with other characters cannot be a TMDB session id. */
const SESSION_ID = /^[A-Za-z0-9._-]{1,256}$/;

function tmdbStatusCode(error: unknown): unknown {
    return ((error as AxiosError).response?.data as { status_code?: unknown } | undefined)?.status_code;
}

/** Run `request`, turning the listed TMDB `status_code`s into `code`. */
async function rejecting<T>(statusCodes: number[], code: ErrorCode, request: () => Promise<T>): Promise<T> {
    try {
        return await request();
    } catch (error) {
        if (statusCodes.includes(tmdbStatusCode(error) as number)) {
            throw new AppError(code, { cause: error });
        }
        throw error;
    }
}

/** Run a request made with the user's session. */
async function asUser<T>(sessionId: string, request: (query: string) => Promise<T>): Promise<T> {
    if (!SESSION_ID.test(sessionId)) {
        throw new AppError("SESSION_EXPIRED", { detail: "The session id is malformed" });
    }
    const query = `&session_id=${encodeURIComponent(sessionId)}`;
    return rejecting(SESSION_REJECTED, "SESSION_EXPIRED", () => request(query));
}

function unexpected(what: string): AppError {
    return new AppError("UPSTREAM_ERROR", { detail: `TMDB returned an unexpected ${what} response` });
}

function isText(value: unknown): value is string {
    return typeof value === "string" && value !== "";
}

export async function createRequestToken(): Promise<TmdbRequestToken> {
    const { data } = await tmdbGet<TmdbRequestToken>(endpoint('/authentication/token/new'));
    if (!isText(data?.request_token) || !isText(data.expires_at)) {
        throw unexpected("request token");
    }
    return data;
}

/** Exchange a request token the user has approved for a session id. */
export async function createSession(requestToken: string): Promise<string> {
    const { data } = await rejecting(TOKEN_REJECTED, "SIGN_IN_FAILED", () =>
        tmdbRequest<TmdbSession>('POST', endpoint('/authentication/session/new'), {
            request_token: requestToken,
        }),
    );
    if (!isText(data?.session_id)) {
        throw unexpected("session");
    }
    return data.session_id;
}

export async function deleteSession(sessionId: string): Promise<void> {
    await asUser(sessionId, async () => {
        try {
            await tmdbRequest('DELETE', endpoint('/authentication/session'), { session_id: sessionId });
        } catch (error) {
            // The session is the only resource here, so a 404 means TMDB does not know it.
            if ((error as AxiosError).response?.status === 404) {
                throw new AppError("SESSION_EXPIRED", { cause: error });
            }
            throw error;
        }
    });
}

export async function getAccount(sessionId: string): Promise<TmdbAccount> {
    const { data } = await asUser(sessionId, (session) =>
        tmdbGet<TmdbAccount>(`${endpoint('/account')}${session}`),
    );
    if (typeof data?.id !== "number" || typeof data.username !== "string") {
        throw unexpected("account");
    }
    return data;
}

/** Whether the movie is in the user's favorites. */
export async function getFavoriteState(movieId: string, sessionId: string): Promise<boolean> {
    // A session rejection is recognised first, so it is never reported as a missing movie.
    const { data } = await forMovie(() =>
        asUser(sessionId, (session) =>
            tmdbGet<TmdbAccountStates>(
                `${endpoint(`/movie/${encodeURIComponent(movieId)}/account_states`)}${session}`,
            ),
        ),
    );
    if (typeof data?.favorite !== "boolean") {
        throw unexpected("account states");
    }
    return data.favorite;
}

export async function setFavorite(
    accountId: number,
    sessionId: string,
    movieId: string,
    favorite: boolean,
): Promise<void> {
    await forMovie(() =>
        asUser(sessionId, (session) =>
            tmdbRequest('POST', `${endpoint(`/account/${accountId}/favorite`)}${session}`, {
                media_type: "movie",
                media_id: Number(movieId),
                favorite,
            }),
        ),
    );
}
