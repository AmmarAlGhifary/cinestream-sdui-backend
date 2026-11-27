import { AppError } from '../errors/appError';

const DEFAULT_AUTH_REDIRECT_URL = "cinestream://auth/tmdb";

/**
 * Where TMDB sends the user after they approve a sign-in. It comes only from
 * configuration, never from a request, so it cannot be used as an open redirect.
 */
export function getAuthRedirectUrl(): string {
    return process.env.AUTH_REDIRECT_URL || DEFAULT_AUTH_REDIRECT_URL;
}

/**
 * The key behind `sign_in_secret`. Read per request; without it sign-in fails
 * closed.
 */
export function getAuthSigningSecret(): string {
    const secret = process.env.AUTH_SIGNING_SECRET;
    if (!secret) {
        throw new AppError("SERVICE_MISCONFIGURED", { detail: "AUTH_SIGNING_SECRET is not set" });
    }
    return secret;
}
