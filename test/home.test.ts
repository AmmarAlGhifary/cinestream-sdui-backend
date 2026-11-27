import { beforeEach, describe, expect, it, vi } from 'vitest';
import handler from '../api/home';
import { fakeTmdb } from './helpers/axiosMock';
import { errorBody } from './helpers/errors';
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

    it('returns CONTENT_UNAVAILABLE when trending is empty', async () => {
        fakeTmdb.respond({ '/trending/movie/week': { results: [] }, '/movie/upcoming': upcoming });

        const { status, body } = await invoke(handler);

        expect(status).toBe(503);
        expect(body).toEqual(errorBody('CONTENT_UNAVAILABLE'));
    });

    it('returns UPSTREAM_ERROR when trending has no results field', async () => {
        fakeTmdb.respond({ '/trending/movie/week': {}, '/movie/upcoming': upcoming });

        const { status, body } = await invoke(handler);

        expect(status).toBe(502);
        expect(body).toEqual(errorBody('UPSTREAM_ERROR'));
    });

    it('returns UPSTREAM_ERROR when TMDB requests fail', async () => {
        fakeTmdb.fail();

        const { status, body } = await invoke(handler);

        expect(status).toBe(502);
        expect(body).toEqual(errorBody('UPSTREAM_ERROR'));
    });

    it('returns UPSTREAM_ERROR when only the upcoming request fails', async () => {
        fakeTmdb.respond({ '/trending/movie/week': trending });

        const { status, body } = await invoke(handler);

        expect(status).toBe(502);
        expect(body).toEqual(errorBody('UPSTREAM_ERROR'));
    });
});
