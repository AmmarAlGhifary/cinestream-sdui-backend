import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';
import { logger } from './logger';

const TMDB_API_KEY = "fa2c849fca1204cdc46abea78adbbb86";
const BASE_URL = "https://api.themoviedb.org/3";

export default async function handler(req: VercelRequest, res: VercelResponse) {
    try {
        const listType = req.query.list_type;
        let tmdbUrl = "";
        let pageTitle = "";

        if (listType === "trending") {
            tmdbUrl = `${BASE_URL}/trending/movie/day?api_key=${TMDB_API_KEY}`;
            pageTitle = "Trending Movies";
        } else if (listType === "upcoming") {
            tmdbUrl = `${BASE_URL}/movie/upcoming?api_key=${TMDB_API_KEY}`;
            pageTitle = "Upcoming Movies";
        } else {
            logger.warn(`Unknown list type: ${listType}`);
            return res.status(400).json({ error: "Invalid list type" });
        }

        const response = await axios.get(tmdbUrl);
        const movies = response.data.results;

        const listItems = movies.map((movie: any) => ({
            type: "movie_list_item",
            movie_id: movie.id.toString(),
            poster_url: `https://image.tmdb.org/t/p/w500${movie.poster_path}`,
            title: { type: "text", text_content: movie.title || movie.name },
            subtitle: { type: "text", text_content: `${movie.vote_average.toFixed(1)} | ${movie.release_date}` },
            action: {
                type: "navigation_action",
                destination: "movie_detail_screen",
                params: { movie_id: movie.id.toString() }
            }
        }));

        const sduiResponse = {
            type: "screen",
            screen_id: "movie_list_screen",
            toolbar: {
                type: "app_bar",
                title: { type: "text", text_content: pageTitle },
                actions: []
            },
            body: {
                type: "vertical_list",
                list_id: "movie_list",
                items: listItems
            }
        };

        logger.info(`Successfully generated List blueprint for ${listType}`);
        res.status(200).json(sduiResponse);
    } catch (error: any) {
        logger.error("TMDB Fetch Error: ", { message: error.message, stack: error.stack });
        res.status(500).json({ error: "Failed to generate List blueprint" });
    }
}