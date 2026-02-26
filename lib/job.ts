import { NativeJobConstructor, getLongVersionString } from './native.js';
import type { NativeJobType } from './native.js';

export { getLongVersionString };

export class NativeJob {
  private inUse = false;
  private job: NativeJobType;

  constructor() {
    this.job = new NativeJobConstructor();
  }

  addInputBytes(ioId: number, bytes: Buffer): void {
    if (this.inUse) throw new Error('Already running a Job');
    this.job.addInputBytesCopied(ioId, bytes);
  }

  getOutputBufferBytes(ioId: number): Buffer {
    if (this.inUse) throw new Error('Already running a Job');
    return this.job.getOutputBufferBytes(ioId);
  }

  addOutputBuffer(ioId: number): void {
    if (this.inUse) throw new Error('Already running a Job');
    this.job.addOutputBuffer(ioId);
  }

  async message(endpoint: string, json: string): Promise<string> {
    if (this.inUse) throw new Error('Already running a Job');
    this.inUse = true;
    try {
      return await this.job.message(endpoint, json);
    } finally {
      this.inUse = false;
    }
  }

  messageSync(endpoint: string, json: string): string {
    if (this.inUse) throw new Error('Already running a Job');
    this.inUse = true;
    try {
      return this.job.messageSync(endpoint, json);
    } finally {
      this.inUse = false;
    }
  }

  clean(): void {
    this.job.clean();
  }
}
