import { beforeEach, describe, expect, it, vi } from 'vitest';
import requestTokenHandler from '../api/auth/request_token';
import sessionHandler from '../api/auth/session';
import type { ErrorCode } from '../src/errors/appError';
import { ERROR_CATALOG } from '../src/errors/appError';
import { account, newSession, requestToken, SESSION, SIGNED_IN, TOKEN } from './helpers/account';
import { fakeTmdb, tmdbError } from './helpers/axiosMock';
import { errorBody } from './helpers/errors';
import { invoke } from './helpers/http';

vi.mock('axios', () => import('./helpers/axiosMock'));

beforeEach(() => fakeTmdb.reset());

const NO_STORE = { 'cache-control': 'private, no-store' };

function expectError(response: Awaited<ReturnType<typeof invoke>>, code: ErrorCode) {
    expect(response.status).toBe(ERROR_CATALOG[code].status);
    expect(response.body).toStrictEqual(errorBody(code));
    expect(response.headers['cache-control']).toBe('no-store');
}

describe('POST /api/auth/request_token', () => {
    const start = (options: Parameters<typeof invoke>[3] = {}, query: Record<string, string> = {}) =>
        invoke(requestTokenHandler, query, '/', { method: 'POST', ...options });

    beforeEach(() => fakeTmdb.respond({ '/authentication/token/new': requestToken }));

    it('returns the token, its expiry and the approval URL with the default deep link', async () => {
        const { status, body, headers } = await start();

        expect(status).toBe(200);
        expect(body).toStrictEqual({
            request_token: TOKEN,
            expires_at: '2026-11-27 15:00:00 UTC',
            approve_url: `https://www.themoviedb.org/authenticate/${TOKEN}?redirect_to=cinestream%3A%2F%2Fauth%2Ftmdb`,
        });
        expect(headers).toStrictEqual(NO_STORE);
        expect(fakeTmdb.calls()).toStrictEqual([{ method: 'GET', path: '/authentication/token/new', query: {} }]);
    });

    it('takes the redirect URL from AUTH_REDIRECT_URL', async () => {
        vi.stubEnv('AUTH_REDIRECT_URL', 'cinestream-dev://auth?from=tmdb');

        const { body } = await start();

        expect(new URL(body.approve_url).searchParams.get('redirect_to')).toBe('cinestream-dev://auth?from=tmdb');
    });

    it('never takes the redirect URL from the request', async () => {
        const evil = 'https://evil.example/steal';

        const { body } = await start(
            { body: { redirect_to: evil, AUTH_REDIRECT_URL: evil }, headers: { referer: evil } },
            { redirect_to: evil },
        );

        expect(body.approve_url).not.toContain('evil');
    });

    it.each<[string, () => void, ErrorCode]>([
        ['TMDB rejects our key', () => fakeTmdb.respond({ '/authentication/token/new': tmdbError(401, 7) }), 'SERVICE_MISCONFIGURED'],
        ['TMDB is down', () => fakeTmdb.failStatus(503), 'UPSTREAM_ERROR'],
        ['TMDB rate limits', () => fakeTmdb.failStatus(429), 'RATE_LIMITED'],
        ['TMDB times out', () => fakeTmdb.failCode('ECONNABORTED'), 'UPSTREAM_TIMEOUT'],
        ['the response has no token', () => fakeTmdb.respond({ '/authentication/token/new': { success: true } }), 'UPSTREAM_ERROR'],
        ['the key is unset', () => vi.stubEnv('TMDB_API_KEY', ''), 'SERVICE_MISCONFIGURED'],
        ['maintenance is on', () => vi.stubEnv('MAINTENANCE_MODE', 'true'), 'MAINTENANCE'],
    ])('fails when %s', async (_label, arrange, code) => {
        arrange();

        expectError(await start(), code);
    });
});

describe('POST /api/auth/session', () => {
    const signIn = (body: unknown, options: Parameters<typeof invoke>[3] = {}) =>
        invoke(sessionHandler, {}, '/', { method: 'POST', body, ...options });

    const routes = { '/authentication/session/new': newSession, '/account': account };

    it('returns the session and only the account id and username', async () => {
        fakeTmdb.respond(routes);

        const { status, body, headers } = await signIn({ request_token: TOKEN });

        expect(status).toBe(200);
        expect(body).toStrictEqual({ session_id: SESSION, account: { id: 548, username: 'answerfan' } });
        expect(headers).toStrictEqual(NO_STORE);
        expect(fakeTmdb.calls()).toStrictEqual([
            { method: 'POST', path: '/authentication/session/new', query: {}, body: { request_token: TOKEN } },
            { method: 'GET', path: '/account', query: { session_id: SESSION } },
        ]);
    });

    it('accepts a JSON body sent as text', async () => {
        fakeTmdb.respond(routes);

        const { status } = await signIn(JSON.stringify({ request_token: TOKEN }));

        expect(status).toBe(200);
    });

    it('accepts a token of 256 characters', async () => {
        fakeTmdb.respond(routes);

        const { status } = await signIn({ request_token: 'a'.repeat(256) });

        expect(status).toBe(200);
    });

    it.each<[string, unknown, ErrorCode]>([
        ['no body', undefined, 'INVALID_PARAMETER'],
        ['a body that is not JSON', '{"request_token":', 'INVALID_PARAMETER'],
        ['an array body', [TOKEN], 'INVALID_PARAMETER'],
        ['a null body', null, 'INVALID_PARAMETER'],
        ['no token', {}, 'MISSING_PARAMETER'],
        ['a null token', { request_token: null }, 'MISSING_PARAMETER'],
        ['an empty token', { request_token: '' }, 'MISSING_PARAMETER'],
        ['a numeric token', { request_token: 42 }, 'INVALID_PARAMETER'],
        ['an array token', { request_token: [TOKEN] }, 'INVALID_PARAMETER'],
        ['a token over 256 characters', { request_token: 'a'.repeat(257) }, 'INVALID_PARAMETER'],
    ])('rejects %s without calling TMDB', async (_label, body, code) => {
        expectError(await signIn(body), code);
        expect(fakeTmdb.calls()).toEqual([]);
    });

    it('rejects malformed JSON without calling TMDB', async () => {
        expectError(await signIn(undefined, { invalidJson: '{' }), 'INVALID_PARAMETER');
        expect(fakeTmdb.calls()).toEqual([]);
    });

    it.each([
        [401, 3],
        [401, 14],
        [401, 17],
        [401, 33],
        [401, 35],
        [422, 41],
    ])('returns SIGN_IN_FAILED for TMDB %i with status_code %i', async (status, statusCode) => {
        fakeTmdb.respond({ '/authentication/session/new': tmdbError(status, statusCode) });

        expectError(await signIn({ request_token: TOKEN }), 'SIGN_IN_FAILED');
        expect(fakeTmdb.calls()).toHaveLength(1);
    });

    it.each<[string, Record<string, unknown>, ErrorCode]>([
        ['an invalid API key', { '/authentication/session/new': tmdbError(401, 7) }, 'SERVICE_MISCONFIGURED'],
        ['a suspended API key', { '/authentication/session/new': tmdbError(401, 10) }, 'SERVICE_MISCONFIGURED'],
        ['a 401 without a status_code', { '/authentication/session/new': tmdbError(401) }, 'SERVICE_MISCONFIGURED'],
        ['a server error', { '/authentication/session/new': tmdbError(500, 11) }, 'UPSTREAM_ERROR'],
        ['a response without a session', { '/authentication/session/new': { success: true } }, 'UPSTREAM_ERROR'],
        ['a rejected new session', { ...routes, '/account': tmdbError(401, 3) }, 'SESSION_EXPIRED'],
        ['a malformed account', { ...routes, '/account': { id: 'x' } }, 'UPSTREAM_ERROR'],
    ])('maps %s', async (_label, tmdbRoutes, code) => {
        fakeTmdb.respond(tmdbRoutes);

        expectError(await signIn({ request_token: TOKEN }), code);
    });
});

describe('DELETE /api/auth/session', () => {
    const signOut = (headers: Record<string, string> = SIGNED_IN) =>
        invoke(sessionHandler, {}, '/', { method: 'DELETE', headers });

    it('deletes the TMDB session and answers 204 without a body', async () => {
        fakeTmdb.respond({ '/authentication/session': { success: true } });

        const { status, body, headers } = await signOut();

        expect(status).toBe(204);
        expect(body).toBeUndefined();
        expect(headers).toStrictEqual(NO_STORE);
        expect(fakeTmdb.calls()).toStrictEqual([
            { method: 'DELETE', path: '/authentication/session', query: {}, body: { session_id: SESSION } },
        ]);
    });

    it.each<[string, Record<string, string>]>([
        ['no header', {}],
        ['an empty bearer', { authorization: 'Bearer ' }],
        ['the scheme alone', { authorization: 'Bearer' }],
        ['another scheme', { authorization: `Basic ${SESSION}` }],
    ])('returns SIGN_IN_REQUIRED for %s without calling TMDB', async (_label, headers) => {
        expectError(await signOut(headers), 'SIGN_IN_REQUIRED');
        expect(fakeTmdb.calls()).toEqual([]);
    });

    it('returns SESSION_EXPIRED for a malformed session without calling TMDB', async () => {
        expectError(await signOut({ authorization: 'Bearer not a session' }), 'SESSION_EXPIRED');
        expect(fakeTmdb.calls()).toEqual([]);
    });

    it.each<[string, number, number | undefined, ErrorCode]>([
        ['status_code 3', 401, 3, 'SESSION_EXPIRED'],
        ['status_code 17', 401, 17, 'SESSION_EXPIRED'],
        ['status_code 37', 404, 37, 'SESSION_EXPIRED'],
        ['a 404 with another code', 404, 6, 'SESSION_EXPIRED'],
        ['an invalid API key', 401, 7, 'SERVICE_MISCONFIGURED'],
        ['a server error', 500, 11, 'UPSTREAM_ERROR'],
    ])('maps TMDB %s', async (_label, status, statusCode, code) => {
        fakeTmdb.respond({ '/authentication/session': tmdbError(status, statusCode) });

        expectError(await signOut(), code);
    });
});
