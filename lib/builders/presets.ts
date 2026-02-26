// Factory functions for encoder presets

import type { EncoderPreset } from '../schema/encoders.js';
import type { Color } from '../schema/colors.js';
import type { PngBitDepth, QualityProfile } from '../schema/enums.js';

/**
 * Create a GIF encoder preset.
 *
 * @returns Encoder preset for GIF output
 *
 * @example
 * ```ts @import.meta.vitest
 * expect(gif()).toBe('gif');
 * ```
 */
export function gif(): EncoderPreset {
  return 'gif';
}

/**
 * Create a MozJPEG encoder preset.
 *
 * @param quality - JPEG quality (0-100)
 * @param options - Optional: progressive encoding, matte color
 * @returns Encoder preset for MozJPEG output
 *
 * @example
 * ```ts @import.meta.vitest
 * const preset = mozjpeg(85, { progressive: true });
 * expect(preset).toEqual({
 *   mozjpeg: { quality: 85, progressive: true, matte: undefined },
 * });
 * ```
 */
export function mozjpeg(
  quality?: number,
  options?: { progressive?: boolean; matte?: Color },
): EncoderPreset {
  return {
    mozjpeg: {
      quality,
      progressive: options?.progressive,
      matte: options?.matte,
    },
  };
}

/**
 * Create a lossy WebP encoder preset.
 *
 * @param quality - WebP quality (0-100)
 * @returns Encoder preset for lossy WebP output
 *
 * @example
 * ```ts @import.meta.vitest
 * expect(webpLossy(75)).toEqual({ webplossy: { quality: 75 } });
 * ```
 */
export function webpLossy(quality?: number): EncoderPreset {
  return { webplossy: { quality } };
}

/**
 * Create a lossless WebP encoder preset.
 *
 * @returns Encoder preset for lossless WebP output
 *
 * @example
 * ```ts @import.meta.vitest
 * expect(webpLossless()).toBe('webplossless');
 * ```
 */
export function webpLossless(): EncoderPreset {
  return 'webplossless';
}

/**
 * Create a LodePNG encoder preset.
 *
 * @param maximumDeflate - Use maximum deflate compression (slower, smaller)
 * @returns Encoder preset for PNG output via LodePNG
 *
 * @example
 * ```ts @import.meta.vitest
 * expect(lodepng(true)).toEqual({ lodepng: { maximum_deflate: true } });
 * ```
 */
export function lodepng(maximumDeflate?: boolean): EncoderPreset {
  return { lodepng: { maximum_deflate: maximumDeflate } };
}

/**
 * Create a pngquant encoder preset (lossy PNG with palette quantization).
 *
 * @param quality - Target quality (0-100)
 * @param minimumQuality - Minimum acceptable quality
 * @param options - Optional: speed (1-10), maximum deflate
 * @returns Encoder preset for pngquant output
 *
 * @example
 * ```ts @import.meta.vitest
 * expect(pngquant(80, 50, { speed: 3 })).toEqual({
 *   pngquant: { quality: 80, minimum_quality: 50, speed: 3, maximum_deflate: undefined },
 * });
 * ```
 */
export function pngquant(
  quality: number,
  minimumQuality: number,
  options?: { speed?: number; maximumDeflate?: boolean },
): EncoderPreset {
  return {
    pngquant: {
      quality,
      minimum_quality: minimumQuality,
      speed: options?.speed,
      maximum_deflate: options?.maximumDeflate,
    },
  };
}

/**
 * Create a libjpeg-turbo encoder preset.
 *
 * @param quality - JPEG quality (0-100)
 * @param options - Optional: progressive, Huffman optimization, matte color
 * @returns Encoder preset for libjpeg-turbo output
 *
 * @example
 * ```ts @import.meta.vitest
 * expect(libjpegTurbo(90, { progressive: true })).toEqual({
 *   libjpeg_turbo: {
 *     quality: 90, progressive: true,
 *     optimize_huffman_coding: undefined, matte: undefined,
 *   },
 * });
 * ```
 */
export function libjpegTurbo(
  quality?: number,
  options?: { progressive?: boolean; optimizeHuffmanCoding?: boolean; matte?: Color },
): EncoderPreset {
  return {
    libjpeg_turbo: {
      quality,
      progressive: options?.progressive,
      optimize_huffman_coding: options?.optimizeHuffmanCoding,
      matte: options?.matte,
    },
  };
}

/**
 * Create a libpng encoder preset.
 *
 * @param options - Optional: bit depth, matte color, zlib compression level
 * @returns Encoder preset for libpng output
 *
 * @example
 * ```ts @import.meta.vitest
 * expect(libpng({ depth: 'png_32' })).toEqual({
 *   libpng: { depth: 'png_32', matte: undefined, zlib_compression: undefined },
 * });
 * ```
 */
export function libpng(options?: {
  depth?: PngBitDepth;
  matte?: Color;
  zlibCompression?: number;
}): EncoderPreset {
  return {
    libpng: {
      depth: options?.depth,
      matte: options?.matte,
      zlib_compression: options?.zlibCompression,
    },
  };
}

/**
 * Create an auto-format encoder preset. Imageflow picks the best format.
 *
 * @param qualityProfile - Quality/speed tradeoff profile
 * @returns Encoder preset with automatic format selection
 *
 * @example
 * ```ts @import.meta.vitest
 * expect(auto('balanced')).toEqual({ auto: { quality_profile: 'balanced' } });
 * ```
 */
export function auto(qualityProfile?: QualityProfile): EncoderPreset {
  return { auto: { quality_profile: qualityProfile } };
}

/**
 * Create an encoder preset for a specific format string with optional hints.
 *
 * @param fmt - Format name (e.g. 'webp', 'png', 'jpg')
 * @param options - Optional: quality profile, encoder hints
 * @returns Encoder preset targeting the given format
 *
 * @example
 * ```ts @import.meta.vitest
 * expect(format('webp', { qualityProfile: 'fast' })).toEqual({
 *   format: { format: 'webp', quality_profile: 'fast', encoder_hints: undefined },
 * });
 * ```
 */
export function format(
  fmt?: string,
  options?: { qualityProfile?: QualityProfile; encoderHints?: EncoderPreset },
): EncoderPreset {
  return {
    format: {
      format: fmt,
      quality_profile: options?.qualityProfile,
      encoder_hints: options?.encoderHints,
    },
  };
}
