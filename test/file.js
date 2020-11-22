const {
    MozJPEG,
    Steps,
    FromFile,
    FromURL,
    Constrain,
    ConstrainMode,
    ReSample,
    ConstrainHints,
    TransparentColor,
    BlackColor,
    SRGBColor,
    ColorType,
} = require('..')
class Resize extends Steps {
    resize(source, output, sizes) {
        const [width, height] = sizes[0].split('x')
        const out = output.replace('{w}', width).replace('{h}', height)
        const nextSizes = sizes.slice(1)

        this.branch((step) => {
            step.constrain(
                new Constrain(ConstrainMode.Within, width * 1, height * 1)
            )
            if (nextSizes.length) {
                step.resize(source, output, nextSizes)
            }
            step.encode(
                new FromFile(out),
                new MozJPEG(90, {
                    isProgressive: true,
                    matte: new SRGBColor(ColorType.Hex, '00ffff'),
                })
            )
        })

        return this
    }
}

const start = async function () {
    const [src, out, min, max] = process.argv.slice(2)
    const sizes = [
        '1920x1920',
        '1080x1080',
        '720x720',
        '480x480',
        '360x360',
        '120x120',
        '60x60',
    ]

    const input = src.indexOf('://') > -1 ? new FromURL(src) : new FromFile(src)
    for await (const size of sizes) {
        if (min || max) {
            const [width, height] = size.split('x')
            if ((min && width * 1 < min * 1) || (max && width * 1 > max * 1)) {
                continue
            }
        }
        console.log('size ' + size)
        await new Resize(input).resize(src, out, [size]).execute()
    }
}

start()
