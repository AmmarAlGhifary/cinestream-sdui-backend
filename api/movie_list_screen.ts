import { parseMovieId } from '../src/http/params';
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

        // Only the "similar" list reads movie_id; the other lists ignore it.
        let movieId: string | undefined;
        if (listType === "similar") {
            const param = parseMovieId(req.query.movie_id);
            if (!param.ok) {
                return res.status(400).json({ error: param.error });
            }
            movieId = param.movieId;
        }

        res.status(200).json(await getMovieListScreen(listType, movieId));
    },
);
