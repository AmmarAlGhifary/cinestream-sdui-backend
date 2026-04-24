import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';
import { logger } from './logger';

const TMDB_API_KEY = "fa2c849fca1204cdc46abea78adbbb86";
const BASE_URL = "https://api.themoviedb.org/3";

export default async function handler(req: VercelRequest, res: VercelResponse) {
    try {
        const movieId = req.query.movie_id;

        if (!movieId) {
            return res.status(400).json({ error: "Missing movie_id parameter" });
        }

        logger.info(`Fetching details for movie: ${movieId}`);

        const movieResponse = await axios.get(`${BASE_URL}/movie/${movieId}?api_key=${TMDB_API_KEY}`);
        const movie = movieResponse.data;

        const detailScreenResponse = {
            type: "screen",
            screen_id: "movie_detail_screen",
            toolbar: {
                type: "app_bar",
                title: {
                    type: "toolbar_title",
                    text_content: "CineStream",
                    alignment: "start",
                    style: "headline"
                },
                actions: []
            },
            body: {
                type: "column",
                children: [
                    {
                        type: "featured_hero",
                        image_url: `https://image.tmdb.org/t/p/w780${movie.backdrop_path}`,
                        title: {
                            type: "section_header",
                            title: {
                                type: "text",
                                text_content: movie.tagline || movie.title
                            }
                        },
                        description: {
                            type: "text",
                            text_content: `⭐ ${movie.vote_average.toFixed(1)}/10 | 📅 ${movie.release_date}`
                        },
                        buttons: []
                    },
                    {
                        type: "section_header",
                        title: {
                            type: "text",
                            text_content: "Overview"
                        }
                    },
                    {
                        type: "text",
                        text_content: movie.overview
                    }
                ]
            }
        };

        logger.info(`Successfully generated Detail blueprint for ${movieId}`);
        res.status(200).json(detailScreenResponse);

    } catch (error: any) {
        logger.error("TMDB Fetch Error:", { message: error.message, stack: error.stack });
        res.status(500).json({ error: "Failed to generate Detail blueprint" });
    }
}