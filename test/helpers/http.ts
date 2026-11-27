import type { VercelRequest, VercelResponse } from '@vercel/node';

export type Handler = (req: VercelRequest, res: VercelResponse) => unknown;

interface RequestOptions {
    method?: string;
    headers?: Record<string, string>;
    /** The parsed request body, as Vercel provides it. */
    body?: unknown;
    /** Make reading `req.body` throw, as Vercel does for malformed JSON. */
    invalidJson?: string;
}

/**
 * Call a Vercel handler with a minimal fake request and response.
 * `body` is what a client would receive: the value passed to `res.json`
 * after a JSON round trip (so `undefined` fields are dropped).
 * Response header names are lower-cased.
 */
export async function invoke(
    handler: Handler,
    query: Record<string, string> = {},
    url = '/',
    { method = 'GET', headers = {}, body: requestBody, invalidJson }: RequestOptions = {},
) {
    let body: unknown;
    let sent = 0;
    const responseHeaders: Record<string, string> = {};

    const res = {
        statusCode: 200,
        setHeader(name: string, value: string) {
            responseHeaders[name.toLowerCase()] = value;
            return this;
        },
        status(code: number) {
            this.statusCode = code;
            return this;
        },
        json(payload: unknown) {
            sent += 1;
            body = JSON.parse(JSON.stringify(payload));
            return this;
        },
        end() {
            sent += 1;
            return this;
        },
    };
    const req = {
        method,
        url,
        query,
        headers,
        get body() {
            if (invalidJson !== undefined) {
                throw new Error(`Invalid JSON: ${invalidJson}`);
            }
            return requestBody;
        },
    };

    await handler(req as unknown as VercelRequest, res as unknown as VercelResponse);

    if (sent !== 1) {
        throw new Error(`Expected exactly one res.json() or res.end() call, got ${sent}`);
    }
    return { status: res.statusCode, body: body as any, headers: responseHeaders };
}
