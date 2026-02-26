import type { IoDirection } from '../schema/enums.js';
import type { IOSource, IODestination } from './types.js';

export class FromURL implements IOSource, IODestination {
  private id = -1;
  private direction: IoDirection = 'in';

  constructor(private readonly url: string) {}

  setIOID(id: number, direction: IoDirection): void {
    this.id = id;
    this.direction = direction;
  }

  get ioID(): number {
    return this.id;
  }

  async toBuffer(): Promise<Buffer> {
    const response = await fetch(this.url);
    if (!response.ok) {
      throw new Error(`Failed to fetch ${this.url}: ${response.status} ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  async toOutput(buffer: Buffer): Promise<void> {
    const response = await fetch(this.url, {
      method: 'POST',
      body: buffer as unknown as BodyInit,
    });
    if (!response.ok) {
      throw new Error(`Failed to POST to ${this.url}: ${response.status} ${response.statusText}`);
    }
  }
}
