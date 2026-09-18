export type PostTextSegment =
  | { type: 'text'; value: string }
  | { type: 'mention'; value: string }
  | { type: 'hashtag'; value: string };

const TOKEN_PATTERN = /([@#][a-zA-Z0-9_]+)/g;

/** Splits post body text into plain/mention/hashtag segments for styled rendering. */
export function parsePostText(body: string): PostTextSegment[] {
  const segments: PostTextSegment[] = [];
  let lastIndex = 0;

  for (const match of body.matchAll(TOKEN_PATTERN)) {
    const index = match.index ?? 0;
    if (index > lastIndex) {
      segments.push({ type: 'text', value: body.slice(lastIndex, index) });
    }
    const token = match[0];
    segments.push({ type: token[0] === '@' ? 'mention' : 'hashtag', value: token });
    lastIndex = index + token.length;
  }
  if (lastIndex < body.length) {
    segments.push({ type: 'text', value: body.slice(lastIndex) });
  }
  return segments;
}
