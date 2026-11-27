import { withErrorHandling } from '../../src/http/withErrorHandling';
import { startSignIn } from '../../src/usecases/auth';

// Nothing is read from the request: the redirect URL comes from configuration only.
export default withErrorHandling({ route: '/api/auth/request_token', methods: ['POST'] }, async (_req, res) => {
    const result = await startSignIn();

    res.setHeader("Cache-Control", "private, no-store");
    res.status(200).json(result);
});
