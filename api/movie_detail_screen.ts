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

        const similarResponse = await axios.get(`${BASE_URL}/movie/${movieId}/similar?api_key=${TMDB_API_KEY}`);
        const similarMovies = similarResponse.data.results.slice(0, 10).map(mapToMovieCard);

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
                actions: [
                    {
                        type: "icon_button",
                        icon_name: "favorite_border",
                        action: {
                            type: "api_action",
                            endpoint: "/api/favorite",
                            method: "POST",
                            body: {
                                movie_id: movieId
                            }
                        }
                    },
                    {
                        type: "icon_button",
                        icon_name: "share",
                        action: {
                            type: "share_action",
                            content: `Check out ${movie.title} on CineStream!`
                        }
                    }
                ]
            },
            body: {
                type: "column",
                children: [
                    {
                        type: "featured_hero_detail",
                        image_url: `https://image.tmdb.org/t/p/w780${movie.backdrop_path}`,
                        title: {
                            type: "section_header",
                            title: {
                                type: "text",
                                text_content: movie.title
                            }
                        },
                        description1: {
                            type: "text",
                            text_content: `⭐ ${movie.vote_average.toFixed(1)}/10`
                        },
                        description2: {
                            type: "text",
                            text_content: `${movie.release_date}`
                        },
                        description3: {
                            type: "text",
                            text_content: `${movie.runtime} minutes`
                        },
                    },
                    {
                        type: "section_header_detail",
                        title: {
                            type: "text",
                            text_content: "Overview"
                        }
                    },
                    {
                        type: "text",
                        text_content: movie.overview
                    },
                    {
                        type: "section_header",
                        title: {
                            type: "text",
                            text_content: "Similar Movies"
                        },
                        action_button: {
                            type: "text_button",
                            text: "See All",
                            action: {
                                type: "navigation_action",
                                destination: "movie_list_screen",
                                params: {
                                    list_type: "similar",
                                    movie_id: movieId.toString()
                                }
                            }
                        }
                    },
                    {
                        type: "movie_carousel",
                        carousel_id: "similar_carousel",
                        item_type: "movie_card",
                        items: similarMovies
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