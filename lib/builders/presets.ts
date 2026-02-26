// Factory functions for encoder presets

import type { EncoderPreset } from '../schema/encoders.js';
import type { Color } from '../schema/colors.js';
import type { PngBitDepth, QualityProfile } from '../schema/enums.js';

export function gif(): EncoderPreset {
  return 'gif';
}

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

export function webpLossy(quality?: number): EncoderPreset {
  return { webplossy: { quality } };
}

export function webpLossless(): EncoderPreset {
  return 'webplossless';
}

export function lodepng(maximumDeflate?: boolean): EncoderPreset {
  return { lodepng: { maximum_deflate: maximumDeflate } };
}

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

export function auto(qualityProfile?: QualityProfile): EncoderPreset {
  return { auto: { quality_profile: qualityProfile } };
}

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
