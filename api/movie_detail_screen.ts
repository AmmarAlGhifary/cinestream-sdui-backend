import { parseMovieId } from '../src/http/params';
import { withErrorHandling } from '../src/http/withErrorHandling';
import { getMovieDetailScreen } from '../src/usecases/getMovieDetailScreen';

export default withErrorHandling({ route: '/api/movie_detail_screen' }, async (req, res) => {
    const movieId = parseMovieId(req.query.movie_id);

    res.status(200).json(await getMovieDetailScreen(movieId));
});
