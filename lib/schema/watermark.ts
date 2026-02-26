// Wire-format watermark types matching imageflow JSON API

import type { FitMode } from './enums.js';
import type { ConstraintGravity, ResampleHints } from './constraints.js';

export type WatermarkConstraintBox =
  | { image_percentage: { x1: number; y1: number; x2: number; y2: number } }
  | { image_margins: { left: number; top: number; right: number; bottom: number } };

export interface Watermark {
  io_id: number;
  gravity?: ConstraintGravity;
  fit_mode?: FitMode;
  fit_box?: WatermarkConstraintBox;
  opacity?: number;
  hints?: ResampleHints;
}
