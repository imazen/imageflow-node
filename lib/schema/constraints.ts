// Wire-format constraint types matching imageflow JSON API

import type {
  ConstraintMode,
  Filter,
  ResampleWhen,
  ScalingFloatspace,
  SharpenWhen,
} from './enums.js';
import type { Color } from './colors.js';

export interface ResampleHints {
  sharpen_percent?: number;
  down_filter?: Filter;
  up_filter?: Filter;
  scaling_colorspace?: ScalingFloatspace;
  resample_when?: ResampleWhen;
  sharpen_when?: SharpenWhen;
  background_color?: Color;
}

export interface ConstraintGravity {
  percentage: {
    x: number;
    y: number;
  };
}

export interface Constraint {
  mode: ConstraintMode;
  w?: number;
  h?: number;
  hints?: ResampleHints;
  gravity?: ConstraintGravity;
  canvas_color?: Color;
}
