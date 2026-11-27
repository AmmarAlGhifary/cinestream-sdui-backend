import { readSessionId } from '../src/http/auth';
import { parseMovieId } from '../src/http/params';
import { withErrorHandling } from '../src/http/withErrorHandling';
import { getMovieDetailScreen } from '../src/usecases/getMovieDetailScreen';

export default withErrorHandling({ route: '/api/movie_detail_screen' }, async (req, res) => {
    const movieId = parseMovieId(req.query.movie_id);
    const sessionId = readSessionId(req);

    const { screen, sessionInvalid } = await getMovieDetailScreen(movieId, sessionId);

    // A response that depends on a user's session must not be cached.
    if (sessionId !== undefined) {
        res.setHeader("Cache-Control", "private, no-store");
    }
    if (sessionInvalid) {
        res.setHeader("X-Session-Invalid", "true");
    }
    res.status(200).json(screen);
});
