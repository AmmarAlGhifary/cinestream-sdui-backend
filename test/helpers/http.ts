import type { VercelRequest, VercelResponse } from '@vercel/node';

type Handler = (req: VercelRequest, res: VercelResponse) => unknown;

/**
 * Call a Vercel handler with a minimal fake request and response.
 * `body` is what a client would receive: the value passed to `res.json`
 * after a JSON round trip (so `undefined` fields are dropped).
 */
export async function invoke(handler: Handler, query: Record<string, string> = {}, url = '/') {
    let body: unknown;
    let sent = 0;

    const res = {
        statusCode: 200,
        status(code: number) {
            this.statusCode = code;
            return this;
        },
        json(payload: unknown) {
            sent += 1;
            body = JSON.parse(JSON.stringify(payload));
            return this;
        },
    };
    const req = { method: 'GET', url, query, headers: {} };

    await handler(req as unknown as VercelRequest, res as unknown as VercelResponse);

    if (sent !== 1) {
        throw new Error(`Expected exactly one res.json() call, got ${sent}`);
    }
    return { status: res.statusCode, body: body as any };
}
