import * as fs from 'node:fs';
import { Steps, Pipeline, FromBuffer, DecodeOptions, presets, getImageInfo } from '../dist/index.js';

const testJpg = fs.readFileSync('./test/test.jpg');

describe('Integration tests', () => {
  it('should resize + encode JPEG end-to-end', async () => {
    const result = await new Steps(new FromBuffer(testJpg))
      .constrainWithin(200, 200)
      .encode(new FromBuffer(null, 'out'), presets.mozjpeg(85))
      .execute();

    const buf = result.buffers.out;
    expect(buf.length).toBeGreaterThan(0);
    // Verify JPEG magic bytes
    expect(buf[0]).toBe(0xff);
    expect(buf[1]).toBe(0xd8);
    expect(buf[2]).toBe(0xff);

    // Check job result metadata
    expect(result.jobResult.encodes.length).toBe(1);
    expect(result.jobResult.encodes[0].w).toBeLessThanOrEqual(200);
    expect(result.jobResult.encodes[0].h).toBeLessThanOrEqual(200);
  });

  it('should produce valid PNG output', async () => {
    const result = await new Steps(new FromBuffer(testJpg))
      .constrainWithin(50, 50)
      .encode(new FromBuffer(null, 'out'), presets.lodepng())
      .execute();

    const buf = result.buffers.out;
    // PNG magic: 89 50 4E 47
    expect(buf[0]).toBe(0x89);
    expect(buf[1]).toBe(0x50);
    expect(buf[2]).toBe(0x4e);
    expect(buf[3]).toBe(0x47);
  });

  it('should produce valid WebP output', async () => {
    const result = await new Steps(new FromBuffer(testJpg))
      .constrainWithin(50, 50)
      .encode(new FromBuffer(null, 'out'), presets.webpLossy(80))
      .execute();

    const buf = result.buffers.out;
    // WebP: starts with RIFF....WEBP
    expect(buf.subarray(0, 4).toString()).toBe('RIFF');
    expect(buf.subarray(8, 12).toString()).toBe('WEBP');
  });

  it('should produce valid GIF output', async () => {
    const result = await new Steps(new FromBuffer(testJpg))
      .constrainWithin(50, 50)
      .encode(new FromBuffer(null, 'out'), presets.gif())
      .execute();

    const buf = result.buffers.out;
    // GIF magic: GIF89a or GIF87a
    expect(buf.subarray(0, 3).toString()).toBe('GIF');
  });

  it('should multi-output branch pipeline', async () => {
    const result = await new Steps(new FromBuffer(testJpg))
      .constrainWithin(100, 100)
      .branch((s) => s.toJpeg(new FromBuffer(null, 'jpeg')))
      .branch((s) => s.toPng(new FromBuffer(null, 'png')))
      .toWebP(new FromBuffer(null, 'webp'))
      .execute();

    expect(result.buffers.jpeg).toBeInstanceOf(Buffer);
    expect(result.buffers.png).toBeInstanceOf(Buffer);
    expect(result.buffers.webp).toBeInstanceOf(Buffer);
    expect(result.jobResult.encodes.length).toBe(3);
  });

  it('should watermark and encode', async () => {
    const result = await new Steps(new FromBuffer(testJpg))
      .constrainWithin(200, 200)
      .watermark(new FromBuffer(testJpg), {
        gravity: { percentage: { x: 100, y: 100 } },
        fitMode: 'within',
        fitBox: { image_percentage: { x1: 70, y1: 70, x2: 100, y2: 100 } },
        opacity: 0.5,
      })
      .encode(new FromBuffer(null, 'out'), presets.mozjpeg(85))
      .execute();

    expect(result.buffers.out).toBeInstanceOf(Buffer);
    expect(result.buffers.out.length).toBeGreaterThan(0);
  });

  it('should round-trip: encode then getImageInfo', async () => {
    const result = await new Pipeline(new FromBuffer(testJpg))
      .constrainWithin(77, 55)
      .execute(presets.lodepng());

    const info = await getImageInfo(new FromBuffer(result.outputBuffer));
    expect(info.preferred_mime_type).toBe('image/png');
    // The constrained image should fit within 77x55
    expect(info.image_width).toBeLessThanOrEqual(77);
    expect(info.image_height).toBeLessThanOrEqual(55);
  });

  it('should process command string with io_ids', async () => {
    const result = await new Steps(new FromBuffer(testJpg))
      .command('width=80&height=60&mode=max&format=png')
      .encode(new FromBuffer(null, 'out'), presets.lodepng())
      .execute();

    expect(result.buffers.out).toBeInstanceOf(Buffer);
  });

  it('should handle sepia + saturation filters', async () => {
    const result = await new Pipeline(new FromBuffer(testJpg))
      .colorFilterSepia()
      .colorFilterSaturation(0.5)
      .constrainWithin(50, 50)
      .execute(presets.mozjpeg(80));

    expect(result.outputBuffer).toBeInstanceOf(Buffer);
    expect(result.outputBuffer.length).toBeGreaterThan(0);
  });
});
