// IO interfaces for source/destination abstraction

import type { IoDirection } from '../schema/enums.js';

/** An image input source that can provide bytes to the pipeline. */
export interface IOSource {
  setIOID(id: number, direction: IoDirection): void;
  readonly ioID: number;
  toBuffer(): Promise<Buffer>;
}

/** An image output destination that receives encoded bytes from the pipeline. */
export interface IODestination {
  setIOID(id: number, direction: IoDirection): void;
  readonly ioID: number;
  /** Write output bytes. `collector` accumulates named buffers. */
  toOutput(buffer: Buffer, collector: Record<string, Buffer>): Promise<void>;
}
