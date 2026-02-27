// High-level convenience functions

import { NativeJob, getLongVersionString } from './job.js';
import { ImageflowError } from './errors.js';
import type { IOSource } from './io/types.js';
import type { Response001, ImageInfo, VersionInfo } from './schema/responses.js';

/**
 * Get metadata about an image (dimensions, format, MIME type) without decoding it.
 *
 * @param source - An IO source (FromBuffer, FromFile, FromStream, FromURL)
 * @returns Image info including width, height, preferred MIME type and extension
 * @throws {@link ImageflowError} if the image cannot be read
 */
export async function getImageInfo(source: IOSource): Promise<ImageInfo> {
  const job = new NativeJob();
  source.setIOID(0, 'in');
  const buf = await source.toBuffer();
  job.addInputBytes(0, buf);

  const responseStr = job.messageSync('v1/get_image_info', JSON.stringify({ io_id: 0 }));
  const response: Response001 = JSON.parse(responseStr);

  if (!response.success) {
    throw ImageflowError.fromResponse(response) ?? new Error('Failed to get image info');
  }

  if ('image_info' in response.data) {
    return response.data.image_info;
  }
  throw new Error('Unexpected response payload — expected image_info');
}

/**
 * Get the imageflow native library version string.
 *
 * @returns Object containing the long version string from the native library
 */
export function getVersionInfo(): { versionString: string } {
  return { versionString: getLongVersionString() };
}
