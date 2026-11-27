import type { AxiosError } from 'axios';
import { AppError } from '../errors/appError';

const TIMEOUT_CODES = ["ECONNABORTED", "ETIMEDOUT"];

function isAxiosFailure(error: unknown): error is AxiosError {
    return (error as Partial<AxiosError> | null | undefined)?.isAxiosError === true;
}

/** TMDB's `Retry-After` when it is a whole number of seconds. */
function numericSeconds(value: unknown): number | undefined {
    return /^[0-9]{1,9}$/.test(String(value)) ? Number(value) : undefined;
}

/**
 * Place any thrown value in the error contract. Axios errors only come from
 * TMDB requests; failures that depend on which request was made (such as a
 * missing movie) are already `AppError`s by the time they get here.
 */
export function toAppError(error: unknown): AppError {
    if (error instanceof AppError) {
        return error;
    }
    if (!isAxiosFailure(error)) {
        return new AppError("INTERNAL_ERROR", { cause: error });
    }

    const status = error.response?.status;

    if (status === 429) {
        const retryAfter = numericSeconds(error.response?.headers?.["retry-after"]);
        return new AppError("RATE_LIMITED", { cause: error, retryAfter });
    }
    if (status === 401 || status === 403) {
        return new AppError("SERVICE_MISCONFIGURED", { detail: "TMDB rejected the API key", cause: error });
    }
    if (error.code && TIMEOUT_CODES.includes(error.code)) {
        return new AppError("UPSTREAM_TIMEOUT", { cause: error });
    }
    return new AppError("UPSTREAM_ERROR", { cause: error });
}
