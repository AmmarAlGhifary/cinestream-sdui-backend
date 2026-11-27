import { beforeEach, describe, expect, it, vi } from 'vitest';
import handler from '../api/movie_detail_screen';
import { fakeTmdb } from './helpers/axiosMock';
import { errorBody } from './helpers/errors';
import { invoke } from './helpers/http';
import { movieDetail, similar } from './fixtures/movies';

vi.mock('axios', () => import('./helpers/axiosMock'));

describe('GET /api/movie_detail_screen', () => {
    beforeEach(() => fakeTmdb.reset());

    it('returns the detail screen', async () => {
        fakeTmdb.respond({ '/movie/42': movieDetail, '/movie/42/similar': similar });

        const { status, body } = await invoke(handler, { movie_id: '42' });

        expect(status).toBe(200);
        expect(body).toMatchSnapshot();
        expect(fakeTmdb.requestedPaths()).toEqual(['/movie/42', '/movie/42/similar']);
    });

    it.each<[string, Record<string, string>]>([
        ['missing', {}],
        ['empty', { movie_id: '' }],
    ])('returns 400 without calling TMDB when movie_id is %s', async (_label, query) => {
        const { status, body } = await invoke(handler, query);

        expect(status).toBe(400);
        expect(body).toEqual(errorBody('MISSING_PARAMETER'));
        expect(fakeTmdb.requestedPaths()).toEqual([]);
    });

    it('returns UPSTREAM_ERROR when TMDB requests fail', async () => {
        fakeTmdb.fail();

        const { status, body } = await invoke(handler, { movie_id: '42' });

        expect(status).toBe(502);
        expect(body).toEqual(errorBody('UPSTREAM_ERROR'));
    });

    it('returns MOVIE_NOT_FOUND when the similar request gets a 404', async () => {
        fakeTmdb.respond({ '/movie/42': movieDetail });

        const { status, body } = await invoke(handler, { movie_id: '42' });

        expect(status).toBe(404);
        expect(body).toEqual(errorBody('MOVIE_NOT_FOUND'));
    });
});
