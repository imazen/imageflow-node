// Post-install script: downloads prebuilt native binary or builds from source.
//
// 1. If native/index.node already exists, skip.
// 2. Try downloading a prebuilt binary from GitHub releases for this platform/arch.
// 3. If download fails, fall back to building from source (requires Rust).

import { existsSync, copyFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { execSync, spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __dirname = dirname(fileURLToPath(import.meta.url));
const nativeDir = join(__dirname, '..', 'native');
const indexNode = join(nativeDir, 'index.node');

if (existsSync(indexNode)) {
  process.exit(0);
}

// Map platform + arch to release artifact name
const ARTIFACT_MAP = {
  'linux-x64': 'libimageflow-linux-x64.node',
  'linux-arm64': 'libimageflow-linux-arm64.node',
  'darwin-arm64': 'libimageflow-macos-arm64.node',
  'darwin-x64': 'libimageflow-macos-x64.node',
  'win32-x64': 'libimageflow-win-x64.node',
  'win32-arm64': 'libimageflow-win-arm64.node',
};

const platformKey = `${process.platform}-${process.arch}`;
const artifactName = ARTIFACT_MAP[platformKey];

// Read package version to find matching GitHub release
const require = createRequire(import.meta.url);
const pkg = require('../package.json');
const version = pkg.version;
const repo = 'imazen/imageflow-node';

async function tryDownloadPrebuilt() {
  if (!artifactName) {
    console.log(`No prebuilt binary available for ${platformKey}, will build from source.`);
    return false;
  }

  const tag = `v${version}`;
  const url = `https://github.com/${repo}/releases/download/${tag}/${artifactName}`;

  console.log(`Downloading prebuilt binary for ${platformKey} from ${url}...`);

  try {
    const response = await fetch(url, { redirect: 'follow' });
    if (!response.ok) {
      console.log(`Download failed (HTTP ${response.status}), will build from source.`);
      return false;
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    mkdirSync(nativeDir, { recursive: true });
    writeFileSync(indexNode, buffer);
    console.log(`Prebuilt binary downloaded successfully (${buffer.length} bytes).`);
    return true;
  } catch (err) {
    console.log(`Download failed: ${err.message}, will build from source.`);
    return false;
  }
}

function buildFromSource() {
  const PREFIX = { darwin: 'lib', freebsd: 'lib', linux: 'lib', sunos: 'lib', win32: '' };
  const SUFFIX = { darwin: '.dylib', freebsd: '.so', linux: '.so', sunos: '.so', win32: '.dll' };

  const rustcResult = spawnSync('rustc', ['--version']);
  if (rustcResult.error) {
    console.error('Error: native binary not found and Rust is not installed.');
    console.error('Please install Rust (https://rustup.rs/) and try again.');
    process.exit(1);
  }

  console.log('Building native module from source...');
  execSync('cargo build --release', {
    cwd: nativeDir,
    stdio: 'inherit',
  });

  const prefix = PREFIX[process.platform] ?? 'lib';
  const suffix = SUFFIX[process.platform] ?? '.so';
  const builtLib = join(nativeDir, 'target', 'release', `${prefix}imageflow_node${suffix}`);

  copyFileSync(builtLib, indexNode);
  console.log('Native module built successfully.');
}

const downloaded = await tryDownloadPrebuilt();
if (!downloaded) {
  buildFromSource();
}
