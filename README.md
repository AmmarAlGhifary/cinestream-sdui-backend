# CineStream SDUI Backend

This is the backend service (BFF) that powers the CineStream Android app. I built this as part of my thesis research on Server-Driven UI (SDUI). 

Instead of hardcoding UI layouts, navigation, and content on the client side, this server fetches raw data from the TMDB API, processes it, and returns a JSON blueprint. The Android app simply acts as a rendering engine that draws whatever this server dictates.

## Tech Stack
- TypeScript / Node.js
- Vercel Serverless Functions
- TMDB API
- Axios

## Endpoints

All serverless functions are located in the `/api` directory. They all return a structured `SduiScreen` JSON object.

- `GET /api/home` - The main dashboard. Returns the daily trending hero banner and two horizontal carousels (Trending and Upcoming).
- `GET /api/movie_detail_screen?movie_id={id}` - The detail view for a specific movie.
- `GET /api/movie_list_screen?list_type={type}` - A vertical list view for the "See All" categories (e.g., trending, upcoming).
- `GET /api/search?query={text}` - Queries TMDB for matching titles and returns a dynamic vertical list of results.

## The SDUI Blueprint

The server communicates with the Android client using a strict, polymorphic JSON structure. Every endpoint returns a `screen` object containing a `toolbar` and a `body`. 

Here is a simplified example of the response structure:

```json
{
  "type": "screen",
  "screen_id": "movie_list_screen",
  "toolbar": {
    "type": "app_bar",
    "title": { "type": "text", "text_content": "Trending Movies" },
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

## Running Locally

To test UI changes in real-time without waiting for Vercel cloud deployments, you can run the server locally and connect the Android emulator directly to it.

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the local Vercel dev server:
   ```bash
   vercel dev
   ```
   *(The server will start on http://localhost:3000)*
3. Connect the Android Emulator:
   Update the Android app's network configuration to point to the local server using the emulator's localhost alias (`http://10.0.2.2:3000/`). Make sure `android:usesCleartextTraffic="true"` is temporarily enabled in your AndroidManifest.xml.

## Deploying

This project is configured for deployment via Vercel. Pushing to the `main` branch triggers a production build, or you can deploy manually from the CLI:

```bash
vercel --prod
```
