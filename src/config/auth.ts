const DEFAULT_AUTH_REDIRECT_URL = "cinestream://auth/tmdb";

/**
 * Where TMDB sends the user after they approve a sign-in. It comes only from
 * configuration, never from a request, so it cannot be used as an open redirect.
 */
export function getAuthRedirectUrl(): string {
    return process.env.AUTH_REDIRECT_URL || DEFAULT_AUTH_REDIRECT_URL;
}
