# Node bindings for [Imageflow](https://github.com/imazen/imageflow)

[![Macos](https://github.com/imazen/imageflow-node/workflows/Test%20Macos/badge.svg)](https://github.com/imazen/imageflow-node/actions?query=workflow%3A%22Test+Macos%22) [![Linux](https://github.com/imazen/imageflow-node/workflows/Test%20Linux/badge.svg)](https://github.com/imazen/imageflow-node/actions?query=workflow%3A%22Test+Linux%22) [![Windows](https://github.com/imazen/imageflow-node/workflows/Test%20Windows/badge.svg)](https://github.com/imazen/imageflow-node/actions?query=workflow%3A%22Test+Windows%22)

Quickly scale or modify images and optimize them for the web.

If the AGPLv3 does not work for you, you can get a [commercial license](https://imageresizing.net/pricing) on a sliding scale. If you have more than 1 server doing image processing your savings should cover the cost.

[API docs are here](https://imazen.github.io/imageflow-node/).

## Installation

```bash
npm install @imazen/imageflow
```

## Usage

```js
const {
    MozJPEG,
    Steps,
    FromURL,
    FromFile,
    FromStream,
    FromBuffer,
} = require('@imazen/imageflow')
const fs = require('fs')

let step = new Steps(new FromURL('https://jpeg.org/images/jpeg2000-home.jpg'))
    .constrainWithin(500, 500)
    .branch((step) =>
        step
            .constrainWithin(400, 400)
            .branch((step) =>
                step
                    .constrainWithin(200, 200)
                    .rotate90()
                    .colorFilterGrayscaleFlat()
                    .encode(new FromFile('./branch_2.jpg'), new MozJPEG(80))
            )
            .copyRectangle(
                (canvas) =>
                    canvas.decode(
                        new FromStream(fs.createReadStream('./test.jpg'))
                    ),
                { x: 0, y: 0, w: 100, h: 100 },
                10,
                10
            )
            .encode(new FromFile('./branch.jpg'), new MozJPEG(80))
    )
    .constrainWithin(100, 100)
    .rotate180()
step.encode(new FromBuffer(null, 'key'), new MozJPEG(80))
    .execute()
    .then(console.log)
    .catch(console.log)
```

### Examples

1. Reading a file from disk. `FromFile` provide an easy method for reading and writing images to disk.

```js
const { MozJPEG, Steps, FromFile } = require('@imazen/imageflow')

const output = await new Step(new FromFile('path/to/file'))
    .rotate180()
    .encode(new FromFile('./path/to/output/file'))
    .execute()
```

2. Reading from a stream. `FromStream` can read and write to a stream.

```js
const { MozJPEG, Steps, FromStream } = require('@imazen/imageflow')

const output = await new Step(new FromStream(req))
    .constrainWithin(400, 400)
    .encode(new FromStream(res))
    .execute()
res.end()
```

3. Reading from a url. `FromURL` can make a GET request to download and POST request to upload the image.

```js
const { MozJPEG, Steps, FromURL } = require('@imazen/imageflow')

const output = await new Step(new FromURL('url to image'))
    .colorFilterGrayscaleFlat()
    .encode(new FromURL('url to image upload'))
    .execute()
```

4. Providing buffer. `FromBuffer` can read and provide the output buffer. To read the output a key should be provided, which used later to access buffer in the output.

```js
const { MozJPEG, Steps, FromBuffer } = require('@imazen/imageflow')

const output = await new Step(new FromBuffer(getSomeBuffer()))
    .colorFilterGrayscaleFlat()
    .encode(new FromBuffer(null, 'key'))
    .execute()
console.log(output.key)
```

5. Performing Batch operations. `branch`, `decode`, and `encode` are used together to perform batch operation. This example shows how to create varying size images from a single image.

```js
const { MozJPEG, Steps, FromStream, FromFile } = require('@imazen/imageflow')

const test = new Steps(new FromStream(req))
    .constrainWithin(800, 800)
    .branch((step) => step.encode(new FromFile('large.jpg'), new MozJPEG()))
    .branch((step) =>
        step
            .constrainWithin(400, 400)
            .branch((step) =>
                step
                    .constrainWithin(200, 200)
                    .branch((step) =>
                        step
                            .constrainWithin(100, 100)
                            .encode(new FromFile('tiny.jpg'), new MozJPEG())
                    )
                    .encode(new FromFile('small.jpg'), new MozJPEG())
            )
            .encode(new FromFile('medium.jpg'), new MozJPEG())
    )
    .execute()
```

6. Example with complex graph of operations

```js
const {
    MozJPEG,
    Steps,
    FromURL,
    FromFile,
    FromStream,
    FromBuffer,
} = require('@imazen/imageflow')
const fs = require('fs')

let step = new Steps(new FromURL('https://jpeg.org/images/jpeg2000-home.jpg'))
    .constraintWithin(500, 500)
    .branch((step) =>
        step
            .constraintWithin(400, 400)
            .branch((step) =>
                step
                    .constraintWithin(200, 200)
                    .rotate90()
                    .colorFilterGrayscaleFlat()
                    .encode(new FromFile('./branch_2.jpg'), new MozJPEG(80))
            )
            .copyRectangle(
                (canvas) =>
                    canvas.decode(
                        new FromStream(fs.createReadStream('./test.jpg'))
                    ),
                { x: 0, y: 0, w: 100, h: 100 },
                10,
                10
            )
            .encode(new FromFile('./branch.jpg'), new MozJPEG(80))
    )
    .constraintWithin(100, 100)
    .rotate180()
step.encode(new FromBuffer(null, 'key'), new MozJPEG(80))
    .execute()
    .then(console.log)
    .catch(console.log)
```

7. Using query style commands

```js
await new Steps().executeCommand(
    'width=100&height=100&mode=max',
    new FromBuffer(str),
    new FromBuffer(null, 'key')
)
```

8. Using Decode Options

```js
const output = await new Step(
    new FromBuffer(getSomeBuffer()),
    new DecodeOptions()
        .ignoreColorProfileError()
        .setJPEGDownscaleHint(100, 100)
        .setWebpDecoderHints(100, 100)
        .discardColorProfile()
)
    .colorFilterGrayscaleFlat()
    .encode(new FromBuffer(null, 'key'))
    .execute()
console.log(output.key)
```

## Local Setup

```bash
git clone https://github.com/imazen/imageflow-node
cd imageflow-node
yarn
yarn test
```
