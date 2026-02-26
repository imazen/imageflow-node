// Wire-format build/execute types matching imageflow JSON API

import type { Framewise } from './graph.js';
import type { IoObject } from './io.js';

export interface FrameSizeLimit {
  w: number;
  h: number;
}

export interface ExecutionSecurity {
  max_decode_size?: FrameSizeLimit;
  max_frame_size?: FrameSizeLimit;
  max_encode_size?: FrameSizeLimit;
}

export interface Build001 {
  builder_config?: Record<string, unknown>;
  io: IoObject[];
  framewise: Framewise;
  security?: ExecutionSecurity;
}

export interface Execute001 {
  framewise: Framewise;
  security?: ExecutionSecurity;
}
