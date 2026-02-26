import * as fs from 'node:fs/promises';
import type { IoDirection } from '../schema/enums.js';
import type { IOSource, IODestination } from './types.js';

/**
 * File-based IO adapter. Reads from or writes to a file path.
 *
 * When used as a source, reads the entire file into memory.
 * When used as a destination, writes the encoded bytes to disk.
 */
export class FromFile implements IOSource, IODestination {
  private id = -1;
  private direction: IoDirection = 'in';

  constructor(private readonly filePath: string) {}

  setIOID(id: number, direction: IoDirection): void {
    this.id = id;
    this.direction = direction;
  }

  get ioID(): number {
    return this.id;
  }

  async toBuffer(): Promise<Buffer> {
    return fs.readFile(this.filePath);
  }

  async toOutput(buffer: Buffer): Promise<void> {
    await fs.writeFile(this.filePath, buffer);
  }
}
