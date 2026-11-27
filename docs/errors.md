# Error Contract

How the CineStream backend reports errors, and how a client should handle them. The Android client pins its error-dialog mapping to this document.

## Error envelope

Every non-2xx response to a `GET` from our code carries this body, and so does a `METHOD_NOT_ALLOWED` response:

```json
{
  "error": {
    "code": "...",
    "title": "...",
    "message": "...",
    "retryable": true,
    "request_id": "..."
  }
}
```

| Field        | Type    | Required | Description                                                               |
| :----------- | :------ | :------- | :------------------------------------------------------------------------ |
| `code`       | string  | Yes      | Stable identifier of the scenario, listed in [Error codes](#error-codes). |
| `title`      | string  | Yes      | Human-readable heading, at most 40 characters.                            |
| `message`    | string  | Yes      | Human-readable explanation, at most 160 characters, one or two sentences. |
| `retryable`  | boolean | Yes      | Whether the request is worth retrying.                                    |
| `request_id` | string  | No       | The `x-vercel-id` of the request. For support and logs only.              |

Response headers:

| Header          | Value              | Sent                                                       |
| :-------------- | :----------------- | :--------------------------------------------------------- |
| `Content-Type`  | `application/json` | On every error response.                                   |
| `Cache-Control` | `no-store`         | On every error response.                                   |
| `Retry-After`   | Seconds            | Where the [Error codes](#error-codes) table lists a value. |
| `Allow`         | `GET, HEAD`        | With `METHOD_NOT_ALLOWED`.                                 |

A `HEAD` request gets the same status and headers as the equivalent `GET`, including `Retry-After` and `Allow`, but no body.

## Error codes

A `-` in the `Retry-After` column means the header is not listed for that code.

| Code                    | Status | Retryable | Retry-After           | Title                | Message                                                             | When it happens                                                                                                    |
| :---------------------- | :----- | :-------- | :-------------------- | :------------------- | :------------------------------------------------------------------ | :----------------------------------------------------------------------------------------------------------------- |
| `MISSING_PARAMETER`     | 400    | false     | -                     | Something's missing  | We couldn't open this page because some information is missing.     | `movie_id` is absent or empty on the detail screen, or on the list screen with `list_type=similar`                 |
| `INVALID_PARAMETER`     | 400    | false     | -                     | Invalid request      | We couldn't open this page. Please go back and try again.           | An invalid `movie_id`; an unknown or missing `list_type`; a search `query` that is an array or over 200 characters |
| `METHOD_NOT_ALLOWED`    | 405    | false     | -                     | Not supported        | This action isn't supported.                                        | Any method other than `GET` or `HEAD` (the response includes `Allow: GET, HEAD`)                                   |
| `SCREEN_NOT_FOUND`      | 404    | false     | -                     | Page not found       | This page doesn't exist or has moved.                               | Unknown path                                                                                                       |
| `MOVIE_NOT_FOUND`       | 404    | false     | -                     | Movie not found      | We couldn't find this movie. It may have been removed.              | TMDB returns 404 for the movie on the detail screen or the similar list                                            |
| `CONTENT_UNAVAILABLE`   | 503    | true      | 30                    | Nothing to show yet  | We couldn't load movies right now. Please try again in a moment.    | Home has no trending movies                                                                                        |
| `RATE_LIMITED`          | 429    | true      | TMDB's value, else 10 | Too many requests    | We're getting a lot of requests. Please try again in a few seconds. | TMDB returns 429                                                                                                   |
| `UPSTREAM_TIMEOUT`      | 504    | true      | -                     | Taking too long      | The movie service is slow to respond. Please try again.             | TMDB takes longer than 8 s                                                                                         |
| `UPSTREAM_ERROR`        | 502    | true      | -                     | Service problem      | We couldn't reach the movie service. Please try again.              | TMDB 5xx, other unexpected TMDB errors, network failure, or a malformed TMDB response                              |
| `SERVICE_MISCONFIGURED` | 503    | false     | -                     | Service unavailable  | CineStream is temporarily unavailable. We're working on it.         | `TMDB_API_KEY` is unset, or TMDB rejects our key (401 or 403)                                                      |
| `MAINTENANCE`           | 503    | true      | 300                   | Under maintenance    | CineStream is being updated. Please check back soon.                | `MAINTENANCE_MODE=true` (the index health check stays 200 and reports maintenance)                                 |
| `INTERNAL_ERROR`        | 500    | true      | -                     | Something went wrong | An unexpected error occurred. Please try again.                     | Any other unexpected error                                                                                         |

## Parameter rules

A valid `movie_id` is a single positive integer of 1 to 10 digits without a leading zero: `^[1-9][0-9]{0,9}$`.

- An absent or empty `movie_id` returns `MISSING_PARAMETER`.
- Anything else that doesn't match returns `INVALID_PARAMETER`, including an array, `0`, a leading zero, a negative number, a decimal, spaces or any other character.

## Precedence

When several errors apply, the first one in this list is returned:

1. `METHOD_NOT_ALLOWED` (405)
2. `SCREEN_NOT_FOUND` (404)
3. `MAINTENANCE` (503)
4. Parameter errors (400): `MISSING_PARAMETER` and `INVALID_PARAMETER`
5. Everything else

## Maintenance mode

With `MAINTENANCE_MODE=true`, a `GET` to a real screen returns `MAINTENANCE` before any parameter validation or TMDB call.

The index health check stays 200. Its body has a `maintenance` field, `true` during maintenance and `false` otherwise.

## Not errors

These return a 200 screen, not an error envelope:

- A search with an empty `query`.
- A search with no results.

## Client guidance

1. Map on `code` first, then on the HTTP status.
2. Treat an unknown `code` according to its status. A 5xx status means the request is retryable.
3. Respect `Retry-After`: wait at least that many seconds before retrying.
4. Don't assume every error body is JSON. Vercel platform errors, such as `FUNCTION_INVOCATION_TIMEOUT`, are `text/plain`, so the client needs a fallback based on the status.
5. Use `request_id` only for support and logs.

## Stability rules

- Codes are stable: they are never renamed or removed.
- A new scenario only adds a code, in a minor version.
- The wording of `title` and `message` may be polished at any time, so clients must not match on text.

## Examples

### Movie not found

```http
HTTP/1.1 404 Not Found
Content-Type: application/json
Cache-Control: no-store
```

```json
{
  "error": {
    "code": "MOVIE_NOT_FOUND",
    "title": "Movie not found",
    "message": "We couldn't find this movie. It may have been removed.",
    "retryable": false,
    "request_id": "sin1::abcde-1700000000000-0123456789ab"
  }
}
```

### Rate limited

`Retry-After` carries TMDB's value, or `10` when TMDB sends none.

```http
HTTP/1.1 429 Too Many Requests
Content-Type: application/json
Cache-Control: no-store
Retry-After: 10
```

```json
{
  "error": {
    "code": "RATE_LIMITED",
    "title": "Too many requests",
    "message": "We're getting a lot of requests. Please try again in a few seconds.",
    "retryable": true,
    "request_id": "sin1::fghij-1700000000000-ba9876543210"
  }
}
```
