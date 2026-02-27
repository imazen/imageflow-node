import { NativeJob, getLongVersionString } from '../lib/index.js';

// 1x1 PNG pixel
const PNG_1x1 = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
  0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
  0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89, 0x00, 0x00, 0x00,
  0x0a, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
  0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49,
  0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
]);

describe('native layer', () => {
  it('should return a version string', () => {
    const version = getLongVersionString();
    expect(typeof version).toBe('string');
    expect(version.length).toBeGreaterThan(0);
  });

  it('should create a NativeJob', () => {
    const job = new NativeJob();
    expect(typeof job).toBe('object');
  });

  it('should add input bytes and query image info via messageSync', () => {
    const job = new NativeJob();
    job.addInputBytes(0, PNG_1x1);

    const response = job.messageSync(
      'v1/get_image_info',
      JSON.stringify({ io_id: 0 }),
    );
    const result = JSON.parse(response);
    expect(result.success).toBe(true);
    expect(result.code).toBe(200);
    expect(result.data.image_info.image_width).toBe(1);
    expect(result.data.image_info.image_height).toBe(1);
  });

  it('should process image via async message', async () => {
    const job = new NativeJob();
    job.addInputBytes(0, PNG_1x1);
    job.addOutputBuffer(1);

    const task = {
      framewise: {
        steps: [
          {
            command_string: {
              kind: 'ir4',
              value: 'width=100&height=100&scale=both&format=jpg',
              decode: 0,
              encode: 1,
            },
          },
        ],
      },
    };

    const response = await job.message('v1/execute', JSON.stringify(task));
    const result = JSON.parse(response);
    expect(result.success).toBe(true);
    expect(result.code).toBe(200);
    expect(result.data.job_result.encodes.length).toBe(1);
    expect(result.data.job_result.encodes[0].w).toBe(100);
    expect(result.data.job_result.encodes[0].h).toBe(100);

    const outputBuf = job.getOutputBufferBytes(1);
    expect(outputBuf.length).toBeGreaterThan(100);
    // Check JPEG magic bytes
    expect(outputBuf[0]).toBe(0xff);
    expect(outputBuf[1]).toBe(0xd8);
    expect(outputBuf[2]).toBe(0xff);
  });

  it('should throw when running concurrent messages', async () => {
    const job = new NativeJob();
    job.addInputBytes(0, PNG_1x1);
    job.addOutputBuffer(1);

    const task = {
      framewise: {
        steps: [
          {
            command_string: {
              kind: 'ir4',
              value: 'width=10&height=10&scale=both&format=png',
              decode: 0,
              encode: 1,
            },
          },
        ],
      },
    };

    // Start first message (don't await)
    const promise = job.message('v1/execute', JSON.stringify(task));
    // Try to call again while first is running
    expect(() => {
      job.messageSync('v1/get_image_info', JSON.stringify({ io_id: 0 }));
    }).toThrow('Already running a Job');
    await promise;
  });

  it('should call clean() without error', () => {
    const job = new NativeJob();
    expect(() => job.clean()).not.toThrow();
  });
});
