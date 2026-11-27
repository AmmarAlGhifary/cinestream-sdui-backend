import { withErrorHandling } from '../src/http/withErrorHandling';
import { getSearchScreen } from '../src/usecases/getSearchScreen';

export default withErrorHandling(
    {
        route: '/api/search',
        errorLog: 'TMDB Search Error: ',
        errorMessage: 'Failed to generate Search blueprint',
    },
    async (req, res) => {
        res.status(200).json(await getSearchScreen(req.query.query));
    },
);
