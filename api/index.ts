import type { VercelRequest, VercelResponse } from '@vercel/node';
import { logger } from './logger';

export default function handler(req: VercelRequest, res: VercelResponse) {
    logger.info('Health check endpoint called', { url: req.url });
    res.status(200).json({
        status: "ok",
        message: "CineStream SDUI BFF is running!",
        version: "1.0.0",
        environment: process.env.VERCEL_ENV || "development",
        timestamp: new Date().toISOString(),
        endpoints: {
            home: "/api/home",
            movie_detail_screen: "/api/movie_detail_screen",
            movie_list_screen: "/api/movie_list_screen",
            search: "/api/search"
        }
    });
}