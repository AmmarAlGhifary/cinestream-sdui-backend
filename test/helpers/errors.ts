import { ERROR_CATALOG, type ErrorCode } from '../../src/errors/appError';

/** The error body for `code`, as a client receives it without a request id. */
export function errorBody(code: ErrorCode) {
    const { title, message, retryable } = ERROR_CATALOG[code];
    return { error: { code, title, message, retryable } };
}
