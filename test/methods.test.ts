import { beforeEach, describe, expect, it, vi } from 'vitest';
import requestTokenHandler from '../api/auth/request_token';
import sessionHandler from '../api/auth/session';
import favoriteHandler from '../api/favorite';
import { fakeTmdb } from './helpers/axiosMock';
import { errorBody } from './helpers/errors';
import { invoke, type Handler } from './helpers/http';

vi.mock('axios', () => import('./helpers/axiosMock'));

const ALL = ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'];

// The GET endpoints keep `Allow: GET, HEAD`; errors.test.ts covers them.
describe.each<[string, Handler, string[]]>([
    ['/api/favorite', favoriteHandler, ['POST']],
    ['/api/auth/session', sessionHandler, ['POST', 'DELETE']],
    ['/api/auth/request_token', requestTokenHandler, ['POST']],
])('methods of %s', (_route, handler, allowed) => {
    beforeEach(() => fakeTmdb.reset());

    it.each(ALL.filter((method) => !allowed.includes(method)))('rejects %s', async (method) => {
        const { status, body, headers } = await invoke(handler, {}, '/', { method });

        expect(status).toBe(405);
        expect(body).toStrictEqual(errorBody('METHOD_NOT_ALLOWED'));
        expect(headers.allow).toBe(allowed.join(', '));
        expect(fakeTmdb.calls()).toEqual([]);
    });

    it.each(allowed)('accepts %s', async (method) => {
        const { status } = await invoke(handler, {}, '/', { method });

        expect(status).not.toBe(405);
    });

    it('reports a wrong method before maintenance', async () => {
        vi.stubEnv('MAINTENANCE_MODE', 'true');

        const { status } = await invoke(handler, {}, '/', { method: 'GET' });

        expect(status).toBe(405);
    });
});
