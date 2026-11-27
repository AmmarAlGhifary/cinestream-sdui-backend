import { withErrorHandling } from '../src/http/withErrorHandling';
import { getHomeScreen } from '../src/usecases/getHomeScreen';

export default withErrorHandling(
    {
        route: '/api/home',
        errorLog: 'TMDB Fetch Error:',
        errorMessage: 'Failed to generate SDUI blueprint',
    },
    async (_req, res) => {
        const screen = await getHomeScreen();

        if (!screen) {
            return res.status(500).json({ error: "No movies found from TMDB" });
        }

        res.status(200).json(screen);
    },
);
