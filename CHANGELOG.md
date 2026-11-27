# Changelog

All notable changes to the CineStream SDUI backend are recorded here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project follows
[Semantic Versioning](https://semver.org/). The version number lives in `package.json` (`version`).

A breaking change to the SDUI JSON contract (a removed or renamed component `type` or field, or a new
body root type the Android client does not support yet) is a major version.

## [Unreleased]

## [1.2.0] - 2026-11-27

### Added

- Sign-in with a TMDB account: `POST /api/auth/request_token`, `POST /api/auth/session` and
  `DELETE /api/auth/session`. The redirect after approval is `AUTH_REDIRECT_URL`
  (default `cinestream://auth/tmdb`).
- A `sign_in_secret`, issued with the request token and required to create the session, binds the
  session exchange to the client that started the sign-in. It needs the `AUTH_SIGNING_SECRET`
  environment variable.
- `POST /api/favorite` adds a movie to, or removes it from, the signed-in user's favorites.
- The detail screen shows the favorite state when sent `Authorization: Bearer <session_id>`, and adds
  `X-Session-Invalid: true` when the session is rejected. The favorite button's action body now has a
  `favorite` field.
- Error codes `SIGN_IN_REQUIRED`, `SESSION_EXPIRED` and `SIGN_IN_FAILED`.

### Changed

- Allowed methods are set per endpoint, and `Allow` lists them (`POST` for favorites and
  sign-in, `DELETE` for sign-out, `GET, HEAD` elsewhere).

### Security

- Session ids, request tokens, sign-in secrets and the `Authorization` header are redacted from
  all logs. The backend never stores a session.

## [1.1.0] - 2026-11-27

### Added

- Error codes with a user-readable `title` and `message`, a `retryable` flag and, when Vercel provides
  it, a `request_id`. Error responses are sent with `Cache-Control: no-store`, and with `Retry-After`
  where retrying later helps.
- 405 `METHOD_NOT_ALLOWED` (with `Allow: GET, HEAD`) for any other method.
- A JSON 404 `SCREEN_NOT_FOUND` for unknown paths.
- An 8 second timeout on TMDB requests.
- Maintenance mode: with `MAINTENANCE_MODE=true`, screen endpoints return 503 `MAINTENANCE` without
  calling TMDB. `/api/index` stays up and reports `maintenance`.
- Rewrites `/movie_list_screen` and `/search`.

### Changed

- **Error body shape:** every error is now `{"error": {"code", "title", "message", "retryable",
  "request_id"}}` instead of `{"error": "<text>"}`. Success responses are unchanged.
- Error statuses are specific: for example, a TMDB failure is 502 or 504 and an unknown movie 404
  (all were 500), and an empty home feed is 503.
- A search `query` that is repeated or longer than 200 characters returns 400.

### Security

- Repository files are no longer served as static files.

## [1.0.0] - 2026-11-27

First tagged release of the Backend-for-Frontend that turns TMDB data into SDUI screens for the
CineStream Android client.

### Added

- SDUI screen endpoints: `/api/home` (hero, trending and upcoming carousels), `/api/movie_detail_screen`,
  `/api/movie_list_screen` (`trending`, `upcoming`, `similar`), `/api/search`, and the `/api/index`
  health check.
- Characterization tests (vitest) that pin every endpoint's status and JSON output with snapshots, and
  a GitHub Actions `build` job (typecheck and tests on Node 24).

### Changed

- The code is split into layers: thin Vercel handlers in `api/`, plus `src/usecases`, `src/data/tmdb`,
  `src/screens`, `src/sdui`, `src/config`, `src/logging` and `src/http`. The JSON output is unchanged.
- The TMDB API key is read from the `TMDB_API_KEY` environment variable and is no longer in the code.
  Local development needs it in a gitignored `.env` file.
- `/api/logger` is no longer deployed as a function (it returned 500, now 404).

### Fixed

- `movie_id` is validated as a single positive integer before any TMDB call. An invalid value returns
  400 `Invalid movie_id parameter`, and the `similar` list without `movie_id` returns 400 instead of 500.
- npm audit: no vulnerabilities in runtime dependencies (axios 1.21.1). Three dev-only findings remain
  through `@vercel/node`.

[Unreleased]: https://github.com/AmmarAlGhifary/cinestream-sdui-backend/compare/v1.2.0...develop
[1.2.0]: https://github.com/AmmarAlGhifary/cinestream-sdui-backend/releases/tag/v1.2.0
[1.1.0]: https://github.com/AmmarAlGhifary/cinestream-sdui-backend/releases/tag/v1.1.0
[1.0.0]: https://github.com/AmmarAlGhifary/cinestream-sdui-backend/releases/tag/v1.0.0
