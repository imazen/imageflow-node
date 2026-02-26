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

export interface PipelineResult {
  response: Response001;
  jobResult: JobResult;
  outputBuffer: Buffer;
}

export class Pipeline {
  private steps: Node[] = [];
  private source: IOSource;
  private decodeIoId = 0;
  private encodeIoId = 1;
  private encodePreset?: EncoderPreset;

  constructor(source: IOSource, options?: DecodeOptions) {
    this.source = source;
    const commands = options?.toDecoderCommands();
    this.steps.push({ decode: { io_id: this.decodeIoId, commands } });
  }

  // ── Transforms ──────────────────────────────────────────────

  constrainWithin(w: number, h: number): this {
    this.steps.push({ constrain: { mode: 'within', w, h } });
    return this;
  }

  constrain(c: Constraint): this {
    this.steps.push({ constrain: c });
    return this;
  }

  distort(w: number, h: number, hints?: ResampleHints): this {
    this.steps.push({ resample_2d: { w, h, hints } });
    return this;
  }

  rotate90(): this { this.steps.push('rotate_90'); return this; }
  rotate180(): this { this.steps.push('rotate_180'); return this; }
  rotate270(): this { this.steps.push('rotate_270'); return this; }
  flipVertical(): this { this.steps.push('flip_v'); return this; }
  flipHorizontal(): this { this.steps.push('flip_h'); return this; }
  transpose(): this { this.steps.push('transpose'); return this; }

  applyOrientation(flag: number): this {
    this.steps.push({ apply_orientation: { flag } });
    return this;
  }

  // ── Crop / Region ───────────────────────────────────────────

  crop(x1: number, y1: number, x2: number, y2: number): this {
    this.steps.push({ crop: { x1, y1, x2, y2 } });
    return this;
  }

  cropWhitespace(threshold: number, percentPadding: number): this {
    this.steps.push({ crop_whitespace: { threshold, percent_padding: percentPadding } });
    return this;
  }

  region(x1: number, y1: number, x2: number, y2: number, bg: Color): this {
    this.steps.push({ region: { x1, y1, x2, y2, background_color: bg } });
    return this;
  }

  // ── Canvas ──────────────────────────────────────────────────

  fillRect(x1: number, y1: number, x2: number, y2: number, color: Color): this {
    this.steps.push({ fill_rect: { x1, y1, x2, y2, color } });
    return this;
  }

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

  roundImageCorners(radius: number, backgroundColor?: Color): this {
    this.steps.push({ round_image_corners: { radius, background_color: backgroundColor } });
    return this;
  }

  // ── Color Filters ───────────────────────────────────────────

  colorFilterInvert(): this { this.steps.push({ color_filter_srgb: 'invert' }); return this; }
  colorFilterGrayscaleNtsc(): this { this.steps.push({ color_filter_srgb: 'grayscale_ntsc' }); return this; }
  colorFilterGrayscaleFlat(): this { this.steps.push({ color_filter_srgb: 'grayscale_flat' }); return this; }
  colorFilterGrayscaleBt709(): this { this.steps.push({ color_filter_srgb: 'grayscale_bt709' }); return this; }
  colorFilterSepia(): this { this.steps.push({ color_filter_srgb: 'sepia' }); return this; }
  colorFilterAlpha(v: number): this { this.steps.push({ color_filter_srgb: { alpha: v } }); return this; }
  colorFilterBrightness(v: number): this { this.steps.push({ color_filter_srgb: { brightness: v } }); return this; }
  colorFilterContrast(v: number): this { this.steps.push({ color_filter_srgb: { contrast: v } }); return this; }
  colorFilterSaturation(v: number): this { this.steps.push({ color_filter_srgb: { saturation: v } }); return this; }

  // ── Misc ────────────────────────────────────────────────────

  whiteBalance(threshold: number): this {
    this.steps.push({ white_balance_histogram_area_threshold_srgb: { threshold } });
    return this;
  }

  command(value: string): this {
    this.steps.push({ command_string: { kind: 'ir4', value } });
    return this;
  }

  // ── Output preset ───────────────────────────────────────────

  encodeTo(preset: EncoderPreset): this {
    this.encodePreset = preset;
    return this;
  }

  // ── Execution ───────────────────────────────────────────────

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
