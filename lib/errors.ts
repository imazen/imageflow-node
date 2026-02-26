/**
 * Error thrown when an imageflow operation fails.
 *
 * @example
 * ```ts @import.meta.vitest
 * const err = new ImageflowError(500, 'bad');
 * expect(err).toBeInstanceOf(Error);
 * expect(err.code).toBe(500);
 * expect(err.message).toBe('bad');
 * ```
 */
export class ImageflowError extends Error {
  public readonly code: number;

  constructor(code: number, message: string) {
    super(message);
    this.name = 'ImageflowError';
    this.code = code;
  }

  /**
   * Create from an API response, or return null on success.
   *
   * @param response - The response object with code, success flag, and optional message
   * @returns An ImageflowError if the response indicates failure, null otherwise
   *
   * @example
   * ```ts @import.meta.vitest
   * const err = ImageflowError.fromResponse({ success: false, code: 500, message: 'bad' });
   * expect(err).toBeInstanceOf(ImageflowError);
   * expect(err!.code).toBe(500);
   *
   * const ok = ImageflowError.fromResponse({ success: true, code: 200 });
   * expect(ok).toBeNull();
   * ```
   */
  static fromResponse(response: { code: number; success: boolean; message?: string }): ImageflowError | null {
    if (response.success) return null;
    return new ImageflowError(response.code, response.message ?? 'Unknown error');
  }
}
