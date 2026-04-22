import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';
import { logger } from './logger';

const TMDB_API_KEY = "fa2c849fca1204cdc46abea78adbbb86";
const BASE_URL = "https://api.themoviedb.org/3";

export default async function handler(req: VercelRequest, res: VercelResponse) {
    try {
        const query = req.query.query;

        if (!query) {
            return res.status(200).json({
                type: "screen",
                screen_id: "search_screen",
                body: { type: "column", children: [] }
            });
        }

        const response = await axios.get(`${BASE_URL}/search/movie?query=${encodeURIComponent(query as string)}&api_key=${TMDB_API_KEY}`);
        const movies = response.data.results;

        const listItems = movies.map((movie: any) => ({
            type: "movie_list_item",
            movie_id: movie.id.toString(),
            poster_url: movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : "https://via.placeholder.com/100x150?text=No+Image",
            title: { type: "text", text_content: movie.title || movie.name },
            subtitle: { type: "text", text_content: `⭐ ${movie.vote_average?.toFixed(1) || "N/A"} | 📅 ${movie.release_date || "Unknown"}` },
            action: {
                type: "navigation_action",
                destination: "movie_detail_screen",
                params: { movie_id: movie.id.toString() }
            }
        }));

        const sduiResponse = {
            type: "screen",
            screen_id: "search_screen",
            body: {
                type: "vertical_list",
                list_id: "search_results",
                items: listItems
            }
        };

        res.status(200).json(sduiResponse);
    } catch (error: any) {
        logger.error("TMDB Search Error: ", { message: error.message, stack: error.stack });
        res.status(500).json({ error: "Failed to generate Search blueprint" });
    }
}