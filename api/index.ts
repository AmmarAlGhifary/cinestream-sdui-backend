import { isMaintenanceMode } from '../src/config/maintenance';
import { withErrorHandling } from '../src/http/withErrorHandling';
import { logger } from '../src/logging/logger';

export default withErrorHandling(
    { route: '/api/index', availableDuringMaintenance: true },
    (req, res) => {
        logger.info('Health check endpoint called', { url: req.url });
        res.status(200).json({
            status: "ok",
            message: "CineStream SDUI BFF is running!",
            version: "1.2.0",
            environment: process.env.VERCEL_ENV || "development",
            maintenance: isMaintenanceMode(),
            timestamp: new Date().toISOString(),
            endpoints: {
                home: "/api/home",
                movie_detail_screen: "/api/movie_detail_screen",
                movie_list_screen: "/api/movie_list_screen",
                search: "/api/search"
            }
        });
    },
);
