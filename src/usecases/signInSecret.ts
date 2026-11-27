/**
 * Binds the session exchange to the client that started the sign-in: another app
 * that catches the redirect gets the request token but not its secret. Nothing is
 * stored, because the secret is recomputed from the token.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';
import { getAuthSigningSecret } from '../config/auth';
import { AppError } from '../errors/appError';

/** HMAC-SHA256 of the request token, as unpadded base64url. */
export function signInSecretFor(requestToken: string, key = getAuthSigningSecret()): string {
    return createHmac('sha256', key).update(requestToken).digest('base64url');
}

/** Throw `SIGN_IN_FAILED` unless `signInSecret` was issued for `requestToken`. */
export function verifySignInSecret(requestToken: string, signInSecret: string): void {
    const expected = Buffer.from(signInSecretFor(requestToken));
    const received = Buffer.from(signInSecret);
    // `timingSafeEqual` throws on different lengths; the length is not secret.
    if (received.length !== expected.length || !timingSafeEqual(received, expected)) {
        throw new AppError("SIGN_IN_FAILED", { detail: "The sign-in secret does not match the request token" });
    }
}
