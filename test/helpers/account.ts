/** Fake credentials: distinctive, so a leak is easy to search for. */
export const SESSION = 'fakesession0123456789abcdef0123456789abcd';
export const TOKEN = 'faketoken0123456789abcdef0123456789abcdef';

export const SIGNED_IN = { authorization: `Bearer ${SESSION}` };

export const account = { id: 548, username: 'answerfan', name: 'Not forwarded', include_adult: false };

export const requestToken = { success: true, expires_at: '2026-11-27 15:00:00 UTC', request_token: TOKEN };

export const newSession = { success: true, session_id: SESSION };

/** Set with `vi.stubEnv('AUTH_SIGNING_SECRET', SIGNING_KEY)` where sign-in runs. */
export const SIGNING_KEY = 'test-signing-secret';

/** HMAC-SHA256 of `TOKEN` with `SIGNING_KEY`, computed with openssl rather than the code under test. */
export const SIGN_IN_SECRET = 'C5d2oOJKeJtljqCaeUZpnyJdgV9z6WR9_3MZzwAo0e8';

/** A complete body for `POST /api/auth/session`. */
export const SIGN_IN_BODY = { request_token: TOKEN, sign_in_secret: SIGN_IN_SECRET };
