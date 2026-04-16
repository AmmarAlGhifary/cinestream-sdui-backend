import type { VercelRequest, VercelResponse } from '@vercel/node';
import { logger } from './logger';

export default function handler(req: VercelRequest, res: VercelResponse) {
    logger.info('Health check endpoint called', { url: req.url });
    res.status(200).json({
        status: "ok",
        message: "SDUI Backend is running!",
        endpoints: { home: "/api/home" }
    });
}