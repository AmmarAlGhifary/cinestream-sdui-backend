import { beforeEach, describe, expect, it, vi } from 'vitest';
import handler from '../api/movie_detail_screen';
import { ERROR_CATALOG, type ErrorCode } from '../src/errors/appError';
import { SESSION, SIGNED_IN } from './helpers/account';
import { fakeTmdb, tmdbError } from './helpers/axiosMock';
import { errorBody } from './helpers/errors';
import { invoke } from './helpers/http';
import { movieDetail, similar } from './fixtures/movies';

vi.mock('axios', () => import('./helpers/axiosMock'));

const STATES = '/movie/42/account_states';
const movieRoutes = { '/movie/42': movieDetail, '/movie/42/similar': similar };
const states = (favorite: boolean) => ({ ...movieRoutes, [STATES]: { id: 42, favorite, watchlist: false } });

const get = (headers: Record<string, string> = {}) => invoke(handler, { movie_id: '42' }, '/', { headers });

const heart = (body: any) => body.toolbar.actions[0];

function button(icon: string, favorite: boolean) {
    return {
        type: 'icon_button',
        icon_name: icon,
        action: { type: 'api_action', endpoint: '/api/favorite', method: 'POST', body: { movie_id: '42', favorite } },
    };
}

describe('GET /api/movie_detail_screen with a session', () => {
    beforeEach(() => fakeTmdb.reset());

    it.each<[string, Record<string, string>]>([
        ['no header', {}],
        ['an empty bearer', { authorization: 'Bearer ' }],
        ['another scheme', { authorization: `Basic ${SESSION}` }],
    ])('renders signed out with %s', async (_label, headers) => {
        fakeTmdb.respond(movieRoutes);

        const response = await get(headers);

        expect(response.status).toBe(200);
        expect(heart(response.body)).toStrictEqual(button('favorite_border', true));
        expect(response.headers).toStrictEqual({});
        expect(fakeTmdb.requestedPaths()).toEqual(['/movie/42', '/movie/42/similar']);
    });

    it.each([
        [true, 'favorite'],
        [false, 'favorite_border'],
    ])('shows a favorite flag of %s as %s', async (isFavorite, icon) => {
        fakeTmdb.respond(states(isFavorite));

        const response = await get(SIGNED_IN);

        expect(response.status).toBe(200);
        expect(heart(response.body)).toStrictEqual(button(icon, !isFavorite));
        expect(response.headers).toStrictEqual({ 'cache-control': 'private, no-store' });
        expect(fakeTmdb.calls()[2]).toStrictEqual({ method: 'GET', path: STATES, query: { session_id: SESSION } });
        expect(fakeTmdb.calls()).toHaveLength(3);
    });

    it('changes only the heart compared with the signed-out screen', async () => {
        fakeTmdb.respond(states(true));

        const signedOut = (await get()).body;
        const signedIn = (await get(SIGNED_IN)).body;

        signedIn.toolbar.actions[0] = heart(signedOut);
        expect(signedIn).toStrictEqual(signedOut);
    });

    const invalidHeaders = { 'cache-control': 'private, no-store', 'x-session-invalid': 'true' };

    it.each([
        [401, 3],
        [401, 14],
        [401, 17],
        [404, 37],
    ])('renders signed out when TMDB answers %i with status_code %i', async (status, statusCode) => {
        fakeTmdb.respond({ ...movieRoutes, [STATES]: tmdbError(status, statusCode) });

        const response = await get(SIGNED_IN);

        expect(response.status).toBe(200);
        expect(heart(response.body)).toStrictEqual(button('favorite_border', true));
        expect(response.headers).toStrictEqual(invalidHeaders);
    });

    it('renders a malformed session signed out without sending it to TMDB', async () => {
        fakeTmdb.respond(movieRoutes);

        const response = await get({ authorization: `Bearer ${'a'.repeat(5000)}` });

        expect(response.status).toBe(200);
        expect(response.headers).toStrictEqual(invalidHeaders);
        expect(fakeTmdb.requestedPaths()).toEqual(['/movie/42', '/movie/42/similar']);
    });

    it.each<[string, number, number | undefined, ErrorCode]>([
        ['an invalid API key', 401, 7, 'SERVICE_MISCONFIGURED'],
        ['a missing movie', 404, 34, 'MOVIE_NOT_FOUND'],
        ['rate limiting', 429, 25, 'RATE_LIMITED'],
        ['a server error', 500, 11, 'UPSTREAM_ERROR'],
    ])('still fails on %s', async (_label, status, statusCode, code) => {
        fakeTmdb.respond({ ...movieRoutes, [STATES]: tmdbError(status, statusCode) });

        const response = await get(SIGNED_IN);

        expect(response.status).toBe(ERROR_CATALOG[code].status);
        expect(response.body).toStrictEqual(errorBody(code));
        expect(response.headers['cache-control']).toBe('no-store');
        expect(response.headers).not.toHaveProperty('x-session-invalid');
    });

    it('returns UPSTREAM_ERROR for account states without a favorite flag', async () => {
        fakeTmdb.respond({ ...movieRoutes, [STATES]: { id: 42 } });

        const response = await get(SIGNED_IN);

        expect(response.body).toStrictEqual(errorBody('UPSTREAM_ERROR'));
    });
});
