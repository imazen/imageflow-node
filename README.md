# @imazen/imageflow

[![CI](https://github.com/imazen/imageflow-node/actions/workflows/ci.yml/badge.svg)](https://github.com/imazen/imageflow-node/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/@imazen/imageflow)](https://www.npmjs.com/package/@imazen/imageflow)
[![license](https://img.shields.io/npm/l/@imazen/imageflow)](https://github.com/imazen/imageflow-node/blob/main/LICENSE)

Node.js bindings for [Imageflow](https://github.com/imazen/imageflow), a fast image optimization and manipulation library.

Supports Linux (x64, arm64), macOS (x64, Apple Silicon), and Windows (x64, arm64). Prebuilt native binaries are downloaded automatically on install.

[API docs](https://imazen.github.io/imageflow-node/) | [Imageflow](https://github.com/imazen/imageflow)

## Install

```bash
npm install @imazen/imageflow
```

Requires Node.js 18+. ESM only.

## Quick start

```ts
import { Steps, FromFile, FromBuffer, presets } from '@imazen/imageflow';

// Resize an image file
await new Steps(new FromFile('input.jpg'))
  .constrainWithin(800, 600)
  .encode(new FromFile('output.jpg'), presets.mozjpeg(80))
  .execute();
```

## Examples

### Resize and encode to buffer

```ts
import { Steps, FromBuffer, presets } from '@imazen/imageflow';

const result = await new Steps(new FromBuffer(inputBytes))
  .constrainWithin(400, 400)
  .toBuffer(presets.mozjpeg(85), 'result')
  .execute();

const outputBytes = result.buffers.get('result');
```

### Stream processing

```ts
import { Steps, FromStream, presets } from '@imazen/imageflow';
import { createReadStream, createWriteStream } from 'fs';

await new Steps(new FromStream(createReadStream('photo.png')))
  .constrainWithin(1200, 1200)
  .toStream(presets.webpLossy(80), createWriteStream('photo.webp'))
  .execute();
```

### Fetch from URL

```ts
import { Steps, FromURL, FromFile, presets } from '@imazen/imageflow';

await new Steps(new FromURL('https://example.com/photo.jpg'))
  .constrainWithin(500, 500)
  .colorFilterGrayscaleFlat()
  .encode(new FromFile('gray.webp'), presets.webpLossy(75))
  .execute();
```

### Decode options

```ts
import { Steps, FromBuffer, DecodeOptions, presets } from '@imazen/imageflow';

const result = await new Steps(
  new FromBuffer(jpegBytes),
  new DecodeOptions()
    .setJpegDownscaleHint(200, 200)
    .discardColorProfile()
)
  .constrainWithin(200, 200)
  .toBuffer(presets.mozjpeg(80), 'thumb')
  .execute();
```

### Branching (multiple outputs from one decode)

```ts
import { Steps, FromFile, presets } from '@imazen/imageflow';

await new Steps(new FromFile('original.jpg'))
  .constrainWithin(1200, 1200)
  .branch(s => s.encode(new FromFile('large.jpg'), presets.mozjpeg(85)))
  .branch(s => s
    .constrainWithin(400, 400)
    .encode(new FromFile('medium.jpg'), presets.mozjpeg(80))
  )
  .branch(s => s
    .constrainWithin(150, 150)
    .encode(new FromFile('thumb.jpg'), presets.mozjpeg(70))
  )
  .execute();
```

### Query string commands

For simple resize/format operations without the builder API:

```ts
import { Steps, FromBuffer, presets } from '@imazen/imageflow';

await new Steps().executeCommand(
  'width=200&height=200&mode=max&format=webp',
  new FromBuffer(inputBytes),
  new FromBuffer(null, 'out')
);
```

## Encoder presets

```ts
import { presets } from '@imazen/imageflow';

presets.mozjpeg(quality, { progressive?: boolean })
presets.libjpegTurbo(quality, { progressive?: boolean })
presets.webpLossy(quality)
presets.webpLossless()
presets.lodepng({ maxDeflate?: boolean })
presets.pngquant({ quality?: [min, max], speed?: number })
presets.libpng({ maxDeflate?: boolean, matte?: Color })
presets.gif()
```

## Available operations

Fluent methods on `Steps`:

- `constrainWithin(w, h)` — scale down to fit
- `encode(dest, preset)` / `toFile(preset, path)` / `toBuffer(preset, key)` / `toStream(preset, stream)`
- `rotate90()` / `rotate180()` / `rotate270()`
- `flipVertical()` / `flipHorizontal()`
- `crop(x1, y1, x2, y2)` / `cropWhitespace(threshold, padding)`
- `region(...)` / `regionPercent(...)`
- `expandCanvas(...)` / `fillRect(...)`
- `colorFilterGrayscaleFlat()` / `colorFilterSepia()` / `colorFilterInvert()` and others
- `colorFilterBrightness(v)` / `colorFilterContrast(v)` / `colorFilterSaturation(v)` / `colorFilterAlpha(v)`
- `whiteBalance(threshold)`
- `watermark(source, gravity, fitPercent, opacity, fitBox?)`
- `branch(fn)` — fork the pipeline for multiple outputs
- `copyRectToCanvas(...)` / `drawImageExactTo(...)`

See the [API docs](https://imazen.github.io/imageflow-node/) for full details.

## License

[AGPLv3](https://github.com/imazen/imageflow-node/blob/main/LICENSE). Commercial licenses available at [imageresizing.net/pricing](https://imageresizing.net/pricing).

## Development

```bash
git clone https://github.com/imazen/imageflow-node
cd imageflow-node
npm install
npm test          # vitest — 110 tests including doctest examples
npm run docs      # typedoc — generates API reference in docs/
```

Native module build (requires Rust toolchain):

```bash
cd native
cargo build
cp target/debug/libimageflow_node.so index.node  # .dylib on macOS, .dll on Windows
```
