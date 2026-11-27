import { beforeEach, describe, expect, it, vi } from 'vitest';
import handler from '../api/home';
import { fakeTmdb } from './helpers/axiosMock';
import { invoke } from './helpers/http';
import { trending, upcoming } from './fixtures/movies';

vi.mock('axios', () => import('./helpers/axiosMock'));

describe('GET /api/home', () => {
    beforeEach(() => fakeTmdb.reset());

    it('returns the home screen', async () => {
        fakeTmdb.respond({ '/trending/movie/week': trending, '/movie/upcoming': upcoming });

        const { status, body } = await invoke(handler);

        expect(status).toBe(200);
        expect(body).toMatchSnapshot();
        expect(fakeTmdb.requestedPaths()).toEqual(['/movie/upcoming', '/trending/movie/week']);
    });

    it.each([
        ['an empty list', { results: [] }],
        ['no results field', {}],
    ])('returns 500 when trending has %s', async (_label, trendingBody) => {
        fakeTmdb.respond({ '/trending/movie/week': trendingBody, '/movie/upcoming': upcoming });

        const { status, body } = await invoke(handler);

        expect(status).toBe(500);
        expect(body).toEqual({ error: 'No movies found from TMDB' });
    });

    it('returns 500 when TMDB requests fail', async () => {
        fakeTmdb.fail();

        const { status, body } = await invoke(handler);

        expect(status).toBe(500);
        expect(body).toEqual({ error: 'Failed to generate SDUI blueprint' });
    });

    it('returns 500 when only the upcoming request fails', async () => {
        fakeTmdb.respond({ '/trending/movie/week': trending });

        const { status, body } = await invoke(handler);

        expect(status).toBe(500);
        expect(body).toEqual({ error: 'Failed to generate SDUI blueprint' });
    });
});
