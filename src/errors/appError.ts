/**
 * The error contract shared with the Android client. Codes, statuses and
 * `retryable` flags are final: the client maps on them. `title` and `message`
 * are shown to users, so they must never carry upstream details.
 */
export type ErrorCode =
    | "MISSING_PARAMETER"
    | "INVALID_PARAMETER"
    | "METHOD_NOT_ALLOWED"
    | "SCREEN_NOT_FOUND"
    | "MOVIE_NOT_FOUND"
    | "CONTENT_UNAVAILABLE"
    | "RATE_LIMITED"
    | "UPSTREAM_TIMEOUT"
    | "UPSTREAM_ERROR"
    | "SERVICE_MISCONFIGURED"
    | "MAINTENANCE"
    | "INTERNAL_ERROR";

export interface ErrorSpec {
    readonly status: number;
    readonly retryable: boolean;
    /** Default `Retry-After` in seconds; the header is omitted when unset. */
    readonly retryAfter?: number;
    readonly title: string;
    readonly message: string;
}

function entry(spec: ErrorSpec): ErrorSpec {
    return Object.freeze(spec);
}

export const ERROR_CATALOG: Readonly<Record<ErrorCode, ErrorSpec>> = Object.freeze({
    MISSING_PARAMETER: entry({
        status: 400,
        retryable: false,
        title: "Something's missing",
        message: "We couldn't open this page because some information is missing.",
    }),
    INVALID_PARAMETER: entry({
        status: 400,
        retryable: false,
        title: "Invalid request",
        message: "We couldn't open this page. Please go back and try again.",
    }),
    METHOD_NOT_ALLOWED: entry({
        status: 405,
        retryable: false,
        title: "Not supported",
        message: "This action isn't supported.",
    }),
    SCREEN_NOT_FOUND: entry({
        status: 404,
        retryable: false,
        title: "Page not found",
        message: "This page doesn't exist or has moved.",
    }),
    MOVIE_NOT_FOUND: entry({
        status: 404,
        retryable: false,
        title: "Movie not found",
        message: "We couldn't find this movie. It may have been removed.",
    }),
    CONTENT_UNAVAILABLE: entry({
        status: 503,
        retryable: true,
        retryAfter: 30,
        title: "Nothing to show yet",
        message: "We couldn't load movies right now. Please try again in a moment.",
    }),
    RATE_LIMITED: entry({
        status: 429,
        retryable: true,
        retryAfter: 10,
        title: "Too many requests",
        message: "We're getting a lot of requests. Please try again in a few seconds.",
    }),
    UPSTREAM_TIMEOUT: entry({
        status: 504,
        retryable: true,
        title: "Taking too long",
        message: "The movie service is slow to respond. Please try again.",
    }),
    UPSTREAM_ERROR: entry({
        status: 502,
        retryable: true,
        title: "Service problem",
        message: "We couldn't reach the movie service. Please try again.",
    }),
    SERVICE_MISCONFIGURED: entry({
        status: 503,
        retryable: false,
        title: "Service unavailable",
        message: "CineStream is temporarily unavailable. We're working on it.",
    }),
    MAINTENANCE: entry({
        status: 503,
        retryable: true,
        retryAfter: 300,
        title: "Under maintenance",
        message: "CineStream is being updated. Please check back soon.",
    }),
    INTERNAL_ERROR: entry({
        status: 500,
        retryable: true,
        title: "Something went wrong",
        message: "An unexpected error occurred. Please try again.",
    }),
});

interface AppErrorOptions {
    /** Explanation for the server log. Never sent to the client. */
    detail?: string;
    /** The underlying error, for the server log. */
    cause?: unknown;
    /** Overrides the catalog's `Retry-After`, in seconds. */
    retryAfter?: number;
}

/** A failure with a known place in the error contract. */
export class AppError extends Error {
    readonly code: ErrorCode;
    readonly retryAfter?: number;

    constructor(code: ErrorCode, { detail, cause, retryAfter }: AppErrorOptions = {}) {
        super(detail ?? code, { cause });
        this.name = "AppError";
        this.code = code;
        this.retryAfter = retryAfter;
    }
}
