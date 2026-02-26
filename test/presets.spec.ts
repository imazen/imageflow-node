import { presets } from '../lib/index.js';

describe('Encoder presets', () => {
  it('gif() returns string', () => {
    expect(presets.gif()).toBe('gif');
  });

  it('mozjpeg() returns correct structure', () => {
    const p = presets.mozjpeg(85, { progressive: true });
    expect(p).toEqual({ mozjpeg: { quality: 85, progressive: true, matte: undefined } });
  });

  it('mozjpeg() with defaults', () => {
    const p = presets.mozjpeg();
    expect(p).toEqual({ mozjpeg: { quality: undefined, progressive: undefined, matte: undefined } });
  });

  it('webpLossy() returns correct structure', () => {
    expect(presets.webpLossy(75)).toEqual({ webplossy: { quality: 75 } });
  });

  it('webpLossless() returns string', () => {
    expect(presets.webpLossless()).toBe('webplossless');
  });

  it('lodepng() returns correct structure', () => {
    expect(presets.lodepng(true)).toEqual({ lodepng: { maximum_deflate: true } });
  });

  it('pngquant() returns correct structure', () => {
    expect(presets.pngquant(80, 50, { speed: 3 })).toEqual({
      pngquant: { quality: 80, minimum_quality: 50, speed: 3, maximum_deflate: undefined },
    });
  });

  it('libjpegTurbo() returns correct structure', () => {
    expect(presets.libjpegTurbo(90, { progressive: true })).toEqual({
      libjpeg_turbo: {
        quality: 90,
        progressive: true,
        optimize_huffman_coding: undefined,
        matte: undefined,
      },
    });
  });

  it('libpng() returns correct structure', () => {
    expect(presets.libpng({ depth: 'png_32' })).toEqual({
      libpng: { depth: 'png_32', matte: undefined, zlib_compression: undefined },
    });
  });

  it('auto() returns correct structure', () => {
    expect(presets.auto('balanced')).toEqual({ auto: { quality_profile: 'balanced' } });
  });

  it('format() returns correct structure', () => {
    expect(presets.format('webp', { qualityProfile: 'fast' })).toEqual({
      format: { format: 'webp', quality_profile: 'fast', encoder_hints: undefined },
    });
  });
});
