# CineStream SDUI Backend

![Vercel Deployment](https://img.shields.io/badge/Vercel-Production-black?logo=vercel)
![Node.js](https://img.shields.io/badge/Node.js-18+-green?logo=node.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue?logo=typescript)
![TMDB API](https://img.shields.io/badge/TMDB-API%20v3-01b4e4?logo=themoviedatabase)

This repository is the Backend-for-Frontend (BFF) server powering the **CineStream** Android application, designed to explore **Server-Driven UI (SDUI)** principles.

Instead of hardcoding UI hierarchy, styling, and navigation on the client, this server queries raw movie metadata from The Movie Database (TMDB) API, processes and maps it into dynamic JSON UI blueprints, and returns them to the client. The Android application acts as a declarative rendering engine via Jetpack Compose.

---

## 🔗 Project Linktree &amp; Ecosystem


| Resource                      | Link / Reference                                                                                                 | Description                                            |
| :----------------------------- | :---------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------ |
| **Android Client (SDUI)**     | [AmmarAlGhifary/cinestream-sdui](https://github.com/AmmarAlGhifary/cinestream-sdui)                              | Native Android client with Jetpack Compose SDUI engine |
| **Backend BFF (This Repo)**   | [AmmarAlGhifary/cinestream-sdui-backend](https://github.com/AmmarAlGhifary/cinestream-sdui-backend)              | Serverless BFF generating SDUI blueprints              |
| **Live Production API**       | [https://sdui-backend.vercel.app/](https://sdui-backend.vercel.app/)                                             | Deployed production instance on Vercel                 |
| **Local Emulator Endpoint**   | `http://10.0.2.2:3000/`                                                                                          | Android emulator loopback to local Vercel dev server   |
| **TMDB API Documentation**    | [TMDB API v3 Docs](https://developer.themoviedb.org/reference/intro/getting-started)                             | External data source for movies, posters, and credits  |
| **Android Project Structure** | [PROJECT\_STRUCTURE.md](https://github.com/AmmarAlGhifary/cinestream-sdui/blob/development/PROJECT_STRUCTURE.md) | Multi-module layout of the Android application         |


---

## 🏛️ System Architecture

```mermaid
flowchart LR
    A["🎬 TMDB API<br/>(External Movie Data)"] -->|Raw REST JSON| B["⚡ CineStream BFF<br/>(sdui-backend on Vercel)"]
    B -->|Polymorphic SDUI Blueprints| C["📱 CineStream Android<br/>(Jetpack Compose Engine)"]
    
    subgraph BFFP["BFF Processing"]
        B1["Fetch TMDB Endpoints"] --> B2["Map to Component Tree"]
        B2 --> B3["Inject Dynamic Actions & IDs"]
        B3 --> B4["Emit SduiScreen JSON"]
    end
    
    
    B -.-> B1
```

### Code Layers

```mermaid
flowchart TD
    API["api/<br/>Vercel entry points"] --> UC["src/usecases<br/>fetch, log, assemble"]
    API --> HTTP["src/http<br/>request log, error to 500"]
    UC --> DATA["src/data/tmdb<br/>client, repository, DTOs"]
    UC --> SCREENS["src/screens<br/>pure screen builders"]
    SCREENS --> SDUI["src/sdui<br/>component models and builders"]
    DATA --> CONFIG["src/config<br/>TMDB URLs, key, image sizes"]
    SCREENS --> CONFIG
```

| Folder          | Responsibility                                                                                       |
| :-------------- | :--------------------------------------------------------------------------------------------------- |
| `api/`          | One thin handler per endpoint: validate the query, call the use case, send the response             |
| `src/usecases`  | Orchestrate one screen: fetch from the repository, log, select movies, call the screen builder      |
| `src/data/tmdb` | TMDB HTTP client (logging, `api_key` redaction), repository and response types                       |
| `src/screens`   | Pure functions that turn TMDB data into a screen, with no I/O (they import data types only)          |
| `src/sdui`      | Typed SDUI component models and builders: the JSON contract                                          |
| `src/config`    | TMDB base URL, image URL and sizes, and the `TMDB_API_KEY` lookup                                   |
| `src/logging`   | Logger and missing-image warnings, used across layers                                                |
| `src/http`      | Request logging and the shared error-to-500 wrapper                                                  |

Only handlers belong in `api/`, because Vercel deploys every file there as a serverless function.

---

## 📡 Endpoints Specification

All serverless functions live in `/api` and conform to polymorphic `SduiScreen` specifications:


| Method | Endpoint                   | Rewrite Alias          | Query Parameters                                                           | Description                                                       |
| :------ | :-------------------------- | :---------------------- | :-------------------------------------------------------------------------- | :----------------------------------------------------------------- |
| `GET`  | `/api/index`               | `/`                    | None                                                                       | Service health check and endpoint directory                       |
| `GET`  | `/api/home`                | `/home`                | None                                                                       | Home dashboard: Hero banner + Trending and Upcoming carousels     |
| `GET`  | `/api/movie_detail_screen` | `/movie_detail_screen` | `movie_id` (required)                                                      | Detailed movie screen with metadata, overview, and similar movies |
| `GET`  | `/api/movie_list_screen`   | None                   | `list_type` (`trending` | `upcoming` | `similar`), `movie_id` (if similar) | Paginated / full vertical list view for categories                |
| `GET`  | `/api/search`              | None                   | `query` (required)                                                         | Search TMDB titles with vertical result listing                   |


---

## 🧩 SDUI Blueprint Contract

Every endpoint returns a polymorphic `screen` object consisting of a `toolbar` and a `body`:

```json
{
  "type": "screen",
  "screen_id": "movie_list_screen",
  "toolbar": {
    "type": "app_bar",
    "title": {
      "type": "toolbar_title",
      "text_content": "Trending Movies",
      "alignment": "start",
      "style": "headline"
    },
    "actions": []
  },
  "body": {
    "type": "vertical_list",
    "list_id": "movie_list",
    "items": [
      {
        "type": "movie_list_item",
        "movie_id": "936075",
        "poster_url": "https://image.tmdb.org/t/p/w500/...",
        "title": { "type": "text", "text_content": "Michael" },
        "subtitle": { "type": "text", "text_content": "7.0 | 2026-04-22" },
        "action": {
          "type": "navigation_action",
          "destination": "movie_detail_screen",
          "params": { "movie_id": "936075" }
        }
      }
    ]
  }
}
```

### Component Registry


| Server Type (`type`)   | Kotlin Client Model      | Category                       |
| :---------------------- | :------------------------ | :------------------------------ |
| `screen`               | `SduiScreen`             | Root Screen Container          |
| `app_bar`              | `SduiAppBar`             | Toolbar Layout                 |
| `toolbar_title`        | `SduiToolbarTitle`       | App Bar Typography             |
| `column`               | `SduiColumn`             | Vertical Layout Container      |
| `featured_hero`        | `SduiFeaturedHero`       | Hero Showcase Banner           |
| `featured_hero_detail` | `SduiFeaturedHeroDetail` | Detail Header Banner           |
| `section_header`       | `SduiSectionHeader`      | Section Title with Action      |
| `movie_carousel`       | `SduiMovieCarousel`      | Horizontal Scrollable Carousel |
| `movie_card`           | `SduiMovieCard`          | Poster Card Item               |
| `vertical_list`        | `SduiVerticalList`       | Vertical Scrollable List       |
| `movie_list_item`      | `SduiListItem`           | Horizontal Row Movie Item      |
| `navigation_action`    | `NavigationAction`       | Client Navigation Trigger      |


---

## 💻 Local Development

1. **Install Dependencies**:
   ```bash
    npm install
   ```
2. **Provide the TMDB API Key**: `npm start` needs `TMDB_API_KEY` in a `.env` file. Pull the development environment from Vercel (requires a linked project):
   ```bash
    vercel env pull .env
   ```
   or create `.env` yourself:
   ```bash
    TMDB_API_KEY=<your key>
   ```
   Use `.env`, not `.env.local`: the local dev server did not load `.env.local` when tested with Vercel CLI 54.15.1. `.env` is gitignored; never commit it. Without the key, requests that need TMDB return 500.

3. **Run Local Dev Server**:
   ```bash
    npm start
    # Runs: vercel dev --local --token dummy
   ```

    *The server starts on `http://localhost:3000`.*  
   
4. **Connect the Android Emulator**:
   - Point your Android app's base URL in `gradle.properties` to:  
  ```bash
    BASE_URL=http://10.0.2.2:3000/
   ```
   - Verify `android:usesCleartextTraffic="true"` in `AndroidManifest.xml` during local testing.
   
## 🚀 Deployment

`main` is production: every merge into `main` deploys to Vercel production. Branches other than `main` (including `develop` and PR branches) get Vercel preview deployments.

## 🌿 Branching & Releases

- Work happens on `feature/<name>` (or `fix/`, `chore/`, `docs/`) branched off `develop`, and is merged into `develop` through a pull request.
- `main` and `develop` are protected: changes go through a pull request that passes the `build` check, with no force-pushes or deletion.
- A release is a pull request from `develop` into `main`, approved by the owner. After it merges, the merge commit on `main` is tagged `vX.Y.Z` (annotated) and a GitHub Release is published from the matching `CHANGELOG.md` entry. Releases are immutable.
- The version lives in `package.json` and follows [Semantic Versioning](https://semver.org/); see [CHANGELOG.md](CHANGELOG.md).

---

## 👤 Author

- **Ammar Al Ghifary** - [GitHub](https://github.com/AmmarAlGhifary)
---

## Testing & CI

```bash
npm ci               # install the locked dependencies
npm run typecheck    # type-check api/ and src/
npm test             # run the tests (no network or TMDB key needed)
npx vitest run -u    # update snapshots after an intended JSON change
```

GitHub Actions runs `npm ci`, `npm run typecheck` and `npm test` in the `build` job on pull requests into `develop` and `main` (and on demand).
