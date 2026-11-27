import { beforeEach, describe, expect, it, vi } from 'vitest';
import detailHandler from '../api/movie_detail_screen';
import listHandler from '../api/movie_list_screen';
import { getMovie, getSimilar } from '../src/data/tmdb/repository';
import { parseMovieId } from '../src/http/params';
import { fakeTmdb } from './helpers/axiosMock';
import { errorBody } from './helpers/errors';
import { invoke } from './helpers/http';
import { trending, upcoming } from './fixtures/movies';

vi.mock('axios', () => import('./helpers/axiosMock'));

const MISSING = 'MISSING_PARAMETER';
const INVALID = 'INVALID_PARAMETER';

const rejected: [string, string | string[] | undefined, typeof MISSING | typeof INVALID][] = [
    ['absent', undefined, MISSING],
    ['empty', '', MISSING],
    ['non-numeric', 'abc', INVALID],
    ['zero', '0', INVALID],
    ['zero-padded', '0550', INVALID],
    ['negative', '-1', INVALID],
    ['decimal', '1.5', INVALID],
    ['exponent notation', '1e3', INVALID],
    ['longer than 10 digits', '12345678901', INVALID],
    ['padded with a space', ' 550', INVALID],
    ['followed by a newline', '550\n', INVALID],
    ['query injection', '550?x=', INVALID],
    ['extra query parameter', '550&api_key=other', INVALID],
    ['fragment injection', '550#', INVALID],
    ['path traversal', '550/../../account', INVALID],
    ['encoded path traversal', '550%2F..%2F..%2Faccount', INVALID],
    ['dot segment', '..', INVALID],
    ['a repeated parameter', ['550', '551'], INVALID],
    ['a one-item array', ['550'], INVALID],
];

/** Repeated parameters reach the handler as arrays, which `invoke` does not type. */
function query(movieId: string | string[] | undefined, extra: Record<string, string> = {}) {
    const result = movieId === undefined ? extra : { ...extra, movie_id: movieId };
    return result as Record<string, string>;
}

describe('movie_id validation', () => {
    beforeEach(() => fakeTmdb.reset());

    describe.each([
        ['movie_detail_screen', detailHandler, {}],
        ['movie_list_screen?list_type=similar', listHandler, { list_type: 'similar' }],
    ])('GET /api/%s', (_route, handler, extra: Record<string, string>) => {
        it.each(rejected)('returns 400 without calling TMDB when movie_id is %s', async (_label, movieId, code) => {
            const { status, body } = await invoke(handler, query(movieId, extra));

            expect(status).toBe(400);
            expect(body).toEqual(errorBody(code));
            expect(fakeTmdb.requestedPaths()).toEqual([]);
        });
    });

    it.each<[string, string, unknown]>([
        ['trending', '/trending/movie/week', trending],
        ['upcoming', '/movie/upcoming', upcoming],
    ])('ignores an invalid movie_id on the %s list', async (listType, path, tmdbBody) => {
        fakeTmdb.respond({ [path]: tmdbBody });

        const { status } = await invoke(listHandler, query('550/../../account', { list_type: listType }));

        expect(status).toBe(200);
        expect(fakeTmdb.requestedPaths()).toEqual([path]);
    });

    it.each(['1', '550', '9999999999'])('accepts %s', (movieId) => {
        expect(parseMovieId(movieId)).toBe(movieId);
    });
});

describe('TMDB repository movie paths', () => {
    beforeEach(() => fakeTmdb.reset());

    it('encodes the movie id so it stays one path segment', async () => {
        fakeTmdb.fail();

        await expect(getMovie('550/../../account?x=')).rejects.toThrow();
        await expect(getSimilar('550/../../account?x=')).rejects.toThrow();

        const segment = '550%2F..%2F..%2Faccount%3Fx%3D';
        expect(fakeTmdb.requestedPaths()).toEqual([`/movie/${segment}`, `/movie/${segment}/similar`]);
    });
});
