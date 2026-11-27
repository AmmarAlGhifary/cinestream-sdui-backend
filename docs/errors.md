# Error Contract

How the CineStream backend reports errors, and how a client should handle them. The Android client pins its error-dialog mapping to this document.

## Error envelope

Every non-2xx response from our code carries this body:

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

| Header          | Value                   | Sent                                                       |
| :-------------- | :---------------------- | :--------------------------------------------------------- |
| `Content-Type`  | `application/json`      | On every error response.                                   |
| `Cache-Control` | `no-store`              | On every error response.                                   |
| `Retry-After`   | Seconds                 | Where the [Error codes](#error-codes) table lists a value. |
| `Allow`         | See [Methods](#methods) | With `METHOD_NOT_ALLOWED`.                                 |

A `HEAD` request gets the same status and headers as the equivalent `GET`, including `Retry-After` and `Allow`, but no body.

## Error codes

A `-` in the `Retry-After` column means the header is not listed for that code.

| Code                    | Status | Retryable | Retry-After           | Title                 | Message                                                             | When it happens                                                                                                                       |
| :---------------------- | :----- | :-------- | :-------------------- | :-------------------- | :------------------------------------------------------------------ | :------------------------------------------------------------------------------------------------------------------------------------ |
| `MISSING_PARAMETER`     | 400    | false     | -                     | Something's missing   | We couldn't open this page because some information is missing.     | A required parameter is absent or empty: `movie_id`, or a `favorite`, `request_token` or `sign_in_secret` body value                  |
| `INVALID_PARAMETER`     | 400    | false     | -                     | Invalid request       | We couldn't open this page. Please go back and try again.           | An invalid `movie_id`, `favorite`, `request_token`, `sign_in_secret` or body; an unknown or missing `list_type`; a bad search `query` |
| `METHOD_NOT_ALLOWED`    | 405    | false     | -                     | Not supported         | This action isn't supported.                                        | A method the endpoint doesn't accept (see [Methods](#methods))                                                                        |
| `SCREEN_NOT_FOUND`      | 404    | false     | -                     | Page not found        | This page doesn't exist or has moved.                               | Unknown path                                                                                                                          |
| `MOVIE_NOT_FOUND`       | 404    | false     | -                     | Movie not found       | We couldn't find this movie. It may have been removed.              | TMDB returns 404 for the movie on the detail screen, the similar list or a favorite                                                   |
| `CONTENT_UNAVAILABLE`   | 503    | true      | 30                    | Nothing to show yet   | We couldn't load movies right now. Please try again in a moment.    | Home has no trending movies                                                                                                           |
| `RATE_LIMITED`          | 429    | true      | TMDB's value, else 10 | Too many requests     | We're getting a lot of requests. Please try again in a few seconds. | TMDB returns 429                                                                                                                      |
| `UPSTREAM_TIMEOUT`      | 504    | true      | -                     | Taking too long       | The movie service is slow to respond. Please try again.             | TMDB takes longer than 8 s                                                                                                            |
| `UPSTREAM_ERROR`        | 502    | true      | -                     | Service problem       | We couldn't reach the movie service. Please try again.              | TMDB 5xx, other unexpected TMDB errors, network failure, or a malformed TMDB response                                                 |
| `SERVICE_MISCONFIGURED` | 503    | false     | -                     | Service unavailable   | CineStream is temporarily unavailable. We're working on it.         | `TMDB_API_KEY` is unset, or TMDB rejects our key (401 or 403); `AUTH_SIGNING_SECRET` is unset when signing in                         |
| `MAINTENANCE`           | 503    | true      | 300                   | Under maintenance     | CineStream is being updated. Please check back soon.                | `MAINTENANCE_MODE=true` (the index health check stays 200 and reports maintenance)                                                    |
| `INTERNAL_ERROR`        | 500    | true      | -                     | Something went wrong  | An unexpected error occurred. Please try again.                     | Any other unexpected error                                                                                                            |
| `SIGN_IN_REQUIRED`      | 401    | false     | -                     | Sign in required      | Sign in with your TMDB account to save favorites.                   | No bearer session on `POST /api/favorite` or `DELETE /api/auth/session`                                                               |
| `SESSION_EXPIRED`       | 401    | false     | -                     | Session expired       | Please sign in again to keep using favorites.                       | The session is malformed, or TMDB rejects it                                                                                          |
| `SIGN_IN_FAILED`        | 401    | false     | -                     | Sign-in didn't finish | We couldn't complete sign-in. Please try again.                     | `sign_in_secret` doesn't match the request token, or TMDB rejects the token or the account                                            |

## Methods

| Endpoint                  | Accepted methods |
| :------------------------ | :--------------- |
| `/api/favorite`           | `POST`           |
| `/api/auth/request_token` | `POST`           |
| `/api/auth/session`       | `POST`, `DELETE` |
| Everything else           | `GET`, `HEAD`    |

Any other method gets `METHOD_NOT_ALLOWED` with an `Allow` header listing the accepted ones, for example `Allow: POST, DELETE`.

## Parameter rules

A valid `movie_id` is a single positive integer of 1 to 10 digits without a leading zero: `^[1-9][0-9]{0,9}$`.

- An absent or empty `movie_id` returns `MISSING_PARAMETER`.
- Anything else that doesn't match returns `INVALID_PARAMETER`, including an array, `0`, a leading zero, a negative number, a decimal, spaces or any other character.

In a JSON body, `movie_id` follows the same rule and must be a string, and `favorite` must be a boolean (`true` or `false`, not a string or a number). `request_token` must be a string of at most 256 characters, and `sign_in_secret` a string.

- An absent, `null` or empty `movie_id`, `request_token` or `sign_in_secret`, and an absent or `null` `favorite`, return `MISSING_PARAMETER`.
- Any other value that breaks these rules returns `INVALID_PARAMETER`, and so does a body that is malformed JSON or not a JSON object. Send `Content-Type: application/json`.

## Precedence

When several errors apply, the first one in this list is returned:

1. `METHOD_NOT_ALLOWED` (405)
2. `SCREEN_NOT_FOUND` (404)
3. `MAINTENANCE` (503)
4. `SIGN_IN_REQUIRED` (401)
5. Parameter errors (400): `MISSING_PARAMETER` and `INVALID_PARAMETER`
6. Everything else

## Maintenance mode

With `MAINTENANCE_MODE=true`, a request to a screen, favorite or auth endpoint returns `MAINTENANCE` before any validation or TMDB call.

The index health check stays 200. Its body has a `maintenance` field, `true` during maintenance and `false` otherwise.

## Signing in

`POST /api/auth/request_token` returns a `sign_in_secret` with the token, and `POST /api/auth/session` requires both. This binds the session exchange to the client that started the sign-in.

A wrong secret returns `SIGN_IN_FAILED` without any TMDB call. If `AUTH_SIGNING_SECRET` is unset, both of these requests return `SERVICE_MISCONFIGURED`; signing out still works.

## Signed-in requests

Signed-in requests send `Authorization: Bearer <session_id>`. The backend stores no session and never logs one.

A request for TMDB's user data can be rejected for the user's session or for our API key. TMDB's `status_code` tells them apart:

| TMDB `status_code`                                     | On                                          | Result                  |
| :----------------------------------------------------- | :------------------------------------------ | :---------------------- |
| 31, 32, 45 (account disabled, unverified or suspended) | The account lookup that completes a sign-in | `SIGN_IN_FAILED`        |
| 31, 32, 45                                             | Any other request made with a session       | `SESSION_EXPIRED`       |
| 3, 14, 17, 37                                          | A request made with a session               | `SESSION_EXPIRED`       |
| Any code, with HTTP 404                                | Deleting a session                          | `SESSION_EXPIRED`       |
| 3, 14, 17, 31, 32, 33, 35, 41, 45                      | Exchanging a request token                  | `SIGN_IN_FAILED`        |
| 7, 10, or any other code with HTTP 401 or 403          | Any request                                 | `SERVICE_MISCONFIGURED` |
| Any other code with HTTP 404                           | A movie's account state or setting favorite | `MOVIE_NOT_FOUND`       |

Rows are checked from the top.

If the account lookup that completes a sign-in fails for any reason, the backend tries to delete the new TMDB session before returning the error.

### The detail screen

A rejected or malformed session never fails `GET /api/movie_detail_screen`. The screen is rendered signed out and the response carries `X-Session-Invalid: true`. Other failures of the favorite lookup return their usual error.

Every response to a detail request that sends a session has `Cache-Control: private, no-store` (error responses have `no-store`).

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
6. On `SESSION_EXPIRED`, or a response with `X-Session-Invalid: true`, discard the stored session and offer sign-in.

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
