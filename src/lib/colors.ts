/** Colours are rendered as inline styles, so only plain 6-digit hex is accepted. */
export function normalizeHexColor(value: string): string | null {
  const candidate = value.trim().toLowerCase();
  const match = /^#?([0-9a-f]{6}|[0-9a-f]{3})$/.exec(candidate);
  if (!match) return null;
  const digits = match[1];
  const full =
    digits.length === 3
      ? digits
          .split("")
          .map((digit) => digit + digit)
          .join("")
      : digits;
  return `#${full}`;
}

/** Relative luminance (WCAG), used to flip page text to a light palette. */
export function isDarkColor(hex: string): boolean {
  const value = normalizeHexColor(hex);
  if (!value) return false;
  const channels = [1, 3, 5].map((offset) => {
    const srgb = parseInt(value.slice(offset, offset + 2), 16) / 255;
    return srgb <= 0.03928 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
  });
  const luminance = 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
  return luminance < 0.4;
}

export const DEFAULT_PAGE_BACKGROUND = "#f8fafc";
