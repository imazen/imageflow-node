// Post-install script: builds native binary from source if not present.
// Prebuilt binaries are downloaded via GitHub release artifacts.

import { existsSync, copyFileSync } from 'node:fs';
import { execSync, spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const indexNode = join(__dirname, '..', 'native', 'index.node');

if (existsSync(indexNode)) {
  process.exit(0);
}

const PREFIX = { darwin: 'lib', freebsd: 'lib', linux: 'lib', sunos: 'lib', win32: '' };
const SUFFIX = { darwin: '.dylib', freebsd: '.so', linux: '.so', sunos: '.so', win32: '.dll' };

// Build from source
const rustcResult = spawnSync('rustc', ['--version']);
if (rustcResult.error) {
  console.error('Error: native binary not found and Rust is not installed.');
  console.error('Please install Rust (https://rustup.rs/) and try again.');
  process.exit(1);
}

console.log('Building native module from source...');
execSync('cargo build --release', {
  cwd: join(__dirname, '..', 'native'),
  stdio: 'inherit',
});

const prefix = PREFIX[process.platform] ?? 'lib';
const suffix = SUFFIX[process.platform] ?? '.so';
const builtLib = join(
  __dirname, '..', 'native', 'target', 'release',
  `${prefix}imageflow_node${suffix}`,
);

copyFileSync(builtLib, indexNode);
console.log('Native module built successfully.');
