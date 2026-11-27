import { requireSessionId } from '../src/http/auth';
import { readJsonBody } from '../src/http/body';
import { parseBodyMovieId, parseFavorite } from '../src/http/params';
import { withErrorHandling } from '../src/http/withErrorHandling';
import { setMovieFavorite } from '../src/usecases/setMovieFavorite';

export default withErrorHandling({ route: '/api/favorite', methods: ['POST'] }, async (req, res) => {
    const sessionId = requireSessionId(req);
    const body = readJsonBody(req);
    const movieId = parseBodyMovieId(body.movie_id);
    const favorite = parseFavorite(body.favorite);

    const result = await setMovieFavorite(sessionId, movieId, favorite);

    res.setHeader("Cache-Control", "private, no-store");
    res.status(200).json(result);
});
