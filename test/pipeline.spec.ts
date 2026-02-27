import * as fs from 'node:fs';
import { Pipeline, FromBuffer, DecodeOptions, presets } from '../lib/index.js';

const testJpg = fs.readFileSync('./test/test.jpg');

describe('Pipeline (linear mode)', () => {
  it('should resize and encode to JPEG', async () => {
    const result = await new Pipeline(new FromBuffer(testJpg))
      .constrainWithin(50, 50)
      .execute(presets.mozjpeg(85));
    expect(result.outputBuffer).toBeInstanceOf(Buffer);
    expect(result.outputBuffer[0]).toBe(0xff);
    expect(result.outputBuffer[1]).toBe(0xd8);
    expect(result.jobResult.encodes.length).toBe(1);
  });

  it('should chain multiple operations', async () => {
    const result = await new Pipeline(new FromBuffer(testJpg))
      .constrainWithin(100, 100)
      .flipVertical()
      .rotate90()
      .colorFilterGrayscaleNtsc()
      .execute(presets.lodepng());
    expect(result.outputBuffer).toBeInstanceOf(Buffer);
    // PNG magic
    expect(result.outputBuffer[0]).toBe(0x89);
    expect(result.outputBuffer[1]).toBe(0x50);
  });

  it('should use encodeTo() preset', async () => {
    const result = await new Pipeline(new FromBuffer(testJpg))
      .constrainWithin(20, 20)
      .encodeTo(presets.webpLossless())
      .execute();
    expect(result.outputBuffer).toBeInstanceOf(Buffer);
    expect(result.outputBuffer.subarray(0, 4).toString()).toBe('RIFF');
  });

  it('should throw without encoder preset', async () => {
    const pipeline = new Pipeline(new FromBuffer(testJpg)).constrainWithin(10, 10);
    await expect(pipeline.execute()).rejects.toThrow('No encoder preset specified');
  });

  it('should accept DecodeOptions', async () => {
    const result = await new Pipeline(
      new FromBuffer(testJpg),
      new DecodeOptions().discardColorProfile(),
    )
      .constrainWithin(10, 10)
      .execute(presets.mozjpeg(80));
    expect(result.outputBuffer).toBeInstanceOf(Buffer);
  });

  it('should use command string', async () => {
    const result = await new Pipeline(new FromBuffer(testJpg))
      .command('width=50&height=50&mode=max')
      .execute(presets.mozjpeg(80));
    expect(result.outputBuffer).toBeInstanceOf(Buffer);
  });

  it('should crop', async () => {
    const result = await new Pipeline(new FromBuffer(testJpg))
      .crop(0, 0, 30, 30)
      .execute(presets.mozjpeg(80));
    expect(result.outputBuffer).toBeInstanceOf(Buffer);
  });

  it('should apply color filters', async () => {
    const result = await new Pipeline(new FromBuffer(testJpg))
      .colorFilterSepia()
      .colorFilterBrightness(1.1)
      .colorFilterContrast(0.9)
      .execute(presets.mozjpeg(80));
    expect(result.outputBuffer).toBeInstanceOf(Buffer);
  });
});
