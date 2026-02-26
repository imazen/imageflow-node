// Wire-format color types matching imageflow JSON API

export type Color =
  | 'transparent'
  | 'black'
  | { srgb: ColorSrgb };

export type ColorSrgb =
  | { hex: string };
