import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const addon = require('../native/index.node');

export interface NativeJobType {
  addInputBytesCopied(ioId: number, bytes: Buffer): void;
  getOutputBufferBytes(ioId: number): Buffer;
  addOutputBuffer(ioId: number): void;
  message(endpoint: string, json: string): Promise<string>;
  messageSync(endpoint: string, json: string): string;
  clean(): void;
}

export const NativeJobConstructor: { new (): NativeJobType } = addon.Job;
export const getLongVersionString: () => string = addon.getLongVersionString;
