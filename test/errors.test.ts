import { createServer, request, type IncomingHttpHeaders } from 'node:http';
import type { AddressInfo } from 'node:net';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import favorite from '../api/favorite';
import detail from '../api/movie_detail_screen';
import session from '../api/auth/session';
import home from '../api/home';
import index from '../api/index';
import list from '../api/movie_list_screen';
import notFound from '../api/not_found';
import search from '../api/search';
import { ERROR_CATALOG, type ErrorCode } from '../src/errors/appError';
import { errorBody } from './helpers/errors';
import { SIGN_IN_BODY, SIGNING_KEY } from './helpers/account';
import { fakeTmdb, tmdbError } from './helpers/axiosMock';
import { invoke, type Handler } from './helpers/http';
import { movie, movieDetail, similar, trending, upcoming } from './fixtures/movies';

vi.mock('axios', () => import('./helpers/axiosMock'));

/**
 * The contract table, written out by hand so that a change to the catalog
 * cannot silently change what the Android client relies on.
 */
const TABLE: [ErrorCode, number, boolean, number | undefined, string, string][] = [
    ['MISSING_PARAMETER', 400, false, undefined, "Something's missing", "We couldn't open this page because some information is missing."],
    ['INVALID_PARAMETER', 400, false, undefined, 'Invalid request', "We couldn't open this page. Please go back and try again."],
    ['METHOD_NOT_ALLOWED', 405, false, undefined, 'Not supported', "This action isn't supported."],
    ['SCREEN_NOT_FOUND', 404, false, undefined, 'Page not found', "This page doesn't exist or has moved."],
    ['MOVIE_NOT_FOUND', 404, false, undefined, 'Movie not found', "We couldn't find this movie. It may have been removed."],
    ['CONTENT_UNAVAILABLE', 503, true, 30, 'Nothing to show yet', "We couldn't load movies right now. Please try again in a moment."],
    ['RATE_LIMITED', 429, true, 10, 'Too many requests', "We're getting a lot of requests. Please try again in a few seconds."],
    ['UPSTREAM_TIMEOUT', 504, true, undefined, 'Taking too long', 'The movie service is slow to respond. Please try again.'],
    ['UPSTREAM_ERROR', 502, true, undefined, 'Service problem', "We couldn't reach the movie service. Please try again."],
    ['SERVICE_MISCONFIGURED', 503, false, undefined, 'Service unavailable', "CineStream is temporarily unavailable. We're working on it."],
    ['MAINTENANCE', 503, true, 300, 'Under maintenance', 'CineStream is being updated. Please check back soon.'],
    ['INTERNAL_ERROR', 500, true, undefined, 'Something went wrong', 'An unexpected error occurred. Please try again.'],
    ['SIGN_IN_REQUIRED', 401, false, undefined, 'Sign in required', 'Sign in with your TMDB account to save favorites.'],
    ['SESSION_EXPIRED', 401, false, undefined, 'Session expired', 'Please sign in again to keep using favorites.'],
    ['SIGN_IN_FAILED', 401, false, undefined, "Sign-in didn't finish", "We couldn't complete sign-in. Please try again."],
];

interface Scenario {
    handler: Handler;
    query?: Record<string, string>;
    method?: string;
    headers?: Record<string, string>;
    body?: unknown;
    arrange?: () => void;
}

/** One way to reach each code. */
const SCENARIOS: Record<ErrorCode, Scenario> = {
    MISSING_PARAMETER: { handler: detail },
    INVALID_PARAMETER: { handler: list, query: { list_type: 'popular' } },
    METHOD_NOT_ALLOWED: { handler: home, method: 'POST' },
    SCREEN_NOT_FOUND: { handler: notFound },
    MOVIE_NOT_FOUND: { handler: detail, query: { movie_id: '42' }, arrange: () => fakeTmdb.failStatus(404) },
    CONTENT_UNAVAILABLE: {
        handler: home,
        arrange: () => fakeTmdb.respond({ '/trending/movie/week': { results: [] }, '/movie/upcoming': upcoming }),
    },
    RATE_LIMITED: { handler: home, arrange: () => fakeTmdb.failStatus(429) },
    UPSTREAM_TIMEOUT: { handler: home, arrange: () => fakeTmdb.failCode('ECONNABORTED') },
    UPSTREAM_ERROR: { handler: home, arrange: () => fakeTmdb.failStatus(500) },
    SERVICE_MISCONFIGURED: { handler: home, arrange: () => vi.stubEnv('TMDB_API_KEY', '') },
    MAINTENANCE: { handler: home, arrange: () => vi.stubEnv('MAINTENANCE_MODE', 'true') },
    INTERNAL_ERROR: { handler: home, arrange: () => fakeTmdb.fail(new TypeError('boom')) },
    SIGN_IN_REQUIRED: { handler: favorite, method: 'POST' },
    SESSION_EXPIRED: {
        handler: favorite,
        method: 'POST',
        headers: { authorization: 'Bearer stale-session' },
        body: { movie_id: '42', favorite: true },
        arrange: () => fakeTmdb.respond({ '/account': tmdbError(401, 3) }),
    },
    SIGN_IN_FAILED: {
        handler: session,
        method: 'POST',
        body: SIGN_IN_BODY,
        arrange: () => {
            vi.stubEnv('AUTH_SIGNING_SECRET', SIGNING_KEY);
            fakeTmdb.respond({ '/authentication/session/new': tmdbError(401, 17) });
        },
    },
};

/** Codes that are decided before TMDB is contacted. */
const NO_TMDB_CALL: ErrorCode[] = [
    'MISSING_PARAMETER',
    'INVALID_PARAMETER',
    'METHOD_NOT_ALLOWED',
    'SCREEN_NOT_FOUND',
    'SERVICE_MISCONFIGURED',
    'MAINTENANCE',
    'SIGN_IN_REQUIRED',
];

function run({ handler, query = {}, method, headers, body }: Scenario, extra: Record<string, string> = {}) {
    return invoke(handler, query, '/', { method, headers: { ...headers, ...extra }, body });
}

const screens: [string, Handler, Record<string, string>][] = [
    ['home', home, {}],
    ['movie_detail_screen', detail, { movie_id: '42' }],
    ['movie_list_screen', list, { list_type: 'trending' }],
    ['search', search, { query: 'answer' }],
    ['search without a query', search, {}],
];

beforeEach(() => fakeTmdb.reset());

describe('error catalog', () => {
    it('holds exactly the codes in the contract table', () => {
        expect(Object.keys(ERROR_CATALOG).sort()).toEqual(TABLE.map(([code]) => code).sort());
    });

    it.each(TABLE)('defines %s as the table does', (code, status, retryable, retryAfter, title, message) => {
        expect(ERROR_CATALOG[code]).toEqual({
            status,
            retryable,
            ...(retryAfter !== undefined && { retryAfter }),
            title,
            message,
        });
    });

    it.each(Object.entries(ERROR_CATALOG))('keeps the user text of %s short and clean', (code, { title, message }) => {
        expect(title.length).toBeLessThanOrEqual(40);
        expect(message.length).toBeLessThanOrEqual(160);
        // Signing in is with the user's TMDB account, so that one text names it.
        const upstreamDetail = code === 'SIGN_IN_REQUIRED' ? /http|api_key/i : /tmdb|http|api_key/i;
        expect(`${title} ${message}`).not.toMatch(upstreamDetail);
    });

    it('cannot be changed at runtime', () => {
        expect(Object.isFrozen(ERROR_CATALOG)).toBe(true);
        expect(Object.values(ERROR_CATALOG).every((spec) => Object.isFrozen(spec))).toBe(true);
    });
});

describe('error matrix', () => {
    describe.each(TABLE)('%s', (code, status, retryable, retryAfter, title, message) => {
        const scenario = SCENARIOS[code];
        const error = { code, title, message, retryable };

        beforeEach(() => scenario.arrange?.());

        it('sends the envelope, status and headers', async () => {
            const response = await run(scenario);

            expect(response.status).toBe(status);
            expect(response.body).toStrictEqual({ error });
            expect(response.headers).toStrictEqual({
                'content-type': 'application/json; charset=utf-8',
                'cache-control': 'no-store',
                ...(retryAfter !== undefined && { 'retry-after': String(retryAfter) }),
                ...(code === 'METHOD_NOT_ALLOWED' && { allow: 'GET, HEAD' }),
            });
            if (NO_TMDB_CALL.includes(code)) {
                expect(fakeTmdb.requestedPaths()).toEqual([]);
            }
        });

        it('adds the x-vercel-id header as request_id', async () => {
            const { body } = await run(scenario, { 'x-vercel-id': 'sin1::abc-123' });

            expect(body).toStrictEqual({ error: { ...error, request_id: 'sin1::abc-123' } });
        });
    });
});

describe('TMDB failure mapping', () => {
    it.each<[string, () => void, ErrorCode]>([
        ['401', () => fakeTmdb.failStatus(401), 'SERVICE_MISCONFIGURED'],
        ['403', () => fakeTmdb.failStatus(403), 'SERVICE_MISCONFIGURED'],
        ['404 outside a movie call', () => fakeTmdb.failStatus(404), 'UPSTREAM_ERROR'],
        ['another 4xx', () => fakeTmdb.failStatus(422), 'UPSTREAM_ERROR'],
        ['503', () => fakeTmdb.failStatus(503), 'UPSTREAM_ERROR'],
        ['a network error', () => fakeTmdb.fail(), 'UPSTREAM_ERROR'],
        ['ETIMEDOUT', () => fakeTmdb.failCode('ETIMEDOUT'), 'UPSTREAM_TIMEOUT'],
    ])('maps %s to its code', async (_label, arrange, code) => {
        arrange();

        const { status, body } = await invoke(home);

        expect(status).toBe(ERROR_CATALOG[code].status);
        expect(body).toEqual(errorBody(code));
    });

    it.each([
        ['detail', detail, { movie_id: '42' }, 'MOVIE_NOT_FOUND'],
        ['similar list', list, { list_type: 'similar', movie_id: '42' }, 'MOVIE_NOT_FOUND'],
        ['trending list', list, { list_type: 'trending' }, 'UPSTREAM_ERROR'],
        ['upcoming list', list, { list_type: 'upcoming' }, 'UPSTREAM_ERROR'],
        ['search', search, { query: 'answer' }, 'UPSTREAM_ERROR'],
    ] as [string, Handler, Record<string, string>, ErrorCode][])(
        'maps a TMDB 404 on %s',
        async (_label, handler, query, code) => {
            fakeTmdb.failStatus(404);

            const { body } = await invoke(handler, query);

            expect(body).toEqual(errorBody(code));
        },
    );

    it.each<[string, Record<string, string>, string]>([
        ['passes on a numeric value', { 'retry-after': '7' }, '7'],
        ['defaults when the header is a date', { 'retry-after': 'Wed, 21 Oct 2026 07:28:00 GMT' }, '10'],
        ['defaults when the header is not a whole number', { 'retry-after': '1.5' }, '10'],
        ['defaults when the header is empty', { 'retry-after': '' }, '10'],
    ])('Retry-After on 429 %s', async (_label, tmdbHeaders, expected) => {
        fakeTmdb.failStatus(429, tmdbHeaders);

        const { headers } = await invoke(home);

        expect(headers['retry-after']).toBe(expected);
    });

    it('gives every TMDB request an 8 second timeout', async () => {
        fakeTmdb.respond({ '/trending/movie/week': trending, '/movie/upcoming': upcoming });

        await invoke(home);

        expect(fakeTmdb.requestTimeouts()).toEqual([8000, 8000]);
    });

    const noId = { results: [{ ...movie(1), id: undefined }] };
    const noRating = { results: [{ ...movie(1), vote_average: null }] };

    it.each<[string, Handler, Record<string, string>, Record<string, unknown>]>([
        ['home results that are not an array', home, {}, { '/trending/movie/week': { results: 'x' } }],
        ['a home movie without an id', home, {}, { '/trending/movie/week': noId, '/movie/upcoming': upcoming }],
        ['an empty detail body', detail, { movie_id: '42' }, { '/movie/42': null }],
        ['a detail without a rating', detail, { movie_id: '42' }, { '/movie/42': { ...movieDetail, vote_average: undefined }, '/movie/42/similar': similar }],
        ['a similar movie without an id', detail, { movie_id: '42' }, { '/movie/42': movieDetail, '/movie/42/similar': noId }],
        ['a list without results', list, { list_type: 'trending' }, { '/trending/movie/week': {} }],
        ['a list movie without a rating', list, { list_type: 'trending' }, { '/trending/movie/week': noRating }],
        ['a null search result', search, { query: 'a' }, { '/search/movie': { results: [null] } }],
    ])('returns UPSTREAM_ERROR for %s', async (_label, handler, query, routes) => {
        fakeTmdb.respond(routes);

        const { status, body } = await invoke(handler, query);

        expect(status).toBe(502);
        expect(body).toEqual(errorBody('UPSTREAM_ERROR'));
    });

    it('does not require a rating in search results', async () => {
        fakeTmdb.respond({ '/search/movie': noRating });

        const { status } = await invoke(search, { query: 'a' });

        expect(status).toBe(200);
    });

    it('keeps upstream details and the key out of the response and the logs', async () => {
        const lines: string[] = [];
        vi.spyOn(console, 'error').mockImplementation((line) => lines.push(String(line)));
        fakeTmdb.fail(new Error('failed for https://api.themoviedb.org/3/x?api_key=test-key'));

        const { body } = await invoke(home);

        expect(JSON.stringify(body)).not.toMatch(/tmdb|themoviedb|test-key|stack/i);
        expect(lines.join('\n')).toContain('api_key=***');
        expect(lines.join('\n')).not.toContain('test-key');
    });
});

describe('search query validation', () => {
    it.each<[string, unknown]>([
        ['an array', ['a', 'b']],
        ['longer than 200 characters', 'a'.repeat(201)],
    ])('returns INVALID_PARAMETER without calling TMDB when query is %s', async (_label, query) => {
        const { status, body } = await invoke(search, { query } as Record<string, string>);

        expect(status).toBe(400);
        expect(body).toEqual(errorBody('INVALID_PARAMETER'));
        expect(fakeTmdb.requestedPaths()).toEqual([]);
    });

    it.each([
        ['200 characters', 'a'.repeat(200)],
        ['200 emoji', '🎬'.repeat(200)],
    ])('accepts %s', async (_label, query) => {
        fakeTmdb.respond({ '/search/movie': { results: [] } });

        const { status } = await invoke(search, { query });

        expect(status).toBe(200);
    });
});

describe('methods', () => {
    const endpoints: [string, Handler][] = [
        ['index', index],
        ['not_found', notFound],
        ...screens.map(([name, handler]): [string, Handler] => [name, handler]),
    ];

    describe.each(endpoints)('%s', (_name, handler) => {
        it.each(['POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'])('rejects %s with the full envelope', async (method) => {
            const { status, body, headers } = await invoke(handler, {}, '/', { method });

            expect(status).toBe(405);
            expect(body).toEqual(errorBody('METHOD_NOT_ALLOWED'));
            expect(headers.allow).toBe('GET, HEAD');
            expect(fakeTmdb.requestedPaths()).toEqual([]);
        });
    });
});

describe('maintenance mode', () => {
    beforeEach(() => vi.stubEnv('MAINTENANCE_MODE', 'true'));

    it.each(screens)('closes %s before calling TMDB', async (_name, handler, query) => {
        const { status, body } = await invoke(handler, query);

        expect(status).toBe(503);
        expect(body).toEqual(errorBody('MAINTENANCE'));
        expect(fakeTmdb.requestedPaths()).toEqual([]);
    });

    it('keeps the health check up and reports it', async () => {
        const { status, body } = await invoke(index);

        expect(status).toBe(200);
        expect(body.maintenance).toBe(true);
    });

    it.each(['false', 'TRUE', '1', ''])('stays off when the variable is "%s"', async (value) => {
        vi.stubEnv('MAINTENANCE_MODE', value);

        const { body } = await invoke(index);

        expect(body.maintenance).toBe(false);
    });
});

describe('precedence', () => {
    beforeEach(() => vi.stubEnv('MAINTENANCE_MODE', 'true'));

    it.each<[string, Handler, Record<string, string>, string, ErrorCode]>([
        ['405 over 404', notFound, {}, 'POST', 'METHOD_NOT_ALLOWED'],
        ['405 over maintenance', home, {}, 'POST', 'METHOD_NOT_ALLOWED'],
        ['405 over a parameter error', detail, {}, 'DELETE', 'METHOD_NOT_ALLOWED'],
        ['404 over maintenance', notFound, {}, 'GET', 'SCREEN_NOT_FOUND'],
        ['maintenance over a missing parameter', detail, {}, 'GET', 'MAINTENANCE'],
        ['maintenance over an invalid parameter', list, { list_type: 'popular' }, 'GET', 'MAINTENANCE'],
    ])('puts %s', async (_label, handler, query, method, code) => {
        const { body } = await invoke(handler, query, '/', { method });

        expect(body).toEqual(errorBody(code));
    });

    it('puts a parameter error over a missing key', async () => {
        vi.stubEnv('MAINTENANCE_MODE', '');
        vi.stubEnv('TMDB_API_KEY', '');

        const { body } = await invoke(detail, { movie_id: 'abc' });

        expect(body).toEqual(errorBody('INVALID_PARAMETER'));
    });
});

/**
 * HEAD bodies are dropped by the HTTP layer, so this runs the handlers behind a
 * real Node server with the two response helpers Vercel adds.
 */
async function overHttp(handler: Handler, method: string, query: Record<string, string>) {
    const server = createServer((req, res) => {
        const vercelRes = Object.assign(res, {
            status(code: number) {
                res.statusCode = code;
                return vercelRes;
            },
            json(body: unknown) {
                res.end(JSON.stringify(body));
                return vercelRes;
            },
        });
        void handler(Object.assign(req, { query }) as never, vercelRes as never);
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    try {
        return await new Promise<{ status?: number; headers: IncomingHttpHeaders; body: string }>((resolve, reject) => {
            const { port } = server.address() as AddressInfo;
            request({ host: '127.0.0.1', port, method, agent: false }, (res) => {
                let body = '';
                res.on('data', (chunk) => (body += chunk));
                res.on('end', () => {
                    const { date, 'content-length': _length, 'transfer-encoding': _encoding, ...headers } = res.headers;
                    resolve({ status: res.statusCode, headers, body });
                });
            })
                .on('error', reject)
                .end();
        });
    } finally {
        server.close();
    }
}

describe('HEAD', () => {
    // Only codes reachable with a GET: HEAD does not apply to the POST endpoints.
    it.each(TABLE.map(([code]) => code).filter((code) => !SCENARIOS[code].method))(
        'answers %s like GET, without a body',
        async (code) => {
            const { handler, query = {}, arrange } = SCENARIOS[code];
            arrange?.();

            const get = await overHttp(handler, 'GET', query);
            const head = await overHttp(handler, 'HEAD', query);

            expect(get.status).toBe(ERROR_CATALOG[code].status);
            expect(JSON.parse(get.body)).toEqual(errorBody(code));
            expect(head.status).toBe(get.status);
            expect(head.headers).toEqual(get.headers);
            expect(head.body).toBe('');
        },
    );

    it('answers a screen like GET, without a body', async () => {
        fakeTmdb.respond({ '/trending/movie/week': trending, '/movie/upcoming': upcoming });

        const head = await overHttp(home, 'HEAD', {});

        expect(head.status).toBe(200);
        expect(head.body).toBe('');
    });
});
