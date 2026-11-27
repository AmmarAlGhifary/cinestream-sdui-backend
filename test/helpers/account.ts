/** Fake credentials: distinctive, so a leak is easy to search for. */
export const SESSION = 'fakesession0123456789abcdef0123456789abcd';
export const TOKEN = 'faketoken0123456789abcdef0123456789abcdef';

export const SIGNED_IN = { authorization: `Bearer ${SESSION}` };

export const account = { id: 548, username: 'answerfan', name: 'Not forwarded', include_adult: false };

export const requestToken = { success: true, expires_at: '2026-11-27 15:00:00 UTC', request_token: TOKEN };

export const newSession = { success: true, session_id: SESSION };
