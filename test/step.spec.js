const {
    Steps,
    FromBuffer,
    MozJPEG,
    FromURL,
    FillRect,
    BlackColor,
    Rotate90,
    Region,
    CropWhitespace,
} = require('..')

const fs = require('fs')

let str = fs.readFileSync('./test/test.jpg')

describe('basic', () => {
    it('should create a steps', async () => {
        let job = new Steps(new FromBuffer(Buffer.from('')))

        expect(typeof job).toEqual('object')
    })

    it('should be able to flip the image', async () => {
        let job = await new Steps(new FromBuffer(str))
            .flipVertical()
            .encode(new FromBuffer(null, 'key'), new MozJPEG())
            .execute()
        expect(job.key).toBeInstanceOf(Buffer)
    })

    it('should be able to constrain', async () => {
        let job = await new Steps(new FromBuffer(str))
            .constrainWithin(5, 5)
            .encode(new FromBuffer(null, 'key'), new MozJPEG())
            .execute()
        expect(job.key).toBeInstanceOf(Buffer)
    })

    it('should be able to  branch the image', async () => {
        let job = await new Steps(new FromBuffer(str))
            .branch((step) =>
                step
                    .colorFilterGrayscaleNtsc()
                    .encode(new FromBuffer(null, 'key_2'), new MozJPEG())
            )
            .encode(new FromBuffer(null, 'key'), new MozJPEG())
            .execute()
        expect(job.key).toBeInstanceOf(Buffer)
        expect(job.key_2).toBeInstanceOf(Buffer)
    })

    it('should be able to create a canvas', async () => {
        let job = await new Steps(new FromBuffer(str))
            .constrainWithin(5, 5)
            .branch((step) =>
                step
                    .drawImageExacTo(
                        (step) => step.decode(new FromBuffer(str)),
                        {
                            w: 10,
                            h: 10,
                            x: 0,
                            y: 0,
                        }
                    )
                    .encode(new FromBuffer(null, 'key_2'), new MozJPEG())
            )
            .encode(new FromBuffer(null, 'key'), new MozJPEG())
            .execute()
        expect(job.key).toBeInstanceOf(Buffer)
        expect(job.key_2).toBeInstanceOf(Buffer)
    })
})

it('should be able perform all operations', async () => {
    let job = await new Steps(new FromBuffer(str))
        .constrainWithin(100, 100)
        .distort(10, 10)
        .fillRect(new FillRect(0, 0, 8, 8, new BlackColor()))
        .flipVertical()
        .flipHorizontal()
        .rotate(new Rotate90())
        .rotate180()
        .rotate270()
        .rotate90()
        .region(new Region({ x1: 0, y1: 0, x2: 8, y2: 8 }, new BlackColor()))
        .watermark(new FromBuffer(str), {})
        .command('width=100&height=100&mode=max')
        .cropWhiteSpcae(new CropWhitespace(80, 10))
        .colorFilterAlpha(0.9)
        .colorFilterBrightness(0.8)
        .colorFilterIvert()
        .colorFilterGraycaleBt709()
        .colorFilterGrayscaleFlat()
        .colorFilterGrayscaleRY()
        .encode(new FromBuffer(null, 'key'), new MozJPEG())
        .execute()
    expect(job.key).toBeInstanceOf(Buffer)
})
