/**
 * Clamps a raw description to roughly `maxChars`, collapsing whitespace first.
 * 30.6% of IGDB summaries contain a literal newline — clamping the raw string
 * spends a line on blank space for a third of games, so collapse before cutting.
 * Cuts on a word boundary where possible; the caller decides whether to show an
 * ellipsis (none is added server-side, and none is added here either).
 */
export function clampSummary(raw: string, maxChars: number): { text: string; truncated: boolean } {
  const collapsed = raw.replace(/\s+/g, ' ').trim();
  if (collapsed.length <= maxChars) return { text: collapsed, truncated: false };
  const cut = collapsed.slice(0, maxChars);
  const lastSpace = cut.lastIndexOf(' ');
  const text = lastSpace > maxChars * 0.6 ? cut.slice(0, lastSpace) : cut;
  return { text, truncated: true };
}
