/**
 * Replacement for the `axios` module that never touches the network.
 *
 * It keeps the real axios and only swaps its adapter (the part that sends the
 * request), so `axios.get(url)`, `axios.create({ baseURL })`, `params` and
 * interceptors all keep working. Tests therefore don't depend on how the code
 * under test builds its TMDB requests.
 *
 * Use it in a test file with:
 *   vi.mock('axios', () => import('./helpers/axiosMock'));
 */
import { vi } from 'vitest';
import type { AxiosAdapter } from 'axios';

const actual = await vi.importActual<typeof import('axios')>('axios');
const axios = actual.default;

/** TMDB path (without the `/3` version prefix) mapped to the JSON body to return. */
type Routes = Record<string, unknown>;

/** A route value that makes TMDB answer with an error body instead of data. */
class TmdbFailure {
    constructor(readonly status: number, readonly data: unknown) {}
}

export function tmdbError(status: number, statusCode?: number, extra: Record<string, unknown> = {}) {
    return new TmdbFailure(status, {
        success: false,
        status_code: statusCode,
        status_message: 'Upstream detail that must stay server-side',
        ...extra,
    });
}

export interface TmdbCall {
    method: string;
    path: string;
    /** Query parameters without `api_key`, which every call must carry. */
    query: Record<string, string>;
    body?: unknown;
}

let routes: Routes = {};
let calls: TmdbCall[] = [];
type Failure =
    | { kind: 'error'; error: Error }
    | { kind: 'status'; status: number; headers: Record<string, string> }
    | { kind: 'code'; code: string; message: string };

let failure: Failure | undefined;
let paths: string[] = [];
let timeouts: (number | undefined)[] = [];

const adapter: AxiosAdapter = async (config) => {
    const url = new URL(axios.getUri(config), 'https://tmdb.invalid');
    const path = url.pathname.replace(/^\/3(?=\/)/, '');
    paths.push(path);
    timeouts.push(config.timeout);
    const { api_key: apiKey, ...query } = Object.fromEntries(url.searchParams);
    calls.push({
        method: String(config.method).toUpperCase(),
        path: apiKey ? path : `${path} (without api_key)`,
        query,
        ...(config.data !== undefined && { body: JSON.parse(config.data) }),
    });

    if (failure?.kind === 'error') {
        throw failure.error;
    }
    if (failure?.kind === 'code') {
        throw new actual.AxiosError(failure.message, failure.code, config);
    }
    if (failure?.kind === 'status') {
        const { status, headers } = failure;
        throw new actual.AxiosError(`Request failed with status code ${status}`, 'ERR_BAD_RESPONSE', config, undefined, {
            data: { status_message: 'Upstream detail that must stay server-side' },
            status,
            statusText: '',
            headers,
            config,
        });
    }
    if (!(path in routes)) {
        throw new actual.AxiosError(`No fake TMDB response for ${path}`, 'ERR_BAD_REQUEST', config, undefined, {
            data: { status_message: 'Not found' },
            status: 404,
            statusText: 'Not Found',
            headers: {},
            config,
        });
    }
    const route = routes[path];
    if (route instanceof TmdbFailure) {
        const { status, data } = route;
        throw new actual.AxiosError(`Request failed with status code ${status}`, 'ERR_BAD_REQUEST', config, undefined, {
            data,
            status,
            statusText: '',
            headers: {},
            config,
        });
    }
    return {
        data: structuredClone(route),
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
    };
};

// Set before the code under test loads, so instances made by axios.create() inherit it.
axios.defaults.adapter = adapter;

export const fakeTmdb = {
    reset() {
        routes = {};
        failure = undefined;
        paths = [];
        calls = [];
        timeouts = [];
    },
    respond(next: Routes) {
        routes = next;
    },
    /** Make every following request reject, by default as axios reports a network error. */
    fail(error?: Error) {
        failure = error
            ? { kind: 'error', error }
            : { kind: 'code', code: 'ERR_NETWORK', message: 'Network Error' };
    },
    /** Make every following request get this TMDB status. Header names must be lower case. */
    failStatus(status: number, headers: Record<string, string> = {}) {
        failure = { kind: 'status', status, headers };
    },
    /** Make every following request reject with an axios error code, such as a timeout. */
    failCode(code: string) {
        failure = { kind: 'code', code, message: `Request failed: ${code}` };
    },
    /** The `timeout` option of each request made. */
    requestTimeouts(): (number | undefined)[] {
        return [...timeouts];
    },
    /** Every request made, in order. */
    calls(): TmdbCall[] {
        return [...calls];
    },
    /** Requested paths, sorted so that request order doesn't matter. */
    requestedPaths(): string[] {
        return [...paths].sort();
    },
};

// Named exports are listed one by one: `export * from 'axios'` here would import
// this mock from inside itself and hang the test run.
export const { AxiosError, AxiosHeaders, CanceledError, HttpStatusCode, isAxiosError, isCancel, all, spread } = actual;
export default axios;
