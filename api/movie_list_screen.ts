import { withErrorHandling } from '../src/http/withErrorHandling';
import { logger } from '../src/logging/logger';
import { getMovieListScreen, isListType } from '../src/usecases/getMovieListScreen';

export default withErrorHandling(
    {
        route: '/api/movie_list_screen',
        errorLog: 'TMDB Fetch Error: ',
        errorMessage: 'Failed to generate List blueprint',
    },
    async (req, res) => {
        const listType = req.query.list_type;

        if (!isListType(listType)) {
            logger.warn(`Unknown list type: ${listType}`);
            return res.status(400).json({ error: "Invalid list type" });
        }

        res.status(200).json(await getMovieListScreen(listType, req.query.movie_id));
    },
);
