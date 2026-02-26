import type { Node } from '../lib/schema/nodes.js';
import type { EncoderPreset } from '../lib/schema/encoders.js';
import type { DecoderCommand } from '../lib/schema/decoders.js';

describe('schema types — serialization', () => {
  describe('Node variants', () => {
    it('should serialize decode node', () => {
      const node: Node = { decode: { io_id: 0, commands: ['discard_color_profile'] } };
      expect(JSON.stringify(node)).toBe('{"decode":{"io_id":0,"commands":["discard_color_profile"]}}');
    });

    it('should serialize string nodes', () => {
      const nodes: Node[] = ['flip_v', 'flip_h', 'rotate_90', 'rotate_180', 'rotate_270', 'transpose'];
      for (const node of nodes) {
        expect(JSON.stringify(node)).toBe(`"${node}"`);
      }
    });

    it('should serialize constrain node', () => {
      const node: Node = { constrain: { mode: 'within', w: 100, h: 200 } };
      const parsed = JSON.parse(JSON.stringify(node));
      expect(parsed.constrain.mode).toBe('within');
      expect(parsed.constrain.w).toBe(100);
    });

    it('should serialize crop node', () => {
      const node: Node = { crop: { x1: 10, y1: 20, x2: 100, y2: 200 } };
      const parsed = JSON.parse(JSON.stringify(node));
      expect(parsed.crop.x1).toBe(10);
      expect(parsed.crop.x2).toBe(100);
    });

    it('should serialize fill_rect node', () => {
      const node: Node = { fill_rect: { x1: 0, y1: 0, x2: 50, y2: 50, color: 'black' } };
      const parsed = JSON.parse(JSON.stringify(node));
      expect(parsed.fill_rect.color).toBe('black');
    });

    it('should serialize command_string node', () => {
      const node: Node = { command_string: { kind: 'ir4', value: 'w=100', decode: 0, encode: 1 } };
      const parsed = JSON.parse(JSON.stringify(node));
      expect(parsed.command_string.kind).toBe('ir4');
      expect(parsed.command_string.value).toBe('w=100');
    });

    it('should serialize watermark node', () => {
      const node: Node = {
        watermark: {
          io_id: 1,
          gravity: { percentage: { x: 50, y: 50 } },
          fit_mode: 'within',
          opacity: 0.5,
        },
      };
      const parsed = JSON.parse(JSON.stringify(node));
      expect(parsed.watermark.io_id).toBe(1);
      expect(parsed.watermark.opacity).toBe(0.5);
    });

    it('should serialize color_filter_srgb node variants', () => {
      const simple: Node = { color_filter_srgb: 'invert' };
      expect(JSON.parse(JSON.stringify(simple)).color_filter_srgb).toBe('invert');

      const sepia: Node = { color_filter_srgb: 'sepia' };
      expect(JSON.parse(JSON.stringify(sepia)).color_filter_srgb).toBe('sepia');

      const alpha: Node = { color_filter_srgb: { alpha: 0.5 } };
      expect(JSON.parse(JSON.stringify(alpha)).color_filter_srgb.alpha).toBe(0.5);

      const sat: Node = { color_filter_srgb: { saturation: 1.5 } };
      expect(JSON.parse(JSON.stringify(sat)).color_filter_srgb.saturation).toBe(1.5);
    });

    it('should serialize create_canvas node', () => {
      const node: Node = { create_canvas: { w: 200, h: 100, format: 'bgra_32', color: 'transparent' } };
      const parsed = JSON.parse(JSON.stringify(node));
      expect(parsed.create_canvas.w).toBe(200);
      expect(parsed.create_canvas.format).toBe('bgra_32');
    });

    it('should serialize round_image_corners node', () => {
      const node: Node = { round_image_corners: { radius: 20, background_color: 'transparent' } };
      const parsed = JSON.parse(JSON.stringify(node));
      expect(parsed.round_image_corners.radius).toBe(20);
    });
  });

  describe('EncoderPreset variants', () => {
    it('should serialize gif', () => {
      const preset: EncoderPreset = 'gif';
      expect(JSON.stringify(preset)).toBe('"gif"');
    });

    it('should serialize mozjpeg', () => {
      const preset: EncoderPreset = { mozjpeg: { quality: 85, progressive: true } };
      const parsed = JSON.parse(JSON.stringify(preset));
      expect(parsed.mozjpeg.quality).toBe(85);
      expect(parsed.mozjpeg.progressive).toBe(true);
    });

    it('should serialize webplossy', () => {
      const preset: EncoderPreset = { webplossy: { quality: 75 } };
      expect(JSON.parse(JSON.stringify(preset)).webplossy.quality).toBe(75);
    });

    it('should serialize webplossless', () => {
      const preset: EncoderPreset = 'webplossless';
      expect(JSON.stringify(preset)).toBe('"webplossless"');
    });

    it('should serialize lodepng', () => {
      const preset: EncoderPreset = { lodepng: { maximum_deflate: true } };
      expect(JSON.parse(JSON.stringify(preset)).lodepng.maximum_deflate).toBe(true);
    });

    it('should serialize pngquant', () => {
      const preset: EncoderPreset = { pngquant: { quality: 80, minimum_quality: 50, speed: 3 } };
      const parsed = JSON.parse(JSON.stringify(preset));
      expect(parsed.pngquant.quality).toBe(80);
      expect(parsed.pngquant.minimum_quality).toBe(50);
    });

    it('should serialize libjpeg_turbo', () => {
      const preset: EncoderPreset = { libjpeg_turbo: { quality: 90, progressive: false } };
      expect(JSON.parse(JSON.stringify(preset)).libjpeg_turbo.quality).toBe(90);
    });

    it('should serialize libpng', () => {
      const preset: EncoderPreset = { libpng: { depth: 'png_32', zlib_compression: 6 } };
      expect(JSON.parse(JSON.stringify(preset)).libpng.depth).toBe('png_32');
    });

    it('should serialize auto', () => {
      const preset: EncoderPreset = { auto: { quality_profile: 'balanced' } };
      expect(JSON.parse(JSON.stringify(preset)).auto.quality_profile).toBe('balanced');
    });

    it('should serialize format', () => {
      const preset: EncoderPreset = { format: { format: 'webp', quality_profile: 'fast' } };
      expect(JSON.parse(JSON.stringify(preset)).format.format).toBe('webp');
    });
  });

  describe('DecoderCommand variants', () => {
    it('should serialize jpeg_downscale_hints', () => {
      const cmd: DecoderCommand = { jpeg_downscale_hints: { width: 100, height: 100 } };
      const parsed = JSON.parse(JSON.stringify(cmd));
      expect(parsed.jpeg_downscale_hints.width).toBe(100);
    });

    it('should serialize string commands', () => {
      const cmds: DecoderCommand[] = ['discard_color_profile', 'ignore_color_profile_errors'];
      for (const cmd of cmds) {
        expect(JSON.stringify(cmd)).toBe(`"${cmd}"`);
      }
    });

    it('should serialize webp_decoder_hints', () => {
      const cmd: DecoderCommand = { webp_decoder_hints: { width: 200, height: 200 } };
      expect(JSON.parse(JSON.stringify(cmd)).webp_decoder_hints.width).toBe(200);
    });

    it('should serialize select_frame', () => {
      const cmd: DecoderCommand = { select_frame: { index: 3 } };
      expect(JSON.parse(JSON.stringify(cmd)).select_frame.index).toBe(3);
    });
  });
});
