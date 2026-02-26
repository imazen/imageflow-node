// Wire-format enums matching imageflow JSON API exactly (snake_case values)

export type Filter =
  | 'robidoux_fast'
  | 'robidoux'
  | 'robidoux_sharp'
  | 'ginseng'
  | 'ginseng_sharp'
  | 'lanczos'
  | 'lanczos_sharp'
  | 'lanczos_2'
  | 'lanczos_2_sharp'
  | 'cubic'
  | 'cubic_sharp'
  | 'catmull_rom'
  | 'mitchell'
  | 'cubic_b_spline'
  | 'hermite'
  | 'jinc'
  | 'triangle'
  | 'linear'
  | 'box'
  | 'fastest'
  | 'n_cubic'
  | 'n_cubic_sharp';

export type ResampleWhen =
  | 'size_differs'
  | 'size_differs_or_sharpening_requested'
  | 'always';

export type SharpenWhen =
  | 'downscaling'
  | 'upscaling'
  | 'size_differs'
  | 'always';

export type ScalingFloatspace = 'srgb' | 'linear';

export type ConstraintMode =
  | 'distort'
  | 'within'
  | 'fit'
  | 'larger_than'
  | 'within_crop'
  | 'fit_crop'
  | 'aspect_crop'
  | 'within_pad'
  | 'fit_pad';

export type CompositingMode = 'compose' | 'overwrite';

export type IoDirection = 'in' | 'out';

export type PixelFormat =
  | 'bgra_32'
  | 'bgr_32'
  | 'bgr_24'
  | 'gray_8';

export type PngBitDepth = 'png_32' | 'png_24';

export type ColorFilterSrgb =
  | 'grayscale_ntsc'
  | 'grayscale_flat'
  | 'grayscale_bt709'
  | 'grayscale_ry'
  | 'invert'
  | 'sepia'
  | { alpha: number }
  | { contrast: number }
  | { brightness: number }
  | { saturation: number };

export type FitMode =
  | 'distort'
  | 'within'
  | 'fit'
  | 'within_crop'
  | 'fit_crop';

export type QualityProfile =
  | 'fast'
  | 'balanced'
  | 'slow'
  | 'slowest';

export type CommandStringKind = 'ir4';
