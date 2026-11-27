/** Remove the TMDB api_key from a URL or message so it never lands in logs. */
export function redactApiKey(text: string): string {
    return text.replace(/([?&]api_key=)[^&\s"']+/g, '$1***');
}
