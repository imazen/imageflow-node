// Wire-format I/O types matching imageflow JSON API

import type { IoDirection } from './enums.js';

export interface IoObject {
  io_id: number;
  direction: IoDirection;
  io: IoEnum;
}

export type IoEnum =
  | 'placeholder'
  | { copy_output_to_buffer: number }
  | { output_buffer: null }
  | { file: string };
