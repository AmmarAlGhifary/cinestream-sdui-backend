import { parseMovieId } from '../src/http/params';
import { withErrorHandling } from '../src/http/withErrorHandling';
import { getMovieDetailScreen } from '../src/usecases/getMovieDetailScreen';

export default withErrorHandling(
    {
        route: '/api/movie_detail_screen',
        errorLog: 'TMDB Fetch Error:',
        errorMessage: 'Failed to generate Detail blueprint',
    },
    async (req, res) => {
        const param = parseMovieId(req.query.movie_id);

        if (!param.ok) {
            return res.status(400).json({ error: param.error });
        }

        res.status(200).json(await getMovieDetailScreen(param.movieId));
    },
);
