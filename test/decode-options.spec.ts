import { DecodeOptions } from '../dist/index.js';

describe('DecodeOptions', () => {
  it('should build empty commands list', () => {
    const opts = new DecodeOptions();
    expect(opts.toDecoderCommands()).toEqual([]);
  });

  it('should add jpeg downscale hint', () => {
    const opts = new DecodeOptions().setJpegDownscaleHint(100, 100);
    const commands = opts.toDecoderCommands();
    expect(commands).toHaveLength(1);
    expect(commands[0]).toEqual({
      jpeg_downscale_hints: {
        width: 100,
        height: 100,
        scale_luma_spatially: undefined,
        gamma_correct_for_srgb_during_spatial_luma_scaling: undefined,
      },
    });
  });

  it('should add discard_color_profile', () => {
    const opts = new DecodeOptions().discardColorProfile();
    expect(opts.toDecoderCommands()).toEqual(['discard_color_profile']);
  });

  it('should add ignore_color_profile_errors', () => {
    const opts = new DecodeOptions().ignoreColorProfileError();
    expect(opts.toDecoderCommands()).toEqual(['ignore_color_profile_errors']);
  });

  it('should add webp decoder hints', () => {
    const opts = new DecodeOptions().setWebpDecoderHints(200, 200);
    const commands = opts.toDecoderCommands();
    expect(commands[0]).toEqual({ webp_decoder_hints: { width: 200, height: 200 } });
  });

  it('should add select_frame', () => {
    const opts = new DecodeOptions().selectFrame(3);
    const commands = opts.toDecoderCommands();
    expect(commands[0]).toEqual({ select_frame: { index: 3 } });
  });

  it('should chain multiple options', () => {
    const opts = new DecodeOptions()
      .discardColorProfile()
      .ignoreColorProfileError()
      .setJpegDownscaleHint(100, 100)
      .setWebpDecoderHints(200, 200)
      .selectFrame(0);
    expect(opts.toDecoderCommands()).toHaveLength(5);
  });

  it('should throw on duplicate jpeg downscale hint', () => {
    expect(() => {
      new DecodeOptions().setJpegDownscaleHint(100, 100).setJpegDownscaleHint(50, 50);
    }).toThrow('duplicate options are not allowed');
  });

  it('should throw on duplicate discard_color_profile', () => {
    expect(() => {
      new DecodeOptions().discardColorProfile().discardColorProfile();
    }).toThrow('duplicate options are not allowed');
  });

  it('should throw on duplicate ignore_color_profile_errors', () => {
    expect(() => {
      new DecodeOptions().ignoreColorProfileError().ignoreColorProfileError();
    }).toThrow('duplicate options are not allowed');
  });

  it('should throw on duplicate webp hints', () => {
    expect(() => {
      new DecodeOptions().setWebpDecoderHints(100, 100).setWebpDecoderHints(50, 50);
    }).toThrow('duplicate options are not allowed');
  });

  it('should throw on duplicate select_frame', () => {
    expect(() => {
      new DecodeOptions().selectFrame(0).selectFrame(1);
    }).toThrow('duplicate options are not allowed');
  });
});
