// DecodeOptions builder — accumulates decoder commands

import type { DecoderCommand } from '../schema/decoders.js';

export class DecodeOptions {
  private commands: DecoderCommand[] = [];
  private jpegDownscaleUsed = false;
  private discardColorProfileUsed = false;
  private ignoreColorProfileErrorUsed = false;
  private webpHintsUsed = false;
  private selectFrameUsed = false;

  toDecoderCommands(): DecoderCommand[] {
    return this.commands;
  }

  setJpegDownscaleHint(
    width: number,
    height: number,
    options?: {
      scaleLumaSpatially?: boolean;
      gammaCorrectForSrgbDuringSpatialLumaScaling?: boolean;
    },
  ): this {
    if (this.jpegDownscaleUsed)
      throw new Error('duplicate options are not allowed');
    this.jpegDownscaleUsed = true;
    this.commands.push({
      jpeg_downscale_hints: {
        width,
        height,
        scale_luma_spatially: options?.scaleLumaSpatially,
        gamma_correct_for_srgb_during_spatial_luma_scaling:
          options?.gammaCorrectForSrgbDuringSpatialLumaScaling,
      },
    });
    return this;
  }

  discardColorProfile(): this {
    if (this.discardColorProfileUsed)
      throw new Error('duplicate options are not allowed');
    this.discardColorProfileUsed = true;
    this.commands.push('discard_color_profile');
    return this;
  }

  ignoreColorProfileError(): this {
    if (this.ignoreColorProfileErrorUsed)
      throw new Error('duplicate options are not allowed');
    this.ignoreColorProfileErrorUsed = true;
    this.commands.push('ignore_color_profile_errors');
    return this;
  }

  setWebpDecoderHints(width: number, height: number): this {
    if (this.webpHintsUsed)
      throw new Error('duplicate options are not allowed');
    this.webpHintsUsed = true;
    this.commands.push({ webp_decoder_hints: { width, height } });
    return this;
  }

  selectFrame(index: number): this {
    if (this.selectFrameUsed)
      throw new Error('duplicate options are not allowed');
    this.selectFrameUsed = true;
    this.commands.push({ select_frame: { index } });
    return this;
  }
}
