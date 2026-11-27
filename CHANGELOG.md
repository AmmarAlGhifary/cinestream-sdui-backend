# Changelog

All notable changes to the CineStream SDUI backend are recorded here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project follows
[Semantic Versioning](https://semver.org/). The version number lives in `package.json` (`version`).

A breaking change to the SDUI JSON contract (a removed or renamed component `type` or field, or a new
body root type the Android client does not support yet) is a major version.

## [Unreleased]

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

[Unreleased]: https://github.com/AmmarAlGhifary/cinestream-sdui-backend/compare/v1.0.0...develop
[1.0.0]: https://github.com/AmmarAlGhifary/cinestream-sdui-backend/releases/tag/v1.0.0
