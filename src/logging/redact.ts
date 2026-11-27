/** Names whose values are credentials, as query parameters or object keys. */
const SECRET_NAME = /^(api_key|session_id|request_token|sign_in_secret|authorization)$/i;

const SECRET_IN_TEXT: RegExp[] = [
    // Query parameters in a URL or message.
    /([?&](?:api_key|session_id|request_token|sign_in_secret)=)[^&\s"'\\]+/gi,
    // An Authorization header value.
    /(\bBearer\s+)[^\s"',}\\]+/gi,
    // The request token inside a TMDB approval URL.
    /(\/authenticate\/)[^/?#\s"'\\]+/gi,
];

/** Remove credentials from a URL or message so they never land in logs. */
export function redactSecrets(text: string): string {
    return SECRET_IN_TEXT.reduce((result, pattern) => result.replace(pattern, '$1***'), text);
}

/** A `JSON.stringify` replacer that masks credentials at any depth. */
export function redactingReplacer(key: string, value: unknown): unknown {
    if (SECRET_NAME.test(key)) {
        return '***';
    }
    return typeof value === 'string' ? redactSecrets(value) : value;
}
