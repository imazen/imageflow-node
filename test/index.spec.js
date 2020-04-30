const addon = require('..');

describe('basic', () => {

  it('should get the version string', () => {
    expect(typeof addon.getLongVersionString()).toEqual('string');
  });

  it('should create a context', async () => {
    let job = new addon.Job()

    expect(typeof job).toEqual('object');
  });

  it('should allow input bytes to be added and image width to be queried', async () => {
    let job = new addon.Job()
    let array = new Uint8Array(
      [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, 0x00,
        0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4, 0x89, 0x00,
        0x00, 0x00, 0x0A, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00, 0x05, 0x00, 0x01,
        0x0D, 0x0A, 0x2D, 0xB4, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82]);

    let slice = array.buffer.slice(array.byteOffset, array.byteLength + array.byteOffset)

    job.addInputBytesCopied(0, slice);

    let response = await job.message("v0.1/get_image_info", JSON.stringify({ io_id: 0 }));
    console.log(response);
    let result = JSON.parse(response);
    expect(result.success).toEqual(true);
    expect(result.code).toEqual(200);
    expect(result.data.image_info.image_width).toEqual(1);
  });

   it('should allow image to be upscaled', async () => {
     let job = new addon.Job()
     let array = new Uint8Array(
       [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, 0x00,
         0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4, 0x89, 0x00,
         0x00, 0x00, 0x0A, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00, 0x05, 0x00, 0x01,
         0x0D, 0x0A, 0x2D, 0xB4, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82]);

     let slice = array.buffer.slice(array.byteOffset, array.byteLength + array.byteOffset)
     job.addInputBytesCopied(0, slice);
     job.addOutputBuffer(1);

     let job_task = {
            "framewise": {
              "steps": [{
                 "command_string":  {
                      "kind": "ir4",
                      "value": "width=100&height=100&scale=both&format=jpg",
                      "decode": 0,
                      "encode": 1
                 }
               }]
             }
         };



     let response = await job.message("v0.1/execute", JSON.stringify(job_task))
     let result = JSON.parse(response);
     console.log(result);
     expect(result.success).toEqual(true);
     expect(result.code).toEqual(200);
     expect(result.data.job_result.encodes.length).toEqual(1);
     expect(result.data.job_result.encodes[0].w).toEqual(100);
     expect(result.data.job_result.encodes[0].h).toEqual(100);

     let result_bytes = job.getOutputBufferBytes(1);
     expect(result_bytes.length).toBeGreaterThan(100);
     expect(result_bytes[0]).toEqual(0xFF);
     expect(result_bytes[1]).toEqual(0xD8);
     expect(result_bytes[2]).toEqual(0xFF);

   });



  //  it('should get dir size', () => {
  //    expect(typeof addon.dirSize(__dirname)).toEqual('string');
  //  });
  //
  //  it('should fail if dir not given', () => {
  //    expect(() => {
  //      addon.dirSize();
  //    }).toThrow();
  //  });
});
