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

let routes: Routes = {};
let failure: Error | undefined;
let paths: string[] = [];

const adapter: AxiosAdapter = async (config) => {
    const url = new URL(axios.getUri(config), 'https://tmdb.invalid');
    const path = url.pathname.replace(/^\/3(?=\/)/, '');
    paths.push(path);

    if (failure) {
        throw failure;
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
    return {
        data: structuredClone(routes[path]),
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
    },
    respond(next: Routes) {
        routes = next;
    },
    /** Make every following request reject. */
    fail(error: Error = new Error('Network Error')) {
        failure = error;
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
