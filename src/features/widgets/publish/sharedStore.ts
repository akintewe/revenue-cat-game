/**
 * Where the widget snapshot goes. Metro picks sharedStore.ios.ts or sharedStore.android.ts;
 * this file is the fallback for web and for jest, and the shape TypeScript checks against.
 */
export type CoverRef = { coverFile: string | null; coverUrl: string | null };

export async function writeSnapshot(_json: string): Promise<void> {}

/** Copies cover art to where the widgets can read it. Never throws. */
export async function cacheCovers(_covers: CoverRef[]): Promise<void> {}

export function reloadWidgets(): void {}
