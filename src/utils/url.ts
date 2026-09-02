const ALLOWED_SCHEMES = ["http:", "https:", "mailto:"];

/**
 * Whitelists safe URL schemes for links/images (spec §34, §40): http(s) and
 * mailto only. Blocks `javascript:`, `data:`, and other schemes that could
 * be used for script injection. Relative URLs (no scheme) are allowed.
 */
export function isSafeUrl(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed.length === 0) return false;

  // Relative URLs (no scheme, e.g. "/docs/page" or "page.md") are safe.
  if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) {
    return true;
  }

  try {
    const url = new URL(trimmed);
    return ALLOWED_SCHEMES.includes(url.protocol);
  } catch {
    return false;
  }
}

export function normalizeUrl(value: string): string {
  return value.trim();
}
