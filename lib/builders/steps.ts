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

export interface ExecuteResult {
  /** Raw response from imageflow engine */
  response: Response001;
  /** Parsed job result with encode/decode metadata */
  jobResult: JobResult;
  /** Named output buffers (keyed by the key passed to FromBuffer) */
  buffers: Record<string, Buffer>;
}

export class Steps {
  private graph = new GraphBuilder();
  private nodes: Node[] = [];
  private ioId = 0;
  private inputs: IOSource[] = [];
  private outputs: IODestination[] = [];
  private last = 0;
  private hasDecoded = false;

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

  toPng(dest: IODestination, maximumDeflate = false): this {
    return this.encode(dest, lodepng(maximumDeflate));
  }

  toWebP(dest: IODestination): this {
    return this.encode(dest, webpLossless());
  }

  toFile(preset: EncoderPreset, filePath: string): this {
    // Lazy import to avoid circular dependency at module load time
    const { FromFile } = require('../io/file.js') as typeof import('../io/file.js');
    return this.encode(new FromFile(filePath), preset);
  }

  toBuffer(preset: EncoderPreset, key?: string): this {
    const { FromBuffer } = require('../io/buffer.js') as typeof import('../io/buffer.js');
    return this.encode(new FromBuffer(null, key), preset);
  }

  toStream(preset: EncoderPreset, stream: NodeJS.WritableStream): this {
    const { FromStream } = require('../io/stream.js') as typeof import('../io/stream.js');
    return this.encode(new FromStream(stream), preset);
  }

  // ── Transforms ──────────────────────────────────────────────

  constrainWithin(w: number, h: number): this {
    return this.constrain({ mode: 'within', w, h });
  }

  constrain(c: Constraint): this {
    return this.addStep({ constrain: c });
  }

  distort(w: number, h: number, hints?: ResampleHints): this {
    return this.addStep({ resample_2d: { w, h, hints } });
  }

  rotate90(): this {
    return this.addStep('rotate_90');
  }

  rotate180(): this {
    return this.addStep('rotate_180');
  }

  rotate270(): this {
    return this.addStep('rotate_270');
  }

  flipVertical(): this {
    return this.addStep('flip_v');
  }

  flipHorizontal(): this {
    return this.addStep('flip_h');
  }

  transpose(): this {
    return this.addStep('transpose');
  }

  applyOrientation(flag: number): this {
    return this.addStep({ apply_orientation: { flag } });
  }

  // ── Crop / Region ───────────────────────────────────────────

  crop(x1: number, y1: number, x2: number, y2: number): this {
    return this.addStep({ crop: { x1, y1, x2, y2 } });
  }

  region(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    backgroundColor: Color,
  ): this {
    return this.addStep({ region: { x1, y1, x2, y2, background_color: backgroundColor } });
  }

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

  cropWhitespace(threshold: number, percentPadding: number): this {
    return this.addStep({
      crop_whitespace: { threshold, percent_padding: percentPadding },
    });
  }

  // ── Canvas / Drawing ────────────────────────────────────────

  fillRect(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    color: Color,
  ): this {
    return this.addStep({ fill_rect: { x1, y1, x2, y2, color } });
  }

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

  createCanvas(
    w: number,
    h: number,
    format: PixelFormat,
    color: Color,
  ): this {
    return this.addStep({ create_canvas: { w, h, format, color } });
  }

  roundImageCorners(radius: number, backgroundColor?: Color): this {
    return this.addStep({
      round_image_corners: { radius, background_color: backgroundColor },
    });
  }

  // ── Watermark ───────────────────────────────────────────────

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

  watermarkRedDot(): this {
    return this.addStep('watermark_red_dot');
  }

  // ── Color Filters ───────────────────────────────────────────

  colorFilterInvert(): this {
    return this.addStep({ color_filter_srgb: 'invert' });
  }

  colorFilterGrayscaleNtsc(): this {
    return this.addStep({ color_filter_srgb: 'grayscale_ntsc' });
  }

  colorFilterGrayscaleFlat(): this {
    return this.addStep({ color_filter_srgb: 'grayscale_flat' });
  }

  colorFilterGrayscaleBt709(): this {
    return this.addStep({ color_filter_srgb: 'grayscale_bt709' });
  }

  colorFilterGrayscaleRY(): this {
    return this.addStep({ color_filter_srgb: 'grayscale_ry' });
  }

  colorFilterSepia(): this {
    return this.addStep({ color_filter_srgb: 'sepia' });
  }

  colorFilterAlpha(value: number): this {
    return this.addStep({ color_filter_srgb: { alpha: value } });
  }

  colorFilterBrightness(value: number): this {
    return this.addStep({ color_filter_srgb: { brightness: value } });
  }

  colorFilterContrast(value: number): this {
    return this.addStep({ color_filter_srgb: { contrast: value } });
  }

  colorFilterSaturation(value: number): this {
    return this.addStep({ color_filter_srgb: { saturation: value } });
  }

  colorMatrixSrgb(matrix: number[][]): this {
    return this.addStep({ color_matrix_srgb: { matrix } });
  }

  // ── Misc ────────────────────────────────────────────────────

  whiteBalance(threshold: number): this {
    return this.addStep({
      white_balance_histogram_area_threshold_srgb: { threshold },
    });
  }

  command(value: string): this {
    return this.addStep({
      command_string: { kind: 'ir4', value },
    });
  }

  // ── Branching ───────────────────────────────────────────────

  branch(fn: (steps: Steps) => void): this {
    const saved = this.last;
    fn(this);
    this.last = saved;
    return this;
  }

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
