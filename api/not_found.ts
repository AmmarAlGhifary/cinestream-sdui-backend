import { AppError } from '../src/errors/appError';
import { withErrorHandling } from '../src/http/withErrorHandling';

/**
 * Target of the catch-all rewrite, which answers any unknown path. A wrong
 * method still wins (405), and maintenance mode does not hide the 404.
 */
export default withErrorHandling(
    { route: '/api/not_found', availableDuringMaintenance: true },
    () => {
        throw new AppError("SCREEN_NOT_FOUND");
    },
);
