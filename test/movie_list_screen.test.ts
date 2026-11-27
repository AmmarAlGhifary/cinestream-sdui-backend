import { beforeEach, describe, expect, it, vi } from 'vitest';
import handler from '../api/movie_list_screen';
import { fakeTmdb } from './helpers/axiosMock';
import { errorBody } from './helpers/errors';
import { invoke } from './helpers/http';
import { similar, trending, upcoming } from './fixtures/movies';

vi.mock('axios', () => import('./helpers/axiosMock'));

describe('GET /api/movie_list_screen', () => {
    beforeEach(() => fakeTmdb.reset());

    it.each<[string, Record<string, string>, string, unknown]>([
        ['trending', { list_type: 'trending' }, '/trending/movie/week', trending],
        ['upcoming', { list_type: 'upcoming' }, '/movie/upcoming', upcoming],
        ['similar', { list_type: 'similar', movie_id: '42' }, '/movie/42/similar', similar],
    ])('returns the %s list', async (_label, query, path, tmdbBody) => {
        fakeTmdb.respond({ [path]: tmdbBody });

        const { status, body } = await invoke(handler, query);

        expect(status).toBe(200);
        expect(body).toMatchSnapshot();
        expect(fakeTmdb.requestedPaths()).toEqual([path]);
    });

    it.each<[string, Record<string, string>]>([
        ['unknown', { list_type: 'popular' }],
        ['missing', {}],
    ])('returns 400 without calling TMDB when list_type is %s', async (_label, query) => {
        const { status, body } = await invoke(handler, query);

        expect(status).toBe(400);
        expect(body).toEqual(errorBody('INVALID_PARAMETER'));
        expect(fakeTmdb.requestedPaths()).toEqual([]);
    });

    it('returns UPSTREAM_ERROR when the TMDB request fails', async () => {
        fakeTmdb.fail();

        const { status, body } = await invoke(handler, { list_type: 'trending' });

        expect(status).toBe(502);
        expect(body).toEqual(errorBody('UPSTREAM_ERROR'));
    });
});
