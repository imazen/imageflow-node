// DecodeOptions builder — accumulates decoder commands

import type { DecoderCommand } from '../schema/decoders.js';

/**
 * Fluent builder for image decoder options.
 *
 * Each method appends a decoder command and returns `this` for chaining.
 * Duplicate calls to the same option throw to prevent silent misconfiguration.
 *
 * @example
 * ```ts @import.meta.vitest
 * const opts = new DecodeOptions()
 *   .discardColorProfile()
 *   .ignoreColorProfileError();
 * expect(opts.toDecoderCommands()).toEqual([
 *   'discard_color_profile',
 *   'ignore_color_profile_errors',
 * ]);
 * ```
 */
export class DecodeOptions {
  private commands: DecoderCommand[] = [];
  private jpegDownscaleUsed = false;
  private discardColorProfileUsed = false;
  private ignoreColorProfileErrorUsed = false;
  private webpHintsUsed = false;
  private selectFrameUsed = false;

  /** Return the accumulated decoder commands for the pipeline. */
  toDecoderCommands(): DecoderCommand[] {
    return this.commands;
  }

  /**
   * Hint the JPEG decoder to downscale during decode (faster than post-decode resize).
   *
   * @param width - Target width hint
   * @param height - Target height hint
   * @param options - Optional spatial luma scaling and gamma correction flags
   *
   * @example
   * ```ts @import.meta.vitest
   * const cmds = new DecodeOptions().setJpegDownscaleHint(100, 100).toDecoderCommands();
   * expect(cmds).toHaveLength(1);
   * expect(cmds[0]).toEqual({
   *   jpeg_downscale_hints: {
   *     width: 100, height: 100,
   *     scale_luma_spatially: undefined,
   *     gamma_correct_for_srgb_during_spatial_luma_scaling: undefined,
   *   },
   * });
   * ```
   */
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

  /**
   * Discard the embedded color profile during decoding.
   *
   * @example
   * ```ts @import.meta.vitest
   * const opts = new DecodeOptions().discardColorProfile();
   * expect(opts.toDecoderCommands()).toEqual(['discard_color_profile']);
   * ```
   */
  discardColorProfile(): this {
    if (this.discardColorProfileUsed)
      throw new Error('duplicate options are not allowed');
    this.discardColorProfileUsed = true;
    this.commands.push('discard_color_profile');
    return this;
  }

  /**
   * Ignore errors from invalid embedded color profiles instead of failing.
   *
   * @example
   * ```ts @import.meta.vitest
   * const opts = new DecodeOptions().ignoreColorProfileError();
   * expect(opts.toDecoderCommands()).toEqual(['ignore_color_profile_errors']);
   * ```
   */
  ignoreColorProfileError(): this {
    if (this.ignoreColorProfileErrorUsed)
      throw new Error('duplicate options are not allowed');
    this.ignoreColorProfileErrorUsed = true;
    this.commands.push('ignore_color_profile_errors');
    return this;
  }

  /**
   * Provide size hints for the WebP decoder.
   *
   * @param width - Expected width
   * @param height - Expected height
   *
   * @example
   * ```ts @import.meta.vitest
   * const cmds = new DecodeOptions().setWebpDecoderHints(200, 200).toDecoderCommands();
   * expect(cmds[0]).toEqual({ webp_decoder_hints: { width: 200, height: 200 } });
   * ```
   */
  setWebpDecoderHints(width: number, height: number): this {
    if (this.webpHintsUsed)
      throw new Error('duplicate options are not allowed');
    this.webpHintsUsed = true;
    this.commands.push({ webp_decoder_hints: { width, height } });
    return this;
  }

  /**
   * Select a specific frame from a multi-frame image (e.g. animated GIF).
   *
   * @param index - Zero-based frame index
   *
   * @example
   * ```ts @import.meta.vitest
   * const cmds = new DecodeOptions().selectFrame(3).toDecoderCommands();
   * expect(cmds[0]).toEqual({ select_frame: { index: 3 } });
   * ```
   */
  selectFrame(index: number): this {
    if (this.selectFrameUsed)
      throw new Error('duplicate options are not allowed');
    this.selectFrameUsed = true;
    this.commands.push({ select_frame: { index } });
    return this;
  }
}
