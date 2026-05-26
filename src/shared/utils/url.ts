/**
 * Validates that a URL is safe to use in an <img> src attribute.
 * Only allows http and https protocols.
 */
export function isSafeUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch (e) {
    // If it's a relative URL, it's generally safe for our own site,
    // but for user-generated content pointing to external hosts,
    // we should enforce absolute http/https.
    return false;
  }
}
