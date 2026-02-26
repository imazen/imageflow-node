// Pipeline — simplified linear builder using framewise.steps (no graph)
//
// For common single-input/single-output workflows where you don't
// need branching or multi-input operations.

import type { Node } from '../schema/nodes.js';
import type { EncoderPreset } from '../schema/encoders.js';
import type { Constraint, ResampleHints } from '../schema/constraints.js';
import type { Color } from '../schema/colors.js';
import type { PixelFormat, ColorFilterSrgb } from '../schema/enums.js';
import type { Response001, JobResult } from '../schema/responses.js';
import type { DecoderCommand } from '../schema/decoders.js';
import { DecodeOptions } from './decode-options.js';
import { mozjpeg, lodepng, webpLossless } from './presets.js';
import type { IOSource, IODestination } from '../io/types.js';
import { NativeJob } from '../job.js';

/** Result returned by {@link Pipeline.execute}. */
export interface PipelineResult {
  /** Raw response from the imageflow engine. */
  response: Response001;
  /** Parsed job result with encode/decode metadata. */
  jobResult: JobResult;
  /** The encoded output image bytes. */
  outputBuffer: Buffer;
}

/**
 * Linear image processing pipeline for single-input/single-output workflows.
 *
 * Use this instead of {@link Steps} when you don't need
 * branching or multi-input operations. Call {@link execute} with an encoder preset
 * to run the pipeline and get the output buffer.
 */
export class Pipeline {
  private steps: Node[] = [];
  private source: IOSource;
  private decodeIoId = 0;
  private encodeIoId = 1;
  private encodePreset?: EncoderPreset;

  /**
   * Create a pipeline from an image source.
   *
   * @param source - Input image source
   * @param options - Optional decode options (color profile handling, downscale hints)
   */
  constructor(source: IOSource, options?: DecodeOptions) {
    this.source = source;
    const commands = options?.toDecoderCommands();
    this.steps.push({ decode: { io_id: this.decodeIoId, commands } });
  }

  // ── Transforms ──────────────────────────────────────────────

  /** Constrain the image to fit within the given dimensions, preserving aspect ratio. */
  constrainWithin(w: number, h: number): this {
    this.steps.push({ constrain: { mode: 'within', w, h } });
    return this;
  }

  /** Apply a constraint with full control over mode and parameters. */
  constrain(c: Constraint): this {
    this.steps.push({ constrain: c });
    return this;
  }

  /** Resize to exact dimensions, ignoring aspect ratio. */
  distort(w: number, h: number, hints?: ResampleHints): this {
    this.steps.push({ resample_2d: { w, h, hints } });
    return this;
  }

  /** Rotate 90 degrees clockwise. */
  rotate90(): this { this.steps.push('rotate_90'); return this; }
  /** Rotate 180 degrees. */
  rotate180(): this { this.steps.push('rotate_180'); return this; }
  /** Rotate 270 degrees clockwise (90 degrees counter-clockwise). */
  rotate270(): this { this.steps.push('rotate_270'); return this; }
  /** Flip the image vertically. */
  flipVertical(): this { this.steps.push('flip_v'); return this; }
  /** Flip the image horizontally. */
  flipHorizontal(): this { this.steps.push('flip_h'); return this; }
  /** Transpose the image (swap x and y axes). */
  transpose(): this { this.steps.push('transpose'); return this; }

  /** Apply EXIF orientation correction. */
  applyOrientation(flag: number): this {
    this.steps.push({ apply_orientation: { flag } });
    return this;
  }

  // ── Crop / Region ───────────────────────────────────────────

  /** Crop to the rectangle defined by pixel coordinates. */
  crop(x1: number, y1: number, x2: number, y2: number): this {
    this.steps.push({ crop: { x1, y1, x2, y2 } });
    return this;
  }

  /** Auto-crop whitespace around the image content. */
  cropWhitespace(threshold: number, percentPadding: number): this {
    this.steps.push({ crop_whitespace: { threshold, percent_padding: percentPadding } });
    return this;
  }

  /** Extract a region with a background color fill for out-of-bounds areas. */
  region(x1: number, y1: number, x2: number, y2: number, bg: Color): this {
    this.steps.push({ region: { x1, y1, x2, y2, background_color: bg } });
    return this;
  }

  // ── Canvas ──────────────────────────────────────────────────

  /** Fill a rectangle on the image with a solid color. */
  fillRect(x1: number, y1: number, x2: number, y2: number, color: Color): this {
    this.steps.push({ fill_rect: { x1, y1, x2, y2, color } });
    return this;
  }

  /** Expand the canvas by adding padding on each side. */
  expandCanvas(
    edges: { left?: number; top?: number; right?: number; bottom?: number },
    color: Color,
  ): this {
    this.steps.push({
      expand_canvas: {
        left: edges.left ?? 0,
        top: edges.top ?? 0,
        right: edges.right ?? 0,
        bottom: edges.bottom ?? 0,
        color,
      },
    });
    return this;
  }

  /** Round the corners of the image. */
  roundImageCorners(radius: number, backgroundColor?: Color): this {
    this.steps.push({ round_image_corners: { radius, background_color: backgroundColor } });
    return this;
  }

  // ── Color Filters ───────────────────────────────────────────

  /** Invert all colors. */
  colorFilterInvert(): this { this.steps.push({ color_filter_srgb: 'invert' }); return this; }
  /** Convert to grayscale using NTSC/Rec.601 luma weights. */
  colorFilterGrayscaleNtsc(): this { this.steps.push({ color_filter_srgb: 'grayscale_ntsc' }); return this; }
  /** Convert to grayscale using flat (equal) channel weights. */
  colorFilterGrayscaleFlat(): this { this.steps.push({ color_filter_srgb: 'grayscale_flat' }); return this; }
  /** Convert to grayscale using BT.709 luma weights. */
  colorFilterGrayscaleBt709(): this { this.steps.push({ color_filter_srgb: 'grayscale_bt709' }); return this; }
  /** Apply a sepia tone filter. */
  colorFilterSepia(): this { this.steps.push({ color_filter_srgb: 'sepia' }); return this; }
  /** Adjust alpha channel (0.0 = transparent, 1.0 = opaque). */
  colorFilterAlpha(v: number): this { this.steps.push({ color_filter_srgb: { alpha: v } }); return this; }
  /** Adjust brightness (1.0 = unchanged). */
  colorFilterBrightness(v: number): this { this.steps.push({ color_filter_srgb: { brightness: v } }); return this; }
  /** Adjust contrast (1.0 = unchanged). */
  colorFilterContrast(v: number): this { this.steps.push({ color_filter_srgb: { contrast: v } }); return this; }
  /** Adjust saturation (1.0 = unchanged, 0.0 = grayscale). */
  colorFilterSaturation(v: number): this { this.steps.push({ color_filter_srgb: { saturation: v } }); return this; }

  // ── Misc ────────────────────────────────────────────────────

  /** Apply automatic white balance using a histogram area threshold. */
  whiteBalance(threshold: number): this {
    this.steps.push({ white_balance_histogram_area_threshold_srgb: { threshold } });
    return this;
  }

  /** Execute an imageflow command string (IR4 query syntax). */
  command(value: string): this {
    this.steps.push({ command_string: { kind: 'ir4', value } });
    return this;
  }

  // ── Output preset ───────────────────────────────────────────

  /** Set the encoder preset to use when {@link execute} is called without one. */
  encodeTo(preset: EncoderPreset): this {
    this.encodePreset = preset;
    return this;
  }

  // ── Execution ───────────────────────────────────────────────

  /**
   * Run the pipeline and return the encoded output.
   *
   * @param preset - Encoder preset (overrides any preset set via {@link encodeTo})
   * @returns The pipeline result including raw response, job metadata, and output buffer
   * @throws If no encoder preset was specified via either parameter or {@link encodeTo}
   */
  async execute(preset?: EncoderPreset): Promise<PipelineResult> {
    const finalPreset = preset ?? this.encodePreset;
    if (!finalPreset) throw new Error('No encoder preset specified. Call encodeTo() or pass preset to execute().');

    this.steps.push({ encode: { io_id: this.encodeIoId, preset: finalPreset } });

    const job = new NativeJob();
    this.source.setIOID(this.decodeIoId, 'in');
    const inputBuf = await this.source.toBuffer();
    job.addInputBytes(this.decodeIoId, inputBuf);
    job.addOutputBuffer(this.encodeIoId);

    const json = JSON.stringify({ framewise: { steps: this.steps } });
    const responseStr = await job.message('v1/execute', json);
    const response: Response001 = JSON.parse(responseStr);

    const ab = job.getOutputBufferBytes(this.encodeIoId);
    const outputBuffer = Buffer.from(ab);

    const jobResult =
      'job_result' in response.data
        ? response.data.job_result
        : 'build_result' in response.data
          ? response.data.build_result
          : { encodes: [] };

    return { response, jobResult, outputBuffer };
  }
}
