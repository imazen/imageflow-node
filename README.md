# Node bindings for [Imageflow](https://github.com/imazen/imageflow)

![Macos](https://github.com/imazen/imageflow-node/workflows/Test%20Macos/badge.svg) ![Linux](https://github.com/imazen/imageflow-node/workflows/Test%20Linux/badge.svg) ![Windows](https://github.com/imazen/imageflow-node/workflows/Test%20Windows/badge.svg)

Quickly scale or modify images and optimize them for the web.

If the AGPLv3 does not work for you, get a [commercial license](https://imageresizing.net/pricing).
Your bandwidth and electricity savings should cover it.

## Features

-   Does not depend on system dependencies
-   Cross-platform (linux, mac, and windows)

## Installation

```bash
npm install imageflow
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
} = require('..')
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

## Local Setup

```bash
git clone https://github.com/imazen/imageflow-node
cd imageflow-node
yarn
yarn test
```
