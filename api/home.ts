import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';
import { logger } from './logger';

const TMDB_API_KEY = "fa2c849fca1204cdc46abea78adbbb86";
const BASE_URL = "https://api.themoviedb.org/3";

export default async function handler(req: VercelRequest, res: VercelResponse) {
    try {
        logger.info('Fetching movies from TMDB');

        const trendingResponse = await axios.get(`${BASE_URL}/trending/movie/day?api_key=${TMDB_API_KEY}`);
        const trendingMovies = trendingResponse.data.results;

        const upcomingRespone = await axios.get(`${BASE_URL}/movie/upcoming?api_key=${TMDB_API_KEY}`);
        const upcomingMovies = upcomingRespone.data.results;

        if (!trendingMovies || trendingMovies.length === 0) {
            logger.warn('No movies found from TMDB response');
            return res.status(500).json({ error: "No movies found from TMDB" });
        }

        const heroMovie = trendingMovies[0];
        const trendingCarousel = trendingMovies.slice(1, 11).map(mapToMovieCard);
        const upcomingCarousel = upcomingMovies.slice(0, 10).map(mapToMovieCard);

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
                        icon_name: "search",
                        action: {
                            type: "navigation_action",
                            destination: "search_screen"
                        }
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
                            text: "See All",
                            action: {
                                type: "navigation_action",
                                destination: "movie_list_screen",
                                params: {
                                    list_type: "trending"
                                }
                            }
                        }
                    },
                    {
                        type: "movie_carousel",
                        carousel_id: "trending_carousel",
                        item_type: "movie_card",
                        items: trendingCarousel
                    },
                    {
                        type: "section_header",
                        title: {
                            type: "text",
                            text_content: "Coming Soon"
                        },
                        action_button: {
                            type: "text_button",
                            text: "See All",
                            action: {
                                type: "navigation_action",
                                destination: "movie_list_screen",
                                params: {
                                    list_type: "upcoming"
                                }
                            }
                        }
                    },
                    {
                        type: "movie_carousel",
                        carousel_id: "upcoming_carousel",
                        item_type: "movie_card",
                        items: upcomingCarousel
                    },
                ]
            }
        };

        logger.info('Successfully generated SDUI blueprint');
        res.status(200).json(sduiResponse);

    } catch (error: any) {
        logger.error("TMDB Fetch Error:", { message: error.message, stack: error.stack });
        res.status(500).json({ error: "Failed to generate SDUI blueprint" });
    }

    function mapToMovieCard(movie: any) {
        return {
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
        };
    }
}