import * as fs from 'node:fs';
import { getImageInfo, getVersionInfo, FromBuffer } from '../dist/index.js';

const testJpg = fs.readFileSync('./test/test.jpg');

// 1x1 PNG
const PNG_1x1 = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
  0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
  0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89, 0x00, 0x00, 0x00,
  0x0a, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
  0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49,
  0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
]);

describe('Client API', () => {
  describe('getImageInfo', () => {
    it('should return correct info for PNG', async () => {
      const info = await getImageInfo(new FromBuffer(PNG_1x1));
      expect(info.image_width).toBe(1);
      expect(info.image_height).toBe(1);
      expect(info.preferred_mime_type).toBe('image/png');
      expect(info.preferred_extension).toBe('png');
    });

    it('should return correct info for JPEG', async () => {
      const info = await getImageInfo(new FromBuffer(testJpg));
      expect(info.image_width).toBeGreaterThan(0);
      expect(info.image_height).toBeGreaterThan(0);
      expect(info.preferred_mime_type).toBe('image/jpeg');
      expect(info.preferred_extension).toBe('jpg');
    });

    it('should throw for invalid input', async () => {
      await expect(
        getImageInfo(new FromBuffer(Buffer.from('not an image'))),
      ).rejects.toThrow();
    });
  });

  describe('getVersionInfo', () => {
    it('should return version string', () => {
      const info = getVersionInfo();
      expect(typeof info.versionString).toBe('string');
      expect(info.versionString.length).toBeGreaterThan(0);
    });
  });
});
