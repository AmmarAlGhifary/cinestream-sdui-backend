import { requireSessionId } from '../../src/http/auth';
import { readJsonBody } from '../../src/http/body';
import { sendNoContent } from '../../src/http/logRequest';
import { parseRequestToken, parseSignInSecret } from '../../src/http/params';
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

    const body = readJsonBody(req);
    const requestToken = parseRequestToken(body.request_token);
    const signInSecret = parseSignInSecret(body.sign_in_secret);
    const result = await signIn(requestToken, signInSecret);

    res.setHeader("Cache-Control", "private, no-store");
    res.status(200).json(result);
});
