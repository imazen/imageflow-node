// IO interfaces for source/destination abstraction

import type { IoDirection } from '../schema/enums.js';

export interface IOSource {
  setIOID(id: number, direction: IoDirection): void;
  readonly ioID: number;
  toBuffer(): Promise<Buffer>;
}

export interface IODestination {
  setIOID(id: number, direction: IoDirection): void;
  readonly ioID: number;
  /** Write output bytes. `collector` accumulates named buffers. */
  toOutput(buffer: Buffer, collector: Record<string, Buffer>): Promise<void>;
}
