import type { IoDirection } from '../schema/enums.js';
import type { IOSource, IODestination } from './types.js';

export class FromBuffer implements IOSource, IODestination {
  private id = -1;
  private direction: IoDirection = 'in';

  constructor(
    private readonly buffer: Buffer | null,
    private readonly key?: string,
  ) {}

  setIOID(id: number, direction: IoDirection): void {
    this.id = id;
    this.direction = direction;
  }

  get ioID(): number {
    return this.id;
  }

  async toBuffer(): Promise<Buffer> {
    if (this.buffer === null) return Buffer.alloc(0);
    return this.buffer;
  }

  async toOutput(buffer: Buffer, collector: Record<string, Buffer>): Promise<void> {
    if (this.key) {
      collector[this.key] = buffer;
    }
  }
}
