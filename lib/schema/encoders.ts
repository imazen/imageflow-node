// Wire-format encoder preset types matching imageflow JSON API

import type { Color } from './colors.js';
import type { PngBitDepth, QualityProfile } from './enums.js';

export type EncoderPreset =
  | 'gif'
  | { mozjpeg: MozjpegOptions }
  | { webplossy: WebpLossyOptions }
  | 'webplossless'
  | { lodepng: LodepngOptions }
  | { pngquant: PngquantOptions }
  | { libjpeg_turbo: LibjpegTurboOptions }
  | { libpng: LibpngOptions }
  | { auto: AutoOptions }
  | { format: FormatOptions };

export interface MozjpegOptions {
  quality?: number;
  progressive?: boolean;
  matte?: Color;
}

export interface WebpLossyOptions {
  quality?: number;
}

export interface LodepngOptions {
  maximum_deflate?: boolean;
}

export interface PngquantOptions {
  quality?: number;
  minimum_quality?: number;
  speed?: number;
  maximum_deflate?: boolean;
}

export interface LibjpegTurboOptions {
  quality?: number;
  progressive?: boolean;
  optimize_huffman_coding?: boolean;
  matte?: Color;
}

export interface LibpngOptions {
  depth?: PngBitDepth;
  matte?: Color;
  zlib_compression?: number;
}

export interface AutoOptions {
  quality_profile?: QualityProfile;
}

export interface FormatOptions {
  format?: string;
  quality_profile?: QualityProfile;
  encoder_hints?: EncoderPreset;
}
