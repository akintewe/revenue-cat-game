import { Image } from 'expo-image';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { File } from 'expo-file-system';
import * as UPNG from 'upng-js';
import { analyzeCover, type CoverFocus } from './analyzeCover';

/** Analysis grid width in pixels. A 3:4 cover becomes 48 × 64 — about 3 K pixels, a ~5 KB PNG. */
const ANALYSIS_WIDTH = 48;

/**
 * Downloads (through expo-image's cache), shrinks and analyses one cover.
 * The shrink runs natively; only the tiny PNG is decoded in JS.
 */
export async function analyzeCoverUrl(url: string): Promise<CoverFocus> {
  // Decode at a small size straight away so the full cover never sits in JS-visible memory.
  const source = await Image.loadAsync(url, { maxWidth: ANALYSIS_WIDTH * 2 });
  try {
    const context = ImageManipulator.manipulate(source);
    context.resize({ width: ANALYSIS_WIDTH });
    const rendered = await context.renderAsync();
    try {
      const saved = await rendered.saveAsync({ format: SaveFormat.PNG, compress: 1 });
      const file = new File(saved.uri);
      try {
        const bytes = await file.bytes();
        const png = UPNG.decode(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
        const [frame] = UPNG.toRGBA8(png);
        return analyzeCover({ width: png.width, height: png.height, rgba: new Uint8Array(frame) });
      } finally {
        try {
          file.delete();
        } catch {
          // The cache directory is purged by the OS anyway.
        }
      }
    } finally {
      rendered.release();
    }
  } finally {
    source.release();
  }
}
