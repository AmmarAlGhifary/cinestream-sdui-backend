import { parseSearchQuery } from '../src/http/params';
import { withErrorHandling } from '../src/http/withErrorHandling';
import { getSearchScreen } from '../src/usecases/getSearchScreen';

export default withErrorHandling({ route: '/api/search' }, async (req, res) => {
    const query = parseSearchQuery(req.query.query);

    res.status(200).json(await getSearchScreen(query));
});
