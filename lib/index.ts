// Public API — @imazen/imageflow

// Native layer
export { NativeJob, getLongVersionString } from './job.js';
export { ImageflowError } from './errors.js';

// High-level client
export { getImageInfo, getVersionInfo } from './client.js';

// I/O
export { FromFile } from './io/file.js';
export { FromBuffer } from './io/buffer.js';
export { FromStream } from './io/stream.js';
export { FromURL } from './io/url.js';
export type { IOSource, IODestination } from './io/types.js';

// Builders
export { Steps } from './builders/steps.js';
export type { ExecuteResult } from './builders/steps.js';
export { Pipeline } from './builders/pipeline.js';
export type { PipelineResult } from './builders/pipeline.js';
export { DecodeOptions } from './builders/decode-options.js';
export * as presets from './builders/presets.js';

// Schema types (re-exported for advanced users who build JSON manually)
export type * from './schema/index.js';
