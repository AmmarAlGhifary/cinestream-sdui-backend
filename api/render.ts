import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';
import { logger } from './logger';

const TMDB_API_KEY = "fa2c849fca1204cdc46abea78adbbb86";
const BASE_URL = "https://api.themoviedb.org/3";

export default async function handler(req: VercelRequest, res: VercelResponse) {
    try {
        logger.info('Fetching trending movies from TMDB');
        const trendingResponse = await axios.get(`${BASE_URL}/trending/movie/day?api_key=${TMDB_API_KEY}`);
        const movies = trendingResponse.data.results;

        if (!movies || movies.length === 0) {
            logger.warn('No movies found from TMDB response');
            return res.status(500).json({ error: "No movies found from TMDB" });
        }

        const heroMovie = movies[0];

        const carouselMovies = movies.slice(1, 11).map((movie: any) => ({
            type: "movie_card",
            movie_id: movie.id.toString(),
            poster_url: `https://image.tmdb.org/t/p/w500${movie.poster_path}`,
            title: {
                type: "text",
                text_content: movie.title || movie.name
            },
            action: {
                type: "navigation_action",
                destination: "movie_detail_screen",
                params: {
                    movie_id: movie.id.toString()
                }
            }
        }));

        const sduiResponse = {
            type: "screen",
            screen_id: "home",
            toolbar: {
                type: "app_bar",
                title: {
                    type: "text",
                    text_content: "CineStream"
                },
                actions: [
                    {
                        type: "icon_button",
                        icon_name: "search"
                    }
                ]
            },
            body: {
                type: "column",
                children: [
                    {
                        type: "featured_hero",
                        image_url: `https://image.tmdb.org/t/p/w780${heroMovie.backdrop_path}`,
                        title: {
                            type: "text",
                            text_content: heroMovie.title || heroMovie.name
                        },
                        description: {
                            type: "text",
                            text_content: heroMovie.overview
                        },
                        buttons: [
                            {
                                type: "button",
                                text: "View Details",
                                style: "primary",
                                action: {
                                    type: "navigation_action",
                                    destination: "movie_detail_screen",
                                    params: {
                                        movie_id: heroMovie.id.toString()
                                    }
                                }
                            }
                        ]
                    },
                    {
                        type: "section_header",
                        title: {
                            type: "text",
                            text_content: "Trending Now"
                        },
                        action_button: {
                            type: "text_button",
                            text: "See All"
                        }
                    },
                    {
                        type: "movie_carousel",
                        carousel_id: "trending_carousel",
                        item_type: "movie_card",
                        items: carouselMovies
                    }
                ]
            }
        };

        logger.info('Successfully generated SDUI blueprint');
        res.status(200).json(sduiResponse);

    } catch (error: any) {
        logger.error("TMDB Fetch Error:", { message: error.message, stack: error.stack });
        res.status(500).json({ error: "Failed to generate SDUI blueprint" });
    }
}