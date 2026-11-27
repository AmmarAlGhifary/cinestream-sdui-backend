import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import handler from '../api/index';
import { invoke } from './helpers/http';

describe('GET /api/index', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-01-02T03:04:05.678Z'));
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('returns the health check payload', async () => {
        vi.stubEnv('VERCEL_ENV', '');

        const { status, body } = await invoke(handler);

        expect(status).toBe(200);
        expect(body).toEqual({
            status: 'ok',
            message: 'CineStream SDUI BFF is running!',
            version: '1.2.0',
            environment: 'development',
            maintenance: false,
            timestamp: '2026-01-02T03:04:05.678Z',
            endpoints: {
                home: '/api/home',
                movie_detail_screen: '/api/movie_detail_screen',
                movie_list_screen: '/api/movie_list_screen',
                search: '/api/search',
            },
        });
    });

    it('reports the Vercel environment', async () => {
        vi.stubEnv('VERCEL_ENV', 'production');

        const { body } = await invoke(handler);

        expect(body.environment).toBe('production');
    });
});
