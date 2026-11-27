import { withErrorHandling } from '../src/http/withErrorHandling';
import { getHomeScreen } from '../src/usecases/getHomeScreen';

export default withErrorHandling({ route: '/api/home' }, async (_req, res) => {
    res.status(200).json(await getHomeScreen());
});
