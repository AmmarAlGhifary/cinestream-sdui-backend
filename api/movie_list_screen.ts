import { AppError } from '../src/errors/appError';
import { parseMovieId } from '../src/http/params';
import { withErrorHandling } from '../src/http/withErrorHandling';
import { getMovieListScreen, isListType } from '../src/usecases/getMovieListScreen';

export default withErrorHandling({ route: '/api/movie_list_screen' }, async (req, res) => {
    const listType = req.query.list_type;

    if (!isListType(listType)) {
        throw new AppError("INVALID_PARAMETER", { detail: `Unknown list type: ${listType}` });
    }

    // Only the "similar" list reads movie_id; the other lists ignore it.
    const movieId = listType === "similar" ? parseMovieId(req.query.movie_id) : undefined;

    res.status(200).json(await getMovieListScreen(listType, movieId));
});
