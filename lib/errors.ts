export class ImageflowError extends Error {
  public readonly code: number;

  constructor(code: number, message: string) {
    super(message);
    this.name = 'ImageflowError';
    this.code = code;
  }

  static fromResponse(response: { code: number; success: boolean; message?: string }): ImageflowError | null {
    if (response.success) return null;
    return new ImageflowError(response.code, response.message ?? 'Unknown error');
  }
}
