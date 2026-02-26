import type { Readable, Writable } from 'node:stream';
import type { IoDirection } from '../schema/enums.js';
import type { IOSource, IODestination } from './types.js';

/** Collects a readable stream into a single Buffer */
async function streamToBuffer(stream: Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

export class FromStream implements IOSource, IODestination {
  private id = -1;
  private direction: IoDirection = 'in';

  constructor(private readonly stream: Readable | Writable | NodeJS.ReadableStream | NodeJS.WritableStream) {}

  setIOID(id: number, direction: IoDirection): void {
    this.id = id;
    this.direction = direction;
  }

  get ioID(): number {
    return this.id;
  }

  async toBuffer(): Promise<Buffer> {
    return streamToBuffer(this.stream as Readable);
  }

  async toOutput(buffer: Buffer): Promise<void> {
    const writable = this.stream as Writable;
    if (typeof writable.end === 'function') {
      return new Promise<void>((resolve, reject) => {
        writable.on('finish', resolve);
        writable.on('error', reject);
        writable.end(buffer);
      });
    }
  }
}
