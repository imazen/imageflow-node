const fs = require('fs')
const { Stream } = require('stream')
const {
    Steps,
    FromBuffer,
    MozJPEG,
    FromFile,
    FillRect,
    BlackColor,
    Rotate90,
    Region,
    CropWhitespace,
    FromStream,
    DecodeOptions,
} = require('..')

const str = fs.readFileSync('./test/test.jpg')

describe('basic', () => {
    it('should create a steps', async () => {
        const job = new Steps(new FromBuffer(Buffer.from('')))

        expect(typeof job).toEqual('object')
    })

    it('should be able to flip the image', async () => {
        const job = await new Steps(new FromBuffer(str))
            .flipVertical()
            .encode(new FromBuffer(null, 'key'), new MozJPEG())
            .execute()
        expect(job.key).toBeInstanceOf(Buffer)
    })

    it('should be able to constrain', async () => {
        const job = await new Steps(new FromBuffer(str))
            .constrainWithin(5, 5)
            .encode(new FromBuffer(null, 'key'), new MozJPEG())
            .execute()
        expect(job.key).toBeInstanceOf(Buffer)
    })

    it('should be able to  branch the image', async () => {
        const job = await new Steps(new FromBuffer(str))
            .branch((step) =>
                step
                    .colorFilterGrayscaleNtsc()
                    .toBuffer(new MozJPEG(),"key_2")
            )
            .encode(new FromBuffer(null, 'key'), new MozJPEG())
            .execute()
        expect(job.key).toBeInstanceOf(Buffer)
        expect(job.key_2).toBeInstanceOf(Buffer)
    })

    it('should be able to create a canvas', async () => {
        const job = await new Steps(new FromBuffer(str))
            .constrainWithin(5, 5)
            .branch((step) =>
                step
                    .drawImageExactTo(
                        (steps) =>
                            steps.decode(
                                new FromBuffer(str),
                                new DecodeOptions().discardColorProfile()
                            ),
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
    const job = await new Steps(
        new FromBuffer(str),
        new DecodeOptions().discardColorProfile()
    )
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
        .cropWhiteSpace(new CropWhitespace(80, 10))
        .colorFilterAlpha(0.9)
        .colorFilterBrightness(0.8)
        .colorFilterInvert()
        .colorFilterGrayscaleBt709()
        .colorFilterGrayscaleFlat()
        .colorFilterGrayscaleRY()
        .toJpeg(new FromBuffer(null, 'key'))
        .execute()
    expect(job.key).toBeInstanceOf(Buffer)
})

it('should be able execute command string', async () => {
    const job = await new Steps().executeCommand(
        'width=100&height=100&mode=max',
        new FromBuffer(str),
        new FromBuffer(null, 'key')
    )
    expect(job.key).toBeInstanceOf(Buffer)
})

it('should be able perform file save', async () => {
    const path = `${__dirname}/test_@.jpg`
    const job = await new Steps(new FromBuffer(str))
        .colorFilterInvert()
        .branch((step) => step.encode(new FromFile(path), new MozJPEG()))
        .encode(new FromBuffer(null, 'key'), new MozJPEG())
        .execute()
    expect(job.key).toBeInstanceOf(Buffer)
})

it('should be able to read and write from stream', async () => {
    const path = `${__dirname}/test_@_test.jpg`
    await new Steps(new FromStream(fs.createReadStream('./test/test.jpg')))
        .colorFilterInvert()
        .encode(new FromStream(fs.createWriteStream(path)), new MozJPEG())
        .execute()
    expect(fs.readFileSync(path)).toBeInstanceOf(Buffer)
})

it('should be throw error if Decode options are called multiple times', () => {
    expect(() => {
        new Steps(
            new FromBuffer(str),
            new DecodeOptions()
                .ignoreColorProfileError()
                .ignoreColorProfileError()
        )
    }).toThrowErrorMatchingSnapshot()
})

it('should create an array for commands', () => {
    expect(
        new DecodeOptions()
            .ignoreColorProfileError()
            .setJPEGDownscaleHint(100, 100)
            .setWebpDecoderHints(100, 100)
            .discardColorProfile()
            .toDecodeOptions()
    ).toMatchSnapshot()
})

describe("Encode operations",()=>{
    it('should create right json for toBuffer',()=>{
        expect(new Steps(new FromFile("test_file.jpg")).constrainWithin(100,100).toBuffer(new MozJPEG())).toMatchSnapshot()
    })
    
    it('should create right json for toFile',()=>{
        expect(new Steps(new FromFile("test_file.jpg")).constrainWithin(100,100).toFile(new MozJPEG(),"test_output.jpg")).toMatchSnapshot()
    })
    
    it('should create right json for toStream',()=>{
        expect(new Steps(new FromFile("test_file.jpg")).constrainWithin(100,100).toStream(new MozJPEG(),null)).toMatchSnapshot()
    })
    
    it('should create right json for toJpeg',()=>{
        expect(new Steps(new FromFile("test_file.jpg")).constrainWithin(100,100).toJpeg(new FromFile("test.jpeg"))).toMatchSnapshot()
    })
    
    it('should create right json for toPng',()=>{
        expect(new Steps(new FromFile("test_file.jpg")).constrainWithin(100,100).toPng(new FromFile("test.png"))).toMatchSnapshot()
    })
    
    it('should create right josn for toWebp',()=>{
        expect(new Steps(new FromFile("test_file.jpg")).constrainWithin(100,100).toWebP(new FromFile("test.png"))).toMatchSnapshot()
    })
})


