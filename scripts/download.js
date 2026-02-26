// Post-install script: copies native binary if it doesn't exist yet.
// When using napi-rs with prebuilt binaries, this downloads from GitHub releases.
// For local development, `cargo build` + copy is the workflow.

import { existsSync } from 'node:fs';
import { execSync, spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const indexNode = join(__dirname, '..', 'native', 'index.node');

if (existsSync(indexNode)) {
  process.exit(0);
}

// Platform mapping for prebuilt binary filenames
const PLATFORM_MAP = {
  darwin: 'macos-latest',
  linux: 'ubuntu-latest',
  win32: 'windows-latest',
};

const PREFIX = {
  darwin: 'lib',
  freebsd: 'lib',
  linux: 'lib',
  sunos: 'lib',
  win32: '',
};

const SUFFIX = {
  darwin: '.dylib',
  freebsd: '.so',
  linux: '.so',
  sunos: '.so',
  win32: '.dll',
};

const platform = PLATFORM_MAP[process.platform];

if (platform) {
  // Try to fetch prebuilt binary from GitHub releases
  const pkg = JSON.parse(
    (await import('node:fs/promises')).then(fs => fs.readFile(join(__dirname, '..', 'package.json'), 'utf8')).catch(() => '{}')
  );

  // Fall through to cargo build if download isn't available
  console.log('Prebuilt binary not found, building from source...');
}

// Build from source
const rustcResult = spawnSync('rustc', ['--version']);
if (rustcResult.error) {
  console.error('Error: prebuilt binary not available for this platform.');
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

import { copyFileSync } from 'node:fs';
copyFileSync(builtLib, indexNode);
console.log('Native module built successfully.');
