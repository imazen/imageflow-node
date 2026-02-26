// Wire-format decoder command types matching imageflow JSON API

export type DecoderCommand =
  | { jpeg_downscale_hints: JpegDownscaleHints }
  | { webp_decoder_hints: WebpDecoderHints }
  | 'discard_color_profile'
  | 'ignore_color_profile_errors'
  | { select_frame: SelectFrame };

export interface JpegDownscaleHints {
  width: number;
  height: number;
  scale_luma_spatially?: boolean;
  gamma_correct_for_srgb_during_spatial_luma_scaling?: boolean;
}

export interface WebpDecoderHints {
  width: number;
  height: number;
}

export interface SelectFrame {
  index: number;
}
