import { withErrorHandling } from '../src/http/withErrorHandling';
import { getMovieDetailScreen } from '../src/usecases/getMovieDetailScreen';

export default withErrorHandling(
    {
        route: '/api/movie_detail_screen',
        errorLog: 'TMDB Fetch Error:',
        errorMessage: 'Failed to generate Detail blueprint',
    },
    async (req, res) => {
        const movieId = req.query.movie_id;

        if (!movieId) {
            return res.status(400).json({ error: "Missing movie_id parameter" });
        }

        res.status(200).json(await getMovieDetailScreen(movieId));
    },
);
