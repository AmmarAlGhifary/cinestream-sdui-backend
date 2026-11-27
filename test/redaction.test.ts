import { beforeEach, describe, expect, it, vi } from 'vitest';
import requestTokenHandler from '../api/auth/request_token';
import sessionHandler from '../api/auth/session';
import favoriteHandler from '../api/favorite';
import detailHandler from '../api/movie_detail_screen';
import { logger } from '../src/logging/logger';
import { account, newSession, requestToken, SESSION, SIGNED_IN, TOKEN } from './helpers/account';
import { fakeTmdb, tmdbError } from './helpers/axiosMock';
import { invoke } from './helpers/http';
import { movieDetail, similar } from './fixtures/movies';

vi.mock('axios', () => import('./helpers/axiosMock'));

let lines: string[] = [];

beforeEach(() => {
    fakeTmdb.reset();
    lines = [];
    for (const level of ['log', 'info', 'warn', 'error', 'debug'] as const) {
        vi.spyOn(console, level).mockImplementation((...args) => void lines.push(args.map(String).join(' ')));
    }
});

function expectNoSecrets() {
    const log = lines.join('\n');
    expect(lines.length).toBeGreaterThan(0);
    expect(log).not.toContain(SESSION);
    expect(log).not.toContain(TOKEN);
    expect(log).not.toContain('test-key');
}

const routes = {
    '/authentication/token/new': requestToken,
    '/authentication/session/new': newSession,
    '/authentication/session': { success: true },
    '/account': account,
    '/account/548/favorite': { success: true },
    '/movie/42': movieDetail,
    '/movie/42/similar': similar,
    '/movie/42/account_states': { favorite: true },
};

/** Every flow that handles a credential. */
async function runAllFlows() {
    const post = { method: 'POST' };
    return [
        await invoke(requestTokenHandler, {}, '/', post),
        await invoke(sessionHandler, {}, '/', { ...post, body: { request_token: TOKEN } }),
        await invoke(favoriteHandler, {}, '/', { ...post, headers: SIGNED_IN, body: { movie_id: '42', favorite: true } }),
        await invoke(detailHandler, { movie_id: '42' }, '/', { headers: SIGNED_IN }),
        await invoke(sessionHandler, {}, '/', { method: 'DELETE', headers: SIGNED_IN }),
    ];
}

describe('credentials never reach the logs', () => {
    it('on successful flows', async () => {
        fakeTmdb.respond(routes);

        const responses = await runAllFlows();

        expect(responses.map((r) => r.status)).toEqual([200, 200, 200, 200, 204]);
        expectNoSecrets();
        expect(lines.join('\n')).toContain('session_id=***');
    });

    /** A hostile upstream that quotes every credential back. */
    const echo = {
        session_id: SESSION,
        request_token: TOKEN,
        nested: [{ Authorization: `Bearer ${SESSION}` }],
        note: `Bearer ${SESSION} at /authenticate/${TOKEN}?session_id=${SESSION}&request_token=${TOKEN}`,
    };

    it.each([
        [401, 3],
        [401, 7],
        [404, 34],
        [500, 11],
    ])('when TMDB answers %i (status_code %i) and echoes them', async (status, statusCode) => {
        const failure = tmdbError(status, statusCode, echo);
        fakeTmdb.respond(Object.fromEntries(Object.keys(routes).map((path) => [path, failure])));

        const responses = await runAllFlows();

        expectNoSecrets();
        expect(JSON.stringify(responses.map((r) => r.body))).not.toContain(SESSION);
    });

    it('when an error message carries them', async () => {
        fakeTmdb.fail(new Error(
            `failed: https://api.themoviedb.org/3/account?api_key=test-key&session_id=${SESSION}` +
            `&request_token=${TOKEN} with Authorization: Bearer ${SESSION}`,
        ));

        await runAllFlows();

        expectNoSecrets();
    });

    it('when a client puts them in the query string', async () => {
        fakeTmdb.respond(routes);

        await invoke(detailHandler, { movie_id: '42', session_id: SESSION, request_token: TOKEN });

        expectNoSecrets();
    });

    it('when the body is malformed and the parse error quotes it', async () => {
        await invoke(sessionHandler, {}, '/', { method: 'POST', invalidJson: `{"request_token":"${TOKEN}"` });

        expectNoSecrets();
    });

    it('from keys or text handed straight to the logger', () => {
        logger.info(`Authorization: Bearer ${SESSION}`, {
            authorization: `Bearer ${SESSION}`,
            session_id: [SESSION, SESSION],
            deep: { request_token: TOKEN, url: `https://x.invalid/?SESSION_ID=${SESSION}` },
        });

        expectNoSecrets();
    });
});
