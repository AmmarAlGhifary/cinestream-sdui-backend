import { beforeEach, describe, expect, it, vi } from 'vitest';
import handler from '../api/search';
import { fakeTmdb } from './helpers/axiosMock';
import { errorBody } from './helpers/errors';
import { invoke } from './helpers/http';
import { searchResults } from './fixtures/movies';

vi.mock('axios', () => import('./helpers/axiosMock'));

describe('GET /api/search', () => {
    beforeEach(() => fakeTmdb.reset());

    it('returns the search results screen', async () => {
        fakeTmdb.respond({ '/search/movie': searchResults });

        const { status, body } = await invoke(handler, { query: 'answer' });

        expect(status).toBe(200);
        expect(body).toMatchSnapshot();
        expect(fakeTmdb.requestedPaths()).toEqual(['/search/movie']);
    });

    it('returns an empty list when nothing matches', async () => {
        fakeTmdb.respond({ '/search/movie': { results: [] } });

        const { status, body } = await invoke(handler, { query: 'nothing' });

        expect(status).toBe(200);
        expect(body).toEqual({
            type: 'screen',
            screen_id: 'search_screen',
            body: { type: 'vertical_list', list_id: 'search_results', items: [] },
        });
    });

    it.each<[string, Record<string, string>]>([
        ['missing', {}],
        ['empty', { query: '' }],
    ])('returns the empty screen without calling TMDB when query is %s', async (_label, query) => {
        const { status, body } = await invoke(handler, query);

        expect(status).toBe(200);
        expect(body).toEqual({
            type: 'screen',
            screen_id: 'search_screen',
            body: { type: 'column', children: [] },
        });
        expect(fakeTmdb.requestedPaths()).toEqual([]);
    });

    it('returns UPSTREAM_ERROR when the TMDB request fails', async () => {
        fakeTmdb.fail();

        const { status, body } = await invoke(handler, { query: 'answer' });

        expect(status).toBe(502);
        expect(body).toEqual(errorBody('UPSTREAM_ERROR'));
    });
});
