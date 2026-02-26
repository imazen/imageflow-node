// Wire-format node types matching imageflow JSON API
// Each node is a discriminated union variant keyed by the operation name.

import type { DecoderCommand } from './decoders.js';
import type { EncoderPreset } from './encoders.js';
import type { Constraint, ResampleHints } from './constraints.js';
import type { Color } from './colors.js';
import type { ColorFilterSrgb, CommandStringKind, CompositingMode, PixelFormat } from './enums.js';
import type { Watermark } from './watermark.js';

export type Node =
  | { decode: DecodeNode }
  | { encode: EncodeNode }
  | { constrain: Constraint }
  | 'flip_v'
  | 'flip_h'
  | 'rotate_90'
  | 'rotate_180'
  | 'rotate_270'
  | 'transpose'
  | { apply_orientation: ApplyOrientationNode }
  | { crop: CropNode }
  | { region: RegionNode }
  | { region_percent: RegionPercentNode }
  | { crop_whitespace: CropWhitespaceNode }
  | { fill_rect: FillRectNode }
  | { expand_canvas: ExpandCanvasNode }
  | { watermark: Watermark }
  | { color_filter_srgb: ColorFilterSrgb }
  | { draw_image_exact: DrawImageExactNode }
  | { copy_rect_to_canvas: CopyRectToCanvasNode }
  | { command_string: CommandStringNode }
  | { resample_2d: Resample2dNode }
  | { white_balance_histogram_area_threshold_srgb: WhiteBalanceNode }
  | { create_canvas: CreateCanvasNode }
  | { round_image_corners: RoundImageCornersNode }
  | { color_matrix_srgb: ColorMatrixSrgbNode }
  | 'watermark_red_dot';

export interface DecodeNode {
  io_id: number;
  commands?: DecoderCommand[];
}

export interface EncodeNode {
  io_id: number;
  preset?: EncoderPreset;
}

export interface ApplyOrientationNode {
  flag: number;
}

export interface CropNode {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface RegionNode {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  background_color: Color;
}

export interface RegionPercentNode {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  background_color: Color;
}

export interface CropWhitespaceNode {
  threshold: number;
  percent_padding: number;
}

export interface FillRectNode {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: Color;
}

export interface ExpandCanvasNode {
  left: number;
  top: number;
  right: number;
  bottom: number;
  color: Color;
}

export interface DrawImageExactNode {
  x: number;
  y: number;
  w: number;
  h: number;
  blend?: CompositingMode;
  hints?: ResampleHints;
}

export interface CopyRectToCanvasNode {
  from_x: number;
  from_y: number;
  w: number;
  h: number;
  x: number;
  y: number;
}

export interface CommandStringNode {
  kind: CommandStringKind;
  value: string;
  decode?: number;
  encode?: number;
}

export interface Resample2dNode {
  w: number;
  h: number;
  hints?: ResampleHints;
}

export interface WhiteBalanceNode {
  threshold: number;
}

export interface CreateCanvasNode {
  w: number;
  h: number;
  format: PixelFormat;
  color: Color;
}

export interface RoundImageCornersNode {
  radius: number;
  background_color?: Color;
}

export interface ColorMatrixSrgbNode {
  matrix: number[][];
}
