export const MAX_SOCIAL_LINKS = 10;

/** Rendered as anchors on a public page, so only http(s) URLs are accepted. */
export function normalizeLink(value: string): string | null {
  const candidate = value.trim();
  if (!candidate) return null;
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(candidate) ? candidate : `https://${candidate}`;
  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  if (!url.hostname.includes(".")) return null;
  return url.toString();
}

/** Splits the textarea value; the first unusable line is reported back. */
export function parseSocialLinks(value: string): { links: string[]; invalid: string | null } {
  const links: string[] = [];
  for (const line of value.split("\n")) {
    if (!line.trim()) continue;
    const link = normalizeLink(line);
    if (!link) return { links, invalid: line.trim() };
    if (!links.includes(link)) links.push(link);
  }
  return { links: links.slice(0, MAX_SOCIAL_LINKS), invalid: null };
}

export function socialLinksOf(stored: string | null): string[] {
  if (!stored) return [];
  return stored
    .split("\n")
    .map((line) => normalizeLink(line))
    .filter((link): link is string => link !== null);
}
