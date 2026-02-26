import * as fs from 'node:fs';
import { Steps, FromBuffer, FromFile, FromStream, DecodeOptions, presets } from '../lib/index.js';
import type { ExecuteResult } from '../lib/index.js';

const testJpg = fs.readFileSync('./test/test.jpg');

describe('Steps builder', () => {
  it('should create a Steps instance', () => {
    const steps = new Steps(new FromBuffer(testJpg));
    expect(typeof steps).toBe('object');
  });

  it('should flip vertical and encode', async () => {
    const result = await new Steps(new FromBuffer(testJpg))
      .flipVertical()
      .encode(new FromBuffer(null, 'key'), presets.mozjpeg(90))
      .execute();
    expect(result.buffers.key).toBeInstanceOf(Buffer);
    expect(result.buffers.key.length).toBeGreaterThan(0);
  });

  it('should constrain within dimensions', async () => {
    const result = await new Steps(new FromBuffer(testJpg))
      .constrainWithin(5, 5)
      .encode(new FromBuffer(null, 'key'), presets.mozjpeg(90))
      .execute();
    expect(result.buffers.key).toBeInstanceOf(Buffer);
  });

  it('should branch the pipeline', async () => {
    const result = await new Steps(new FromBuffer(testJpg))
      .branch((step) =>
        step
          .colorFilterGrayscaleNtsc()
          .encode(new FromBuffer(null, 'gray'), presets.mozjpeg(90)),
      )
      .encode(new FromBuffer(null, 'color'), presets.mozjpeg(90))
      .execute();
    expect(result.buffers.gray).toBeInstanceOf(Buffer);
    expect(result.buffers.color).toBeInstanceOf(Buffer);
    // Grayscale should typically be smaller
    expect(result.buffers.gray.length).toBeGreaterThan(0);
    expect(result.buffers.color.length).toBeGreaterThan(0);
  });

  it('should draw image exact with branching', async () => {
    const result = await new Steps(new FromBuffer(testJpg))
      .constrainWithin(5, 5)
      .branch((step) =>
        step
          .drawImageExactTo(
            (s) => s.decode(new FromBuffer(testJpg), new DecodeOptions().discardColorProfile()),
            { w: 10, h: 10, x: 0, y: 0 },
          )
          .encode(new FromBuffer(null, 'drawn'), presets.mozjpeg(90)),
      )
      .encode(new FromBuffer(null, 'original'), presets.mozjpeg(90))
      .execute();
    expect(result.buffers.drawn).toBeInstanceOf(Buffer);
    expect(result.buffers.original).toBeInstanceOf(Buffer);
  });

  it('should chain many operations', async () => {
    const result = await new Steps(
      new FromBuffer(testJpg),
      new DecodeOptions().discardColorProfile(),
    )
      .constrainWithin(100, 100)
      .distort(10, 10)
      .fillRect(0, 0, 8, 8, 'black')
      .flipVertical()
      .flipHorizontal()
      .rotate90()
      .rotate180()
      .rotate270()
      .region(0, 0, 8, 8, 'black')
      .watermark(new FromBuffer(testJpg))
      .command('width=100&height=100&mode=max')
      .cropWhitespace(80, 10)
      .colorFilterAlpha(0.9)
      .colorFilterBrightness(0.8)
      .colorFilterInvert()
      .colorFilterGrayscaleBt709()
      .colorFilterGrayscaleFlat()
      .colorFilterGrayscaleRY()
      .toJpeg(new FromBuffer(null, 'key'))
      .execute();
    expect(result.buffers.key).toBeInstanceOf(Buffer);
  });

  it('should execute command string shortcut', async () => {
    const result = await new Steps().executeCommand(
      'width=100&height=100&mode=max',
      new FromBuffer(testJpg),
      new FromBuffer(null, 'key'),
    );
    expect(result.buffers.key).toBeInstanceOf(Buffer);
  });

  it('should save to file with branching', async () => {
    const path = `${process.cwd()}/test/test_output.jpg`;
    const result = await new Steps(new FromBuffer(testJpg))
      .colorFilterInvert()
      .branch((step) => step.encode(new FromFile(path), presets.mozjpeg(90)))
      .encode(new FromBuffer(null, 'key'), presets.mozjpeg(90))
      .execute();
    expect(result.buffers.key).toBeInstanceOf(Buffer);
    // Clean up test output
    fs.unlinkSync(path);
  });

  it('should read and write from streams', async () => {
    const path = `${process.cwd()}/test/test_stream_output.jpg`;
    const result = await new Steps(
      new FromStream(fs.createReadStream('./test/test.jpg')),
    )
      .colorFilterInvert()
      .encode(new FromStream(fs.createWriteStream(path)), presets.mozjpeg(90))
      .execute();
    expect(fs.readFileSync(path)).toBeInstanceOf(Buffer);
    fs.unlinkSync(path);
  });

  it('should throw if decode is missing', () => {
    const steps = new Steps();
    expect(() => steps.flipVertical()).toThrow('decode must be the first node');
  });

  describe('convenience output methods', () => {
    it('toJpeg produces JPEG', async () => {
      const result = await new Steps(new FromBuffer(testJpg))
        .constrainWithin(10, 10)
        .toJpeg(new FromBuffer(null, 'out'))
        .execute();
      const buf = result.buffers.out;
      expect(buf[0]).toBe(0xff);
      expect(buf[1]).toBe(0xd8);
    });

    it('toPng produces PNG', async () => {
      const result = await new Steps(new FromBuffer(testJpg))
        .constrainWithin(10, 10)
        .toPng(new FromBuffer(null, 'out'))
        .execute();
      const buf = result.buffers.out;
      expect(buf[0]).toBe(0x89);
      expect(buf[1]).toBe(0x50);
      expect(buf[2]).toBe(0x4e);
      expect(buf[3]).toBe(0x47);
    });

    it('toWebP produces WebP', async () => {
      const result = await new Steps(new FromBuffer(testJpg))
        .constrainWithin(10, 10)
        .toWebP(new FromBuffer(null, 'out'))
        .execute();
      const buf = result.buffers.out;
      expect(buf.subarray(0, 4).toString()).toBe('RIFF');
      expect(buf.subarray(8, 12).toString()).toBe('WEBP');
    });
  });

  describe('new operations', () => {
    it('crop should work', async () => {
      const result = await new Steps(new FromBuffer(testJpg))
        .crop(0, 0, 50, 50)
        .encode(new FromBuffer(null, 'out'), presets.mozjpeg(90))
        .execute();
      expect(result.buffers.out).toBeInstanceOf(Buffer);
    });

    it('transpose should work', async () => {
      const result = await new Steps(new FromBuffer(testJpg))
        .transpose()
        .encode(new FromBuffer(null, 'out'), presets.mozjpeg(90))
        .execute();
      expect(result.buffers.out).toBeInstanceOf(Buffer);
    });

    it('colorFilterSepia should work', async () => {
      const result = await new Steps(new FromBuffer(testJpg))
        .colorFilterSepia()
        .encode(new FromBuffer(null, 'out'), presets.mozjpeg(90))
        .execute();
      expect(result.buffers.out).toBeInstanceOf(Buffer);
    });

    it('colorFilterSaturation should work', async () => {
      const result = await new Steps(new FromBuffer(testJpg))
        .colorFilterSaturation(0.5)
        .encode(new FromBuffer(null, 'out'), presets.mozjpeg(90))
        .execute();
      expect(result.buffers.out).toBeInstanceOf(Buffer);
    });

    it('whiteBalance should work', async () => {
      const result = await new Steps(new FromBuffer(testJpg))
        .whiteBalance(80)
        .encode(new FromBuffer(null, 'out'), presets.mozjpeg(90))
        .execute();
      expect(result.buffers.out).toBeInstanceOf(Buffer);
    });
  });
});
