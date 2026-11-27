import { requireSessionId } from '../../src/http/auth';
import { readJsonBody } from '../../src/http/body';
import { sendNoContent } from '../../src/http/logRequest';
import { parseRequestToken } from '../../src/http/params';
import { withErrorHandling } from '../../src/http/withErrorHandling';
import { signIn, signOut } from '../../src/usecases/auth';

const ROUTE = '/api/auth/session';

/** POST signs in with an approved request token; DELETE signs out. */
export default withErrorHandling({ route: ROUTE, methods: ['POST', 'DELETE'] }, async (req, res) => {
    if (req.method === 'DELETE') {
        await signOut(requireSessionId(req));
        res.setHeader("Cache-Control", "private, no-store");
        return sendNoContent(ROUTE, res);
    }

    const requestToken = parseRequestToken(readJsonBody(req).request_token);
    const result = await signIn(requestToken);

    res.setHeader("Cache-Control", "private, no-store");
    res.status(200).json(result);
});
