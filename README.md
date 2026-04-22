# CineStream SDUI Backend

Backend service that powers the CineStream app using a Server-Driven UI approach. Instead of hardcoding screens on the client, the server returns JSON blueprints that describe the layout, content, and navigation for each screen. The client just renders whatever the server sends.

Built with TypeScript and deployed as Vercel Serverless Functions. Movie data comes from the TMDB API.

## Endpoints

| Route | Description |
|---|---|
| `/home` | Home screen blueprint -- hero banner, trending carousel, upcoming carousel |
| `/movie_detail_screen?movie_id=` | Detail screen for a specific movie |
| `/movie_list_screen?list_type=` | Full list view (trending or upcoming) |
| `/api/search?query=` | Search results |

## Running Locally

```
npm install
vercel dev
```

## Deploying

Deployed via Vercel. Push to main or run `vercel --prod`.

## Stack

- TypeScript
- Vercel Serverless Functions
- TMDB API
- Axios
