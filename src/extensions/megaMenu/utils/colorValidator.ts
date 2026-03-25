/**
 * Validates CSS color values from untrusted sources (e.g., SharePoint list data)
 * to prevent CSS injection attacks via inline style properties.
 *
 * Security finding: S-01
 */

// Matches: #RGB, #RRGGBB, #RRGGBBAA
const HEX_COLOR_REGEX = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/;

// Curated set of safe named CSS colors
const NAMED_COLORS = new Set([
  'transparent',
  'black', 'white', 'red', 'green', 'blue', 'yellow', 'orange', 'purple',
  'gray', 'grey', 'navy', 'teal', 'maroon', 'olive', 'aqua', 'fuchsia',
  'silver', 'lime', 'coral', 'crimson', 'darkblue', 'darkgreen', 'darkred',
  'gold', 'indigo', 'ivory', 'khaki', 'lavender', 'lightblue', 'lightgray',
  'lightgreen', 'lightyellow', 'linen', 'mintcream', 'mistyrose', 'moccasin',
  'oldlace', 'papayawhip', 'peachpuff', 'pink', 'plum', 'salmon', 'seashell',
  'sienna', 'skyblue', 'slategray', 'snow', 'steelblue', 'tan', 'thistle',
  'tomato', 'turquoise', 'violet', 'wheat', 'whitesmoke', 'yellowgreen',
]);

/**
 * Returns true if the value is a safe CSS color (hex or named).
 */
export function isValidColor(value: string): boolean {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return false;
  }

  const trimmed = value.trim();

  if (HEX_COLOR_REGEX.test(trimmed)) {
    return true;
  }

  return NAMED_COLORS.has(trimmed.toLowerCase());
}

/**
 * Returns the color if valid, otherwise returns the fallback.
 */
export function sanitizeColor(value: string, fallback: string): string {
  return isValidColor(value) ? value.trim() : fallback;
}
