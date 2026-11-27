import { beforeEach, describe, expect, it, vi } from 'vitest';
import handler from '../api/favorite';
import { ERROR_CATALOG, type ErrorCode } from '../src/errors/appError';
import { account, SESSION, SIGNED_IN } from './helpers/account';
import { fakeTmdb, tmdbError } from './helpers/axiosMock';
import { errorBody } from './helpers/errors';
import { invoke } from './helpers/http';

vi.mock('axios', () => import('./helpers/axiosMock'));

const FAVORITE_PATH = '/account/548/favorite';
const routes = { '/account': account, [FAVORITE_PATH]: { success: true, status_code: 1 } };
const valid = { movie_id: '42', favorite: true };

const post = (body: unknown = valid, headers: Record<string, string> = SIGNED_IN) =>
    invoke(handler, {}, '/', { method: 'POST', body, headers });

function expectError(response: Awaited<ReturnType<typeof invoke>>, code: ErrorCode) {
    expect(response.status).toBe(ERROR_CATALOG[code].status);
    expect(response.body).toStrictEqual(errorBody(code));
    expect(response.headers['cache-control']).toBe('no-store');
}

describe('POST /api/favorite', () => {
    beforeEach(() => fakeTmdb.reset());

    it.each([
        [true, 'favorite'],
        [false, 'favorite_border'],
    ])('sets favorite to %s and returns the %s button', async (favorite, icon) => {
        fakeTmdb.respond(routes);

        const { status, body, headers } = await post({ movie_id: '42', favorite });

        expect(status).toBe(200);
        expect(body).toStrictEqual({
            movie_id: '42',
            is_favorite: favorite,
            icon_button: {
                type: 'icon_button',
                icon_name: icon,
                action: {
                    type: 'api_action',
                    endpoint: '/api/favorite',
                    method: 'POST',
                    body: { movie_id: '42', favorite: !favorite },
                },
            },
        });
        expect(headers).toStrictEqual({ 'cache-control': 'private, no-store' });
        expect(fakeTmdb.calls()).toStrictEqual([
            { method: 'GET', path: '/account', query: { session_id: SESSION } },
            {
                method: 'POST',
                path: FAVORITE_PATH,
                query: { session_id: SESSION },
                body: { media_type: 'movie', media_id: 42, favorite },
            },
        ]);
    });

    it.each<[string, Record<string, string>]>([
        ['no header', {}],
        ['an empty bearer', { authorization: 'Bearer   ' }],
        ['another scheme', { authorization: `Token ${SESSION}` }],
    ])('returns SIGN_IN_REQUIRED for %s without calling TMDB', async (_label, headers) => {
        expectError(await post(valid, headers), 'SIGN_IN_REQUIRED');
        expect(fakeTmdb.calls()).toEqual([]);
    });

    it('asks for sign-in before it looks at the body', async () => {
        expectError(await post({ movie_id: 'abc' }, {}), 'SIGN_IN_REQUIRED');
    });

    it.each<[string, string]>([
        ['with spaces', 'two words'],
        ['with a query injection', 'abc&account_id=1'],
        ['over 256 characters', 'a'.repeat(257)],
    ])('returns SESSION_EXPIRED without calling TMDB for a session %s', async (_label, session) => {
        expectError(await post(valid, { authorization: `Bearer ${session}` }), 'SESSION_EXPIRED');
        expect(fakeTmdb.calls()).toEqual([]);
    });

    it.each<[string, unknown, ErrorCode]>([
        ['a null body', null, 'INVALID_PARAMETER'],
        ['a body that is not JSON', 'movie_id=42', 'INVALID_PARAMETER'],
        ['an array body', [valid], 'INVALID_PARAMETER'],
        ['no movie_id', { favorite: true }, 'MISSING_PARAMETER'],
        ['an empty movie_id', { movie_id: '', favorite: true }, 'MISSING_PARAMETER'],
        ['a numeric movie_id', { movie_id: 42, favorite: true }, 'INVALID_PARAMETER'],
        ['a zero movie_id number', { movie_id: 0, favorite: true }, 'INVALID_PARAMETER'],
        ['an array movie_id', { movie_id: ['42'], favorite: true }, 'INVALID_PARAMETER'],
        ['a path in movie_id', { movie_id: '42/../1', favorite: true }, 'INVALID_PARAMETER'],
        ['no favorite', { movie_id: '42' }, 'MISSING_PARAMETER'],
        ['a null favorite', { movie_id: '42', favorite: null }, 'MISSING_PARAMETER'],
        ['a string favorite', { movie_id: '42', favorite: 'true' }, 'INVALID_PARAMETER'],
        ['a numeric favorite', { movie_id: '42', favorite: 1 }, 'INVALID_PARAMETER'],
    ])('rejects %s without calling TMDB', async (_label, body, code) => {
        expectError(await post(body), code);
        expect(fakeTmdb.calls()).toEqual([]);
    });

    it('rejects a request without a body', async () => {
        const response = await invoke(handler, {}, '/', { method: 'POST', headers: SIGNED_IN });

        expectError(response, 'INVALID_PARAMETER');
        expect(fakeTmdb.calls()).toEqual([]);
    });

    it('rejects malformed JSON without calling TMDB', async () => {
        const response = await invoke(handler, {}, '/', { method: 'POST', headers: SIGNED_IN, invalidJson: '{' });

        expectError(response, 'INVALID_PARAMETER');
        expect(fakeTmdb.calls()).toEqual([]);
    });

    it.each<[string, string, number, number | undefined, ErrorCode, number]>([
        ['a rejected session on the account', '/account', 401, 3, 'SESSION_EXPIRED', 1],
        ['a failed authentication on the account', '/account', 401, 14, 'SESSION_EXPIRED', 1],
        ['a denied session on the account', '/account', 401, 17, 'SESSION_EXPIRED', 1],
        ['an invalid API key', '/account', 401, 7, 'SERVICE_MISCONFIGURED', 1],
        ['a suspended API key', '/account', 401, 10, 'SERVICE_MISCONFIGURED', 1],
        ['a 401 without a status_code', '/account', 401, undefined, 'SERVICE_MISCONFIGURED', 1],
        ['a 404 on the account', '/account', 404, 34, 'UPSTREAM_ERROR', 1],
        ['an unknown movie', FAVORITE_PATH, 404, 34, 'MOVIE_NOT_FOUND', 2],
        ['a session rejected on the write', FAVORITE_PATH, 401, 3, 'SESSION_EXPIRED', 2],
        ['a session not found on the write', FAVORITE_PATH, 404, 37, 'SESSION_EXPIRED', 2],
        ['an invalid API key on the write', FAVORITE_PATH, 401, 7, 'SERVICE_MISCONFIGURED', 2],
        ['rate limiting', FAVORITE_PATH, 429, 25, 'RATE_LIMITED', 2],
        ['a server error', FAVORITE_PATH, 500, 11, 'UPSTREAM_ERROR', 2],
    ])('maps %s', async (_label, path, status, statusCode, code, callCount) => {
        fakeTmdb.respond({ ...routes, [path]: tmdbError(status, statusCode) });

        expectError(await post(), code);
        expect(fakeTmdb.calls()).toHaveLength(callCount);
    });

    it('does not write when the account response is malformed', async () => {
        fakeTmdb.respond({ ...routes, '/account': {} });

        expectError(await post(), 'UPSTREAM_ERROR');
        expect(fakeTmdb.calls()).toHaveLength(1);
    });

    it('is closed during maintenance', async () => {
        vi.stubEnv('MAINTENANCE_MODE', 'true');

        expectError(await post(), 'MAINTENANCE');
        expect(fakeTmdb.calls()).toEqual([]);
    });
});
