// Steps — fluent builder for imageflow graph-based pipelines
//
// Each method appends a node to the internal DAG and returns `this`
// for chaining. Call execute() to run the pipeline.

import type { Node } from '../schema/nodes.js';
import type { Edge } from '../schema/graph.js';
import type { EncoderPreset } from '../schema/encoders.js';
import type { Constraint, ResampleHints, ConstraintGravity } from '../schema/constraints.js';
import type { Color } from '../schema/colors.js';
import type { CompositingMode, FitMode, PixelFormat, ColorFilterSrgb } from '../schema/enums.js';
import type { WatermarkConstraintBox } from '../schema/watermark.js';
import type { Response001, JobResult } from '../schema/responses.js';
import type { DecoderCommand } from '../schema/decoders.js';
import { DecodeOptions } from './decode-options.js';
import { mozjpeg, lodepng, webpLossless } from './presets.js';
import type { IOSource, IODestination } from '../io/types.js';
import { FromFile } from '../io/file.js';
import { FromBuffer } from '../io/buffer.js';
import { FromStream } from '../io/stream.js';
import { NativeJob, getLongVersionString } from '../job.js';

// Internal graph adjacency
interface InternalEdge {
  to: number;
  kind: string;
}

class GraphBuilder {
  private adj = new Map<number, InternalEdge[]>();

  addVertex(id: number): void {
    if (this.adj.has(id)) throw new Error('vertex is already present');
    this.adj.set(id, []);
  }

  addEdge(from: number, to: number, kind = 'input'): void {
    if (!this.adj.has(from) || !this.adj.has(to))
      throw new Error('vertex not found in graph');
    this.adj.get(from)!.push({ to, kind });
  }

  toEdges(): Edge[] {
    const edges: Edge[] = [];
    for (const [from, targets] of this.adj) {
      for (const { to, kind } of targets) {
        edges.push({ from, to, kind });
      }
    }
    return edges;
  }
}

/** Result returned by {@link Steps.execute} and {@link Steps.executeCommand}. */
export interface ExecuteResult {
  /** Raw response from the imageflow engine. */
  response: Response001;
  /** Parsed job result with encode/decode metadata. */
  jobResult: JobResult;
  /** Named output buffers (keyed by the key passed to FromBuffer). */
  buffers: Record<string, Buffer>;
}

/**
 * Graph-based image processing pipeline with full branching and multi-output support.
 *
 * Each method appends a node to an internal DAG and returns `this` for chaining.
 * For simpler single-input/single-output workflows, see {@link Pipeline}.
 */
export class Steps {
  private graph = new GraphBuilder();
  private nodes: Node[] = [];
  private ioId = 0;
  private inputs: IOSource[] = [];
  private outputs: IODestination[] = [];
  private last = 0;
  private hasDecoded = false;

  /**
   * Create a new pipeline, optionally starting with a decode step.
   *
   * @param source - Input image source (omit for manual decode via {@link decode})
   * @param options - Optional decode options (color profile handling, downscale hints)
   */
  constructor(source?: IOSource, options?: DecodeOptions) {
    if (source) {
      source.setIOID(this.ioId, 'in');
      this.inputs.push(source);
      const commands = options?.toDecoderCommands();
      this.nodes.push({ decode: { io_id: this.ioId, commands } });
      this.graph.addVertex(0);
      this.last = 0;
      this.ioId++;
      this.hasDecoded = true;
    }
  }

  // ── Input ───────────────────────────────────────────────────

  /** Add a decode node for an additional image source (used in multi-input pipelines). */
  decode(source: IOSource, options?: DecodeOptions): this {
    source.setIOID(this.ioId, 'in');
    this.inputs.push(source);
    const commands = options?.toDecoderCommands();
    const idx = this.nodes.length;
    this.nodes.push({ decode: { io_id: this.ioId, commands } });
    this.graph.addVertex(idx);
    this.last = idx;
    this.ioId++;
    this.hasDecoded = true;
    return this;
  }

  // ── Output ──────────────────────────────────────────────────

  /** Encode the current image state to a destination using the given preset. */
  encode(dest: IODestination, preset: EncoderPreset): this {
    this.requireDecode();
    dest.setIOID(this.ioId, 'out');
    this.outputs.push(dest);
    const idx = this.nodes.length;
    this.nodes.push({ encode: { io_id: this.ioId, preset } });
    this.graph.addVertex(idx);
    this.graph.addEdge(this.last, idx);
    this.last = idx;
    this.ioId++;
    return this;
  }

  // ── Convenience output shortcuts ────────────────────────────

  /** Encode to JPEG using MozJPEG (default quality 90). */
  toJpeg(
    dest: IODestination,
    options?: { quality?: number; progressive?: boolean; matte?: Color },
  ): this {
    return this.encode(
      dest,
      mozjpeg(options?.quality ?? 90, {
        progressive: options?.progressive,
        matte: options?.matte,
      }),
    );
  }

  /** Encode to PNG using LodePNG. */
  toPng(dest: IODestination, maximumDeflate = false): this {
    return this.encode(dest, lodepng(maximumDeflate));
  }

  /** Encode to lossless WebP. */
  toWebP(dest: IODestination): this {
    return this.encode(dest, webpLossless());
  }

  /** Encode and write to a file path. */
  toFile(preset: EncoderPreset, filePath: string): this {
    return this.encode(new FromFile(filePath), preset);
  }

  /** Encode to an in-memory buffer, optionally keyed for retrieval from {@link ExecuteResult.buffers}. */
  toBuffer(preset: EncoderPreset, key?: string): this {
    return this.encode(new FromBuffer(null, key), preset);
  }

  /** Encode and pipe to a writable stream. */
  toStream(preset: EncoderPreset, stream: NodeJS.WritableStream): this {
    return this.encode(new FromStream(stream), preset);
  }

  // ── Transforms ──────────────────────────────────────────────

  /** Constrain the image to fit within the given dimensions, preserving aspect ratio. */
  constrainWithin(w: number, h: number): this {
    return this.constrain({ mode: 'within', w, h });
  }

  /** Apply a constraint with full control over mode and parameters. */
  constrain(c: Constraint): this {
    return this.addStep({ constrain: c });
  }

  /** Resize to exact dimensions, ignoring aspect ratio. */
  distort(w: number, h: number, hints?: ResampleHints): this {
    return this.addStep({ resample_2d: { w, h, hints } });
  }

  /** Rotate 90 degrees clockwise. */
  rotate90(): this {
    return this.addStep('rotate_90');
  }

  /** Rotate 180 degrees. */
  rotate180(): this {
    return this.addStep('rotate_180');
  }

  /** Rotate 270 degrees clockwise (90 degrees counter-clockwise). */
  rotate270(): this {
    return this.addStep('rotate_270');
  }

  /** Flip the image vertically. */
  flipVertical(): this {
    return this.addStep('flip_v');
  }

  /** Flip the image horizontally. */
  flipHorizontal(): this {
    return this.addStep('flip_h');
  }

  /** Transpose the image (swap x and y axes). */
  transpose(): this {
    return this.addStep('transpose');
  }

  /** Apply EXIF orientation correction. */
  applyOrientation(flag: number): this {
    return this.addStep({ apply_orientation: { flag } });
  }

  // ── Crop / Region ───────────────────────────────────────────

  /** Crop to the rectangle defined by pixel coordinates. */
  crop(x1: number, y1: number, x2: number, y2: number): this {
    return this.addStep({ crop: { x1, y1, x2, y2 } });
  }

  /** Extract a region with a background color fill for out-of-bounds areas. */
  region(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    backgroundColor: Color,
  ): this {
    return this.addStep({ region: { x1, y1, x2, y2, background_color: backgroundColor } });
  }

  /** Extract a region using percentage-based coordinates. */
  regionPercent(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    backgroundColor: Color,
  ): this {
    return this.addStep({
      region_percent: { x1, y1, x2, y2, background_color: backgroundColor },
    });
  }

  /** Auto-crop whitespace around the image content. */
  cropWhitespace(threshold: number, percentPadding: number): this {
    return this.addStep({
      crop_whitespace: { threshold, percent_padding: percentPadding },
    });
  }

  // ── Canvas / Drawing ────────────────────────────────────────

  /** Fill a rectangle on the image with a solid color. */
  fillRect(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    color: Color,
  ): this {
    return this.addStep({ fill_rect: { x1, y1, x2, y2, color } });
  }

  /** Expand the canvas by adding padding on each side. */
  expandCanvas(
    edges: { left?: number; top?: number; right?: number; bottom?: number },
    color: Color,
  ): this {
    return this.addStep({
      expand_canvas: {
        left: edges.left ?? 0,
        top: edges.top ?? 0,
        right: edges.right ?? 0,
        bottom: edges.bottom ?? 0,
        color,
      },
    });
  }

  /** Create a blank canvas with a solid color fill. */
  createCanvas(
    w: number,
    h: number,
    format: PixelFormat,
    color: Color,
  ): this {
    return this.addStep({ create_canvas: { w, h, format, color } });
  }

  /** Round the corners of the image. */
  roundImageCorners(radius: number, backgroundColor?: Color): this {
    return this.addStep({
      round_image_corners: { radius, background_color: backgroundColor },
    });
  }

  // ── Watermark ───────────────────────────────────────────────

  /** Overlay a watermark image with optional gravity, fit, and opacity settings. */
  watermark(
    source: IOSource,
    options?: {
      gravity?: ConstraintGravity;
      fitMode?: FitMode;
      fitBox?: WatermarkConstraintBox;
      opacity?: number;
      hints?: ResampleHints;
    },
  ): this {
    this.requireDecode();
    source.setIOID(this.ioId, 'in');
    this.inputs.push(source);
    const idx = this.nodes.length;
    this.nodes.push({
      watermark: {
        io_id: this.ioId,
        gravity: options?.gravity,
        fit_mode: options?.fitMode,
        fit_box: options?.fitBox,
        opacity: options?.opacity,
        hints: options?.hints,
      },
    });
    this.graph.addVertex(idx);
    this.graph.addEdge(this.last, idx);
    this.last = idx;
    this.ioId++;
    return this;
  }

  /** Add a small red dot watermark (for testing). */
  watermarkRedDot(): this {
    return this.addStep('watermark_red_dot');
  }

  // ── Color Filters ───────────────────────────────────────────

  /** Invert all colors. */
  colorFilterInvert(): this {
    return this.addStep({ color_filter_srgb: 'invert' });
  }

  /** Convert to grayscale using NTSC/Rec.601 luma weights. */
  colorFilterGrayscaleNtsc(): this {
    return this.addStep({ color_filter_srgb: 'grayscale_ntsc' });
  }

  /** Convert to grayscale using flat (equal) channel weights. */
  colorFilterGrayscaleFlat(): this {
    return this.addStep({ color_filter_srgb: 'grayscale_flat' });
  }

  /** Convert to grayscale using BT.709 luma weights. */
  colorFilterGrayscaleBt709(): this {
    return this.addStep({ color_filter_srgb: 'grayscale_bt709' });
  }

  /** Convert to grayscale using R-Y luma weights. */
  colorFilterGrayscaleRY(): this {
    return this.addStep({ color_filter_srgb: 'grayscale_ry' });
  }

  /** Apply a sepia tone filter. */
  colorFilterSepia(): this {
    return this.addStep({ color_filter_srgb: 'sepia' });
  }

  /** Adjust alpha channel (0.0 = transparent, 1.0 = opaque). */
  colorFilterAlpha(value: number): this {
    return this.addStep({ color_filter_srgb: { alpha: value } });
  }

  /** Adjust brightness (1.0 = unchanged). */
  colorFilterBrightness(value: number): this {
    return this.addStep({ color_filter_srgb: { brightness: value } });
  }

  /** Adjust contrast (1.0 = unchanged). */
  colorFilterContrast(value: number): this {
    return this.addStep({ color_filter_srgb: { contrast: value } });
  }

  /** Adjust saturation (1.0 = unchanged, 0.0 = grayscale). */
  colorFilterSaturation(value: number): this {
    return this.addStep({ color_filter_srgb: { saturation: value } });
  }

  /** Apply a custom sRGB color matrix transformation. */
  colorMatrixSrgb(matrix: number[][]): this {
    return this.addStep({ color_matrix_srgb: { matrix } });
  }

  // ── Misc ────────────────────────────────────────────────────

  /** Apply automatic white balance using a histogram area threshold. */
  whiteBalance(threshold: number): this {
    return this.addStep({
      white_balance_histogram_area_threshold_srgb: { threshold },
    });
  }

  /** Execute an imageflow command string (IR4 query syntax). */
  command(value: string): this {
    return this.addStep({
      command_string: { kind: 'ir4', value },
    });
  }

  // ── Branching ───────────────────────────────────────────────

  /** Branch the pipeline: run a callback that can add nodes, then restore the insertion point. */
  branch(fn: (steps: Steps) => void): this {
    const saved = this.last;
    fn(this);
    this.last = saved;
    return this;
  }

  /** Draw another image at exact pixel coordinates onto the current canvas. */
  drawImageExactTo(
    fn: (steps: Steps) => void,
    coordinates: { x: number; y: number; w: number; h: number },
    blend?: CompositingMode,
    hints?: ResampleHints,
  ): this {
    const saved = this.last;
    fn(this);
    this.requireDecode();
    const idx = this.nodes.length;
    this.nodes.push({
      draw_image_exact: { ...coordinates, blend, hints },
    });
    this.graph.addVertex(idx);
    this.graph.addEdge(saved, idx, 'input');
    this.graph.addEdge(this.last, idx, 'canvas');
    this.last = idx;
    return this;
  }

  /** Copy a rectangle from another image onto the current canvas. */
  copyRectToCanvas(
    fn: (steps: Steps) => void,
    coordinates: { x: number; y: number; w: number; h: number },
    fromX: number,
    fromY: number,
  ): this {
    const saved = this.last;
    fn(this);
    this.requireDecode();
    const idx = this.nodes.length;
    this.nodes.push({
      copy_rect_to_canvas: {
        from_x: fromX,
        from_y: fromY,
        w: coordinates.w,
        h: coordinates.h,
        x: coordinates.x,
        y: coordinates.y,
      },
    });
    this.graph.addVertex(idx);
    this.graph.addEdge(saved, idx, 'input');
    this.graph.addEdge(this.last, idx, 'canvas');
    this.last = idx;
    return this;
  }

  // ── Execution ───────────────────────────────────────────────

  /** Run the pipeline and return results with named output buffers. */
  async execute(): Promise<ExecuteResult> {
    this.requireDecode();
    const job = new NativeJob();

    // Load inputs
    await Promise.all(
      this.inputs.map(async (src) => {
        const buf = await src.toBuffer();
        job.addInputBytes(src.ioID, buf);
      }),
    );

    // Allocate outputs
    for (const dest of this.outputs) {
      job.addOutputBuffer(dest.ioID);
    }

    // Build graph JSON
    const nodesObj: Record<string, Node> = {};
    for (let i = 0; i < this.nodes.length; i++) {
      nodesObj[i.toString()] = this.nodes[i];
    }
    const json = JSON.stringify({
      framewise: {
        graph: {
          nodes: nodesObj,
          edges: this.graph.toEdges(),
        },
      },
    });

    const responseStr = await job.message('v1/execute', json);
    const response: Response001 = JSON.parse(responseStr);

    // Collect outputs
    const buffers: Record<string, Buffer> = {};
    await Promise.all(
      this.outputs.map(async (dest) => {
        const ab = job.getOutputBufferBytes(dest.ioID);
        await dest.toOutput(ab, buffers);
      }),
    );

    const jobResult =
      'job_result' in response.data
        ? response.data.job_result
        : 'build_result' in response.data
          ? response.data.build_result
          : { encodes: [] };

    return { response, jobResult, buffers };
  }

  /** Quick command-string execution for simple single-input/output workflows */
  async executeCommand(
    commandValue: string,
    input: IOSource,
    output: IODestination,
  ): Promise<ExecuteResult> {
    const job = new NativeJob();
    const inputBuf = await input.toBuffer();
    job.addInputBytes(0, inputBuf);
    job.addOutputBuffer(1);

    const json = JSON.stringify({
      framewise: {
        steps: [
          {
            command_string: {
              kind: 'ir4' as const,
              value: commandValue,
              decode: 0,
              encode: 1,
            },
          },
        ],
      },
    });

    const responseStr = await job.message('v1/execute', json);
    const response: Response001 = JSON.parse(responseStr);
    const buffers: Record<string, Buffer> = {};
    const ab = job.getOutputBufferBytes(1);
    await output.toOutput(ab, buffers);

    const jobResult =
      'job_result' in response.data
        ? response.data.job_result
        : 'build_result' in response.data
          ? response.data.build_result
          : { encodes: [] };

    return { response, jobResult, buffers };
  }

  // ── Internal helpers ────────────────────────────────────────

  private addStep(node: Node): this {
    this.requireDecode();
    const idx = this.nodes.length;
    this.nodes.push(node);
    this.graph.addVertex(idx);
    this.graph.addEdge(this.last, idx);
    this.last = idx;
    return this;
  }

  private requireDecode(): void {
    if (!this.hasDecoded)
      throw new Error('decode must be the first node in graph');
  }
}
